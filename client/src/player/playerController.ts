// Người chơi ở client (Giai đoạn 3a): đọc phím, chạy hàm vật lý /shared với bước cố định
// 60 Hz, nội suy vị trí cho camera, lắc camera khi đi. Phím F bật/tắt bay (debug).
import * as THREE from "three";
import {
  PHYSICS_DT, PLAYER, boxBlocked, createPlayer, playerBox, stepPlayer,
  type CellReader, type PlayerInput, type PlayerState, type World,
} from "../../../shared/src/index.js";
import type { FlyCamera } from "../flyCamera.js";

const MAX_STEPS_PER_FRAME = 8; // khung hình bị treo lâu thì bỏ bớt, không tua nhanh
const BOB_RATE = 1.6; // pha lắc (rad) cho mỗi block đi được

export class PlayerController {
  flying: boolean;
  state: PlayerState;
  /** Debug (?debug=1): script kiểm tra được nhấn phím mà không cần khóa chuột. */
  debugInput = false;
  private prev = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private walkDist = 0;
  private bobAmount = 0; // 0..1, mờ dần khi đứng yên / trên không
  private needsSpawnFix = true; // khi chunk tải xong: đẩy lên nếu đang kẹt trong block
  private readonly cell: CellReader;

  constructor(
    world: World,
    private readonly fly: FlyCamera,
    private readonly camera: THREE.PerspectiveCamera,
    startFlying: boolean,
  ) {
    this.flying = startFlying;
    this.cell = (x, y, z) => world.getCell(x, y, z);
    const p = camera.position;
    this.state = createPlayer(p.x, p.y - PLAYER.EYE_HEIGHT, p.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z };
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyF" && this.fly.locked) this.toggleFly();
    });
  }

  /** Đặt chân người chơi tại (x, y, z) (đi bộ). */
  placeAt(x: number, y: number, z: number): void {
    const health = this.state.health;
    this.state = createPlayer(x, y, z);
    this.state.health = health;
    this.prev = { x, y, z };
    this.acc = 0;
  }

  toggleFly(): void {
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
      sneak: key("ShiftLeft") || key("ShiftRight"),
      sprint: key("ControlLeft") || key("ControlRight"),
      yaw: this.fly.yaw,
    };
  }

  update(dt: number): void {
    if (this.flying) {
      this.fly.update(dt);
      return;
    }
    this.fly.applyRotation();
    const s = this.state;
    if (this.needsSpawnFix && this.cell(Math.floor(s.x), Math.max(0, Math.floor(s.y)), Math.floor(s.z)) >= 0) {
      while (s.y < 127 && boxBlocked(this.cell, playerBox(s))) s.y = Math.floor(s.y) + 1;
      this.prev = { x: s.x, y: s.y, z: s.z };
      this.needsSpawnFix = false;
    }

    const inp = this.input();
    this.acc = Math.min(this.acc + dt, PHYSICS_DT * MAX_STEPS_PER_FRAME);
    while (this.acc >= PHYSICS_DT) {
      this.prev = { x: s.x, y: s.y, z: s.z };
      stepPlayer(s, inp, this.cell);
      if (s.onGround) this.walkDist += Math.hypot(s.x - this.prev.x, s.z - this.prev.z);
      this.acc -= PHYSICS_DT;
    }
    const moving = s.onGround && Math.hypot(s.vx, s.vz) > 0.5;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 8);

    // nội suy giữa hai bước vật lý cho chuyển động mượt ở mọi FPS
    const a = this.acc / PHYSICS_DT;
    const x = this.prev.x + (s.x - this.prev.x) * a;
    const y = this.prev.y + (s.y - this.prev.y) * a;
    const z = this.prev.z + (s.z - this.prev.z) * a;
    const phase = this.walkDist * BOB_RATE;
    const bob = PLAYER.VIEW_BOB * this.bobAmount;
    const side = Math.sin(phase) * bob * 0.5; // lắc ngang theo hướng phải của camera
    const up = Math.abs(Math.cos(phase)) * bob;
    const yaw = this.fly.yaw;
    this.camera.position.set(x + Math.cos(yaw) * side, y + PLAYER.EYE_HEIGHT + up - bob * 0.5, z - Math.sin(yaw) * side);
  }
}
