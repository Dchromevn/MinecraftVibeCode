// Đào / đặt / ăn / vứt (Giai đoạn 3b–4c; 5a: server quyết định). Giữ chuột trái đào theo công thức
// MECHANICS mục 4 (đang bay thì phá ngay), vết nứt 5 mức; đào xong thì đoán trước trên máy (block mất
// ngay) và báo server. Chuột phải: mở bàn chế tạo / rương / lò, cửa, cuốc đất, xô, đặt block (đoán
// trước) hoặc giữ để ăn — đều gửi server kiểm tra. Q vứt đồ; phím 1–9 / lăn chuột chọn ô hotbar.
// 6a: bấm chuột trái vào người chơi khác thì đánh (không đào); vùng an toàn thì không đào / đặt (trừ quản trị viên).
// Khiên: giữ chuột phải (tay phải cầm khiên, hoặc tay trái cầm khiên khi đồ tay phải không dùng được); F đổi tay.
// 7a: chuột phải vào sinh vật (cho ăn, tỉa lông, vắt sữa), giường (ngủ), bột xương lên cây, ném trứng.
import * as THREE from "three";
import {
  B, DIGGING, HUNGER, PLAYER, SHIELD_KEY, addExhaustion, breakAt, canEat, canPlace, digRate, eat, isLiquidId, isReplaceable, itemDef,
  isUsableBlock, mergeChest, placeCells, planPlace, playerBox, raycast, selectionBoxes,
  type BlockAccess, type BlockId, type HeldTool, type InvAction, type Inventory, type NetHit, type RayHit, type World,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { PlayerController } from "../player/playerController.js";
import { BowUse, isBowLike } from "./bowUse.js";
import { CrackOverlay } from "./crackOverlay.js";
import { FallingBlocks } from "./fallingBlocks.js";
import { BlockOutline } from "./outline.js";

const REACH_FLY = 12; // khi bay (debug) với xa hơn cho tiện

/** Gửi hành động lên server. */
export interface InteractNet {
  /** Bắt đầu đào ô (server đo thời gian đào, 5c). */
  digStart(x: number, y: number, z: number): void;
  dig(x: number, y: number, z: number): void;
  use(hit: NetHit | null, src: { x: number; y: number; z: number } | null, sneaking: boolean, yaw: number): void;
  act(a: InvAction): void;
  /** (6b) bắt đầu kéo cung / thả cung với lực power. */
  draw(): void;
  shoot(power: number): void;
}

export interface InteractView {
  camera: THREE.Camera;
  player: PlayerController;
  inv: Inventory;
  locked: () => boolean;
  yaw: () => number;
  swing: () => void;
  sneaking: () => boolean;
  net: InteractNet;
  /** Chuột trái vừa bấm: đánh người chơi nếu nhắm trúng (true = đã đánh, không đào). */
  attack: () => boolean;
  /** Được sửa block ở cột (x, z) không (vùng an toàn; tự báo người chơi khi không được). */
  canEdit: (x: number, z: number) => boolean;
  /** (7a) Chuột phải vừa bấm: nhắm trúng sinh vật gần hơn block (khoảng cách blockDist) thì dùng lên nó (true = đã dùng). */
  useEntity: (blockDist: number) => boolean;
}

const netHit = (t: RayHit): NetHit => ({ x: t.x, y: t.y, z: t.z, nx: t.nx, ny: t.ny, nz: t.nz, fy: Math.round(t.fy * 1000) / 1000 });

export class Interaction {
  private target: RayHit | null = null;
  private left = false;
  private right = false;
  private freshRight = false; // chuột phải vừa bấm (chưa đặt khối nào trong lần giữ này)
  private dig: { key: string; progress: number } | null = null;
  private cooldown = 0;
  private placeCooldown = 0;
  /** Tiến độ ăn (giây), 0 = không ăn. */
  eating = 0;
  /** Đang giơ khiên (gửi kèm bước vật lý; server kiểm tra lại). */
  blocking = false;
  /** Kéo cung (6b). */
  readonly bow: BowUse;
  /** Khiên bị rìu khóa tới lúc này (performance.now, ms). */
  private shieldReadyAt = 0;
  private readonly outline: BlockOutline;
  private readonly dir = new THREE.Vector3();
  /** Ghi thẳng vào thế giới trên máy (đoán trước); server gửi lại giá trị thật sau. */
  private readonly acc: BlockAccess;
  private readonly crack: CrackOverlay;
  /** Cát / sỏi đang rơi (server báo, chỉ để vẽ). */
  readonly falling: FallingBlocks;

  constructor(
    scene: THREE.Scene, private readonly world: World, atlas: Atlas, private readonly view: InteractView,
    onChange: (x: number, y: number, z: number) => void,
  ) {
    this.outline = new BlockOutline(scene, (x, y, z) => world.getBlock(x, y, z));
    this.acc = {
      getCell: (x, y, z) => world.getCell(x, y, z),
      setCell: (x, y, z, id, meta) => {
        if (world.setBlock(x, y, z, id as BlockId, meta)) onChange(x, y, z);
      },
    };
    this.crack = new CrackOverlay(scene, atlas);
    this.bow = new BowUse({ draw: () => this.view.net.draw(), shoot: (p) => this.view.net.shoot(p) });
    this.falling = new FallingBlocks(scene, atlas, (x, y, z) => world.getCell(x, y, z));
    document.addEventListener("mousedown", (e) => {
      if (!this.view.locked()) return;
      if (e.button === 0 && !this.view.attack()) this.left = true;
      else if (e.button === 2) this.right = this.freshRight = true; // lần bấm mới: được mở rương / bàn / lò / cửa
    });
    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.left = false;
      else if (e.button === 2) this.right = false;
    });
    window.addEventListener("blur", () => (this.left = this.right = false));
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
      if (!this.view.locked()) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) this.view.net.act({ t: "select", n: n - 1 });
      if (e.code === "KeyF") this.view.net.act({ t: "swapHands" }); // đổi đồ tay phải ↔ tay trái
      if (e.code === "KeyQ" && this.view.inv.held) {
        this.view.net.act({ t: "throwHeld", all: e.shiftKey });
        this.view.swing();
      }
    });
    document.addEventListener("wheel", (e) => {
      if (!this.view.locked()) return;
      this.view.net.act({ t: "select", n: (this.view.inv.selected + (e.deltaY > 0 ? 1 : -1) + 9) % 9 });
    });
  }

  /** Server báo khiên bị rìu đánh: khóa s giây. */
  shieldOff(s: number): void {
    this.shieldReadyAt = performance.now() + s * 1000;
    this.blocking = false;
  }

  private raiseShield(): void {
    this.blocking = performance.now() >= this.shieldReadyAt;
  }

  /** Cho script kiểm tra (?debug=1) giữ chuột trái/phải. */
  setButtons(left: boolean, right: boolean): void {
    this.left = left;
    this.right = this.freshRight = right;
  }

  private heldTool(): HeldTool | null {
    const s = this.view.inv.held;
    const t = s ? itemDef(s.item)?.tool : undefined;
    return t ? { kind: t.kind, tier: t.tier, ench: s?.ench } : null;
  }

  update(dt: number): void {
    const p = this.view.camera.position;
    this.view.camera.getWorldDirection(this.dir);
    const flying = this.view.player.flying;
    const d = this.dir;
    const dead = this.view.player.state.dead;
    this.target = dead ? null : raycast((x, y, z) => this.world.getCell(x, y, z), p.x, p.y, p.z, d.x, d.y, d.z, flying ? REACH_FLY : PLAYER.REACH);
    this.outline.update(this.target);
    this.falling.update(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (dead || !this.view.locked()) this.left = this.right = false;
    this.updateDig(dt, flying);
    this.updateUse(dt, flying);
  }

  /** Chuột phải: dùng block, cuốc, xô, ăn (giữ), đặt block (giữ để đặt lặp lại). */
  private updateUse(dt: number, flying: boolean): void {
    const held = this.view.inv.held;
    const def = held ? itemDef(held.item) : undefined;
    const s = this.view.player.state;
    this.blocking = false;
    if (!isBowLike(held?.item) || flying || s.dead) this.bow.cancel(); // đổi đồ / bay / chết giữa chừng: thôi kéo (8b: cả nỏ)
    if (!this.right) {
      this.bow.release();
      this.placeCooldown = 0;
      this.eating = 0;
      return;
    }
    const t = this.target, sneaking = this.view.sneaking(), yaw = this.view.yaw();
    const once = (): void => {
      this.right = false;
      this.view.swing();
    };
    if (this.freshRight && this.view.useEntity(t ? t.dist : Infinity)) return once();
    if (t && !sneaking && isUsableBlock(t.cell & 255)) {
      // như Minecraft: chỉ mở khi bấm chuột phải lần mới — giữ chuột từ lúc đặt khối thì không mở, không đặt đè lên
      if (this.freshRight) this.view.net.use(netHit(t), null, sneaking, yaw);
      return this.freshRight ? once() : undefined;
    }
    if (held?.item === SHIELD_KEY) return this.raiseShield();
    if (isBowLike(held?.item)) return this.bow.hold(dt, this.view.inv, held!.item, this.freshRight);
    if (def?.tool?.kind === "hoe") {
      if (t) {
        const id = t.cell & 255;
        if ((id === B.DIRT || id === B.GRASS) && this.world.getBlock(t.x, t.y + 1, t.z) === B.AIR && this.view.canEdit(t.x, t.z))
          this.acc.setCell(t.x, t.y, t.z, B.FARMLAND, 0);
        this.view.net.use(netHit(t), null, sneaking, yaw);
      }
      return once();
    }
    if (held?.item === "bucket") {
      // múc: tia nhắm cả nguồn chất lỏng
      const p = this.view.camera.position, d = this.dir;
      const src = raycast((x, y, z) => this.world.getCell(x, y, z), p.x, p.y, p.z, d.x, d.y, d.z, flying ? REACH_FLY : PLAYER.REACH, true);
      if (src && isLiquidId(src.cell & 255)) this.view.net.use(null, { x: src.x, y: src.y, z: src.z }, sneaking, yaw);
      return once();
    }
    if (held?.item === "flint_and_steel" || held?.item === "fire_charge" || def?.use) { // bật lửa / (10c) cầu lửa nhỏ, bột xương (lên block nhắm), trứng / bóng tuyết (ném): server làm
      if (t || def?.use === "throw") this.view.net.use(t && def?.use !== "throw" ? netHit(t) : null, null, sneaking, yaw);
      return once();
    }
    if (def?.liquid !== undefined) {
      if (t) this.view.net.use(netHit(t), null, sneaking, yaw);
      return once();
    }
    // cà rốt / khoai tây: chuột phải lên mặt trên đất cày thì trồng, chỗ khác thì ăn
    const plants = def?.places !== undefined && t && (t.cell & 255) === B.FARMLAND && t.ny === 1;
    if (def?.food && !plants) {
      if (canEat(s, def.food)) {
        this.eating += dt;
        this.view.swing();
        if (this.eating >= PLAYER.EAT_TIME_S) {
          this.view.player.queueEat(def.food); // cộng đói / no ở bước vật lý kế tiếp; server trừ món ăn cùng bước
          this.eating = 0;
        }
        return;
      }
    } else if (def?.places !== undefined && t) {
      this.placeCooldown -= dt;
      if (this.placeCooldown <= 0) {
        this.place(flying);
        this.placeCooldown = DIGGING.PLACE_REPEAT_S;
      }
      return;
    }
    // đồ tay phải không dùng được: khiên tay trái
    if (this.view.inv.offhand[0]?.item === SHIELD_KEY) this.raiseShield();
  }

  private updateDig(dt: number, flying: boolean): void {
    const t = this.target;
    if (!this.left || !t) {
      this.dig = null;
      this.crack.hide();
      return;
    }
    if (!this.view.canEdit(t.x, t.z)) {
      this.dig = null;
      this.crack.hide();
      return;
    }
    this.view.swing();
    const key = `${t.x},${t.y},${t.z},${t.cell}`;
    if (this.dig?.key !== key) {
      this.dig = { key, progress: 0 };
      if (!flying) this.view.net.digStart(t.x, t.y, t.z); // server bắt đầu đo thời gian đào
    }
    const s = this.view.player.state;
    const tool = this.heldTool();
    const rate = flying ? Infinity : digRate(t.cell & 255, { tool, headInWater: s.headInWater, onGround: s.onGround, aqua: !!this.view.inv.armor[0]?.ench?.aqua_affinity });
    if (rate === 0) return;
    if (rate === Infinity) {
      // phá ngay; khi bay thì lặp lại sau 5 tick để không quét sạch một vùng
      if (flying && this.cooldown > 0) return;
      this.breakTarget(t);
      if (flying) this.cooldown = DIGGING.COOLDOWN_S;
      return;
    }
    if (this.cooldown > 0) return;
    this.dig.progress += rate * dt;
    if (this.dig.progress >= 1) {
      this.breakTarget(t);
      this.cooldown = DIGGING.COOLDOWN_S;
      this.crack.hide();
      return;
    }
    this.crack.show(t.x, t.y, t.z, selectionBoxes(t.cell, t.x, t.y, t.z, (x, y, z) => this.world.getBlock(x, y, z)), this.dig.progress);
  }

  /** Đào xong: block mất ngay trên máy (đoán trước), server phá thật, rơi đồ, trừ độ bền. */
  private breakTarget(t: RayHit): void {
    breakAt(this.acc, t.x, t.y, t.z, () => undefined);
    this.view.net.dig(t.x, t.y, t.z);
    if (!this.view.player.flying) addExhaustion(this.view.player.state, HUNGER.DIG);
    this.dig = null;
    this.target = null;
  }

  /** Đặt block đang cầm: đoán trước nếu hợp lệ, server kiểm tra lại và trừ trong túi. */
  private place(flying: boolean): void {
    const t = this.target;
    const held = this.view.inv.held;
    const places = held ? itemDef(held.item)?.places : undefined;
    if (!t || places === undefined || !this.view.canEdit(t.x, t.z)) return;
    // nhắm vào cỏ cao / tuyết phủ: đặt thay luôn ô đó; tấm cùng loại: ghép thành tấm đôi
    const cells = planPlace(places, t, this.view.yaw(), (a, b, c) => this.world.getCell(a, b, c), held ? itemDef(held.item)?.meta : undefined);
    if (!cells) return;
    const box = flying ? null : playerBox(this.view.player.state);
    if (!canPlace(cells, (a, b, c) => this.world.getCell(a, b, c), box)) return;
    placeCells(this.acc, cells, () => undefined);
    this.freshRight = false;
    if (places === B.CHEST && !this.view.sneaking())
      for (const m of mergeChest(cells[0]!, (a, b, c) => this.world.getCell(a, b, c))) this.acc.setCell(m.x, m.y, m.z, m.id, m.meta);
    this.view.net.use(netHit(t), null, this.view.sneaking(), this.view.yaw());
    this.view.swing();
  }
}
