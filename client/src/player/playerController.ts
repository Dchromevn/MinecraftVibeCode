// Người chơi ở client (Giai đoạn 3a, 5c): đọc phím, chạy hàm vật lý /shared với bước cố định 60 Hz (đoán trước,
// server tính thật và sửa lại — prediction.ts), nội suy vị trí cho camera, lắc camera khi đi, camera trượt nhẹ
// khi bị server sửa vị trí. Nhấn đúp Space bật/tắt bay (quản trị viên). Như Minecraft: Shift = ngồi, nhấn đúp W = chạy
// nhanh (không dùng Ctrl: Ctrl+W đóng tab trình duyệt).
import * as THREE from "three";
import {
  NET, PHYSICS_DT, PLAYER, addExhaustion, boxBlocked, createPlayer, eyeHeight, playerBox,
  type CellReader, type FoodDef, type PlayerInput, type PlayerState, type World,
} from "../../../shared/src/index.js";
import type { FlyCamera } from "../flyCamera.js";
import { settings } from "../settings.js";
import { Prediction } from "./prediction.js";

const MAX_STEPS_PER_FRAME = 8; // khung hình bị treo lâu thì bỏ bớt, không tua nhanh
const BOB_RATE = 1.6; // pha lắc (rad) cho mỗi block đi được

export class PlayerController {
  flying: boolean;
  /** Được bật bay không (quản trị viên, Giai đoạn 5b). */
  canFly = true;
  state: PlayerState;
  /** Debug (?debug=1): script kiểm tra được nhấn phím mà không cần khóa chuột. */
  debugInput = false;
  private prev = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private walkDist = 0;
  private bobAmount = 0; // 0..1, mờ dần khi đứng yên / trên không
  /** Vị trí chân đã nội suy (không lắc) — góc nhìn thứ 3 vẽ mô hình chính mình ở đây. */
  readonly feet = new THREE.Vector3();
  private eye: number = PLAYER.EYE_HEIGHT; // hạ dần khi ngồi
  private needsSpawnFix = true; // khi chunk tải xong: đẩy lên nếu đang kẹt trong block
  private lastW = -1; // lúc nhấn W gần nhất (giây), để nhận nhấn đúp
  private lastSpace = -1; // lúc nhấn Space gần nhất (giây): nhấn đúp bật / tắt bay
  /** Đang giơ khiên (Interaction quyết định; gửi kèm từng bước vật lý). */
  blockInput: () => boolean = () => false;
  /** Đang kéo cung (6b): đi chậm, gửi kèm từng bước vật lý. */
  drawInput: () => boolean = () => false;
  private sprintLatch = false; // đang chạy nhanh do nhấn đúp W
  private readonly cell: CellReader;
  readonly prediction: Prediction;
  /** Số lần bị server sửa vị trí (F3). */
  corrections = 0;
  /** Camera trượt dần về vị trí server sửa (không giật). */
  private smooth = { x: 0, y: 0, z: 0 };

  constructor(
    world: World,
    private readonly fly: FlyCamera,
    private readonly camera: THREE.PerspectiveCamera,
    startFlying: boolean,
  ) {
    this.flying = startFlying;
    this.cell = (x, y, z) => world.getCell(x, y, z);
    this.prediction = new Prediction(this.cell);
    const p = camera.position;
    this.state = createPlayer(p.x, p.y - PLAYER.EYE_HEIGHT, p.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z };
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.repeat && (this.fly.locked || this.debugInput) && this.canFly) {
        const now = performance.now() / 1000;
        if (now - this.lastSpace <= PLAYER.FLY_DOUBLE_TAP_S) {
          this.toggleFly();
          this.lastSpace = -1;
        } else this.lastSpace = now;
      }
      // nhấn đúp W: chạy nhanh tới khi nhả W (e.repeat = phím đang giữ tự lặp, bỏ qua)
      if (e.code === "KeyW" && !e.repeat) {
        const now = performance.now() / 1000;
        if (now - this.lastW <= PLAYER.SPRINT_DOUBLE_TAP_S) this.sprintLatch = true;
        this.lastW = now;
      }
    });
    document.addEventListener("keyup", (e) => {
      if (e.code === "KeyW") this.sprintLatch = false;
    });
    window.addEventListener("blur", () => (this.sprintLatch = false));
  }

  /** Dời chân người chơi tới (x, y, z), giữ nguyên máu, đói, dưỡng khí. */
  placeAt(x: number, y: number, z: number): void {
    const s = this.state;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = s.vy = s.vz = 0;
    s.fallDist = 0;
    this.prev = { x, y, z };
    this.acc = 0;
  }

  /** Hồi sinh (bấm nút): áp dụng ở bước vật lý kế tiếp, server làm đúng bước đó. */
  requestRespawn(at: { x: number; y: number; z: number }): void {
    this.prediction.pendingRespawn = at;
    this.flying = false;
  }

  /** Ăn xong món đang cầm: cộng đói / no ở bước vật lý kế tiếp (server trừ món ăn và cộng cùng bước). */
  queueEat(food: FoodDef): void {
    this.prediction.pendingEat = food;
  }

  /** Trạng thái thật từ server sau bước seq: lệch thì nhận và chạy lại các bước chưa xác nhận. */
  onServerState(seq: number, server: PlayerState): void {
    if (this.flying) return void this.prediction.clear();
    const next = this.prediction.reconcile(seq, server);
    if (!next) return;
    const old = this.state;
    const dx = old.x - next.x, dy = old.y - next.y, dz = old.z - next.z;
    this.state = next;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-6) return;
    this.corrections++;
    this.prev = { x: this.prev.x - dx, y: this.prev.y - dy, z: this.prev.z - dz };
    // lệch nhỏ: camera trượt dần; lệch lớn (dịch chuyển, hồi sinh): nhảy luôn
    if (Math.hypot(dx, dy, dz) < 3) this.smooth = { x: this.smooth.x + dx, y: this.smooth.y + dy, z: this.smooth.z + dz };
  }

  /** Dịch chuyển (lệnh /tp của server): đặt lại vị trí, bỏ các bước đang chờ, camera nhảy luôn. */
  teleport(x: number, y: number, z: number): void {
    this.placeAt(x, y, z);
    this.prediction.clear();
    this.smooth = { x: 0, y: 0, z: 0 };
    if (this.flying) this.camera.position.set(x, y + PLAYER.EYE_HEIGHT, z);
  }

  /** Đánh lúc chạy nhanh (đẩy lùi mạnh): mất trạng thái chạy nhanh do nhấn đúp W. */
  stopSprint(): void {
    this.sprintLatch = false;
  }

  /** Hao sức do hành động (đánh trúng): cộng vào trạng thái và bước vừa chạy — server cộng sau đúng bước đó. */
  exhaust(v: number): void {
    addExhaustion(this.state, v);
    this.prediction.patchLast((s) => addExhaustion(s, v));
  }

  toggleFly(): void {
    if (!this.canFly && !this.flying) return;
    this.flying = !this.flying;
    if (!this.flying) {
      const p = this.camera.position;
      this.placeAt(p.x, p.y - PLAYER.EYE_HEIGHT, p.z);
      this.needsSpawnFix = true;
    }
  }

  get sprinting(): boolean {
    const s = this.state;
    return !this.flying && this.input().sprint && Math.hypot(s.vx, s.vz) > PLAYER.WALK_SPEED * 0.9;
  }

  private input(): PlayerInput {
    const k = this.fly.keys;
    const on = this.fly.locked || this.debugInput;
    const key = (c: string): boolean => on && k.has(c);
    return {
      forward: (key("KeyW") ? 1 : 0) - (key("KeyS") ? 1 : 0),
      strafe: (key("KeyD") ? 1 : 0) - (key("KeyA") ? 1 : 0),
      jump: key("Space"),
      // không dùng Ctrl: Ctrl+W / Ctrl+D là phím tắt trình duyệt (đóng tab, bookmark)
      sneak: key("ShiftLeft") || key("ShiftRight"),
      sprint: on && this.sprintLatch,
      yaw: this.fly.yaw,
      block: this.blockInput(),
      draw: this.drawInput(),
    };
  }

  update(dt: number): void {
    if (this.flying) {
      this.fly.fast = this.sprintLatch; // nhấn đúp W: bay nhanh
      this.fly.update(dt);
      return;
    }
    this.fly.applyRotation();
    const s = this.state;
    if (!this.canFly) this.needsSpawnFix = false; // chỉ dùng khi quản trị viên thôi bay
    if (this.needsSpawnFix && this.cell(Math.floor(s.x), Math.max(0, Math.floor(s.y)), Math.floor(s.z)) >= 0) {
      while (s.y < 127 && boxBlocked(this.cell, playerBox(s))) s.y = Math.floor(s.y) + 1;
      this.prev = { x: s.x, y: s.y, z: s.z };
      this.needsSpawnFix = false;
    }

    const inp = this.input();
    this.acc = Math.min(this.acc + dt, PHYSICS_DT * MAX_STEPS_PER_FRAME);
    while (this.acc >= PHYSICS_DT) {
      const st = this.state;
      const respawning = !!this.prediction.pendingRespawn && st.dead;
      this.prev = { x: st.x, y: st.y, z: st.z };
      this.prediction.step(st, inp);
      if (respawning) this.prev = { x: st.x, y: st.y, z: st.z };
      if (st.onGround) this.walkDist += Math.hypot(st.x - this.prev.x, st.z - this.prev.z);
      this.acc -= PHYSICS_DT;
    }
    const k = Math.exp(-NET.CORRECTION_SMOOTH * dt);
    this.smooth = { x: this.smooth.x * k, y: this.smooth.y * k, z: this.smooth.z * k };
    const cur = this.state;
    this.eye += (eyeHeight(cur) - this.eye) * Math.min(1, dt * 12);
    const moving = cur.onGround && Math.hypot(cur.vx, cur.vz) > 0.5;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 8);

    // nội suy giữa hai bước vật lý cho chuyển động mượt ở mọi FPS
    const a = this.acc / PHYSICS_DT;
    const x = this.prev.x + (cur.x - this.prev.x) * a + this.smooth.x;
    const y = this.prev.y + (cur.y - this.prev.y) * a + this.smooth.y;
    const z = this.prev.z + (cur.z - this.prev.z) * a + this.smooth.z;
    const phase = this.walkDist * BOB_RATE;
    const bob = settings.shake ? PLAYER.VIEW_BOB * this.bobAmount : 0; // Cài đặt: tắt rung / lắc màn hình
    const side = Math.sin(phase) * bob * 0.5; // lắc ngang theo hướng phải của camera
    const up = Math.abs(Math.cos(phase)) * bob;
    const yaw = this.fly.yaw;
    this.feet.set(x, y, z);
    this.camera.position.set(x + Math.cos(yaw) * side, y + this.eye + up - bob * 0.5, z - Math.sin(yaw) * side);
  }
}
