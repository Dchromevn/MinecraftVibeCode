// Đào / đặt / ăn / vứt (Giai đoạn 3b–4a): giữ chuột trái đào theo công thức MECHANICS mục 4
// với công cụ đang cầm (đang bay thì phá ngay), vết nứt 5 mức, rơi ra vật phẩm thật, công cụ
// mất độ bền; chuột phải đặt block từ ô đang cầm (kiểm tra chỗ bám, không chồng lên người) hoặc
// giữ để ăn; Q vứt đồ. Phím 1–9 / lăn chuột chọn ô hotbar.
import * as THREE from "three";
import {
  DIGGING, HUNGER, PLAYER, addExhaustion, blockDrops, breakAt, canEat, canPlace, digRate, eat, isReplaceable,
  itemDef, placeCells, placementCells, playerBox, raycast, selectionBoxes, toolWear,
  type BlockAccess, type BlockId, type Dropped, type HeldTool, type Inventory, type RayHit, type Rng, type World,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { ItemEntities } from "../items/itemEntities.js";
import type { PlayerController } from "../player/playerController.js";
import { CrackOverlay } from "./crackOverlay.js";
import { FallingBlocks } from "./fallingBlocks.js";
import { BlockOutline } from "./outline.js";

const REACH_FLY = 12; // khi bay (debug) với xa hơn cho tiện

export interface InteractView {
  camera: THREE.Camera;
  player: PlayerController;
  inv: Inventory;
  items: ItemEntities;
  rng: Rng;
  locked: () => boolean;
  yaw: () => number;
  swing: () => void;
}

export class Interaction {
  private target: RayHit | null = null;
  private left = false;
  private right = false;
  private dig: { key: string; progress: number } | null = null;
  private cooldown = 0;
  private placeCooldown = 0;
  /** Tiến độ ăn (giây), 0 = không ăn. */
  eating = 0;
  private readonly outline: BlockOutline;
  private readonly dir = new THREE.Vector3();
  private readonly acc: BlockAccess;
  private readonly crack: CrackOverlay;
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
    this.falling = new FallingBlocks(scene, atlas, this.acc, (d) => this.spawnDrops(d, null));
    document.addEventListener("mousedown", (e) => {
      if (!this.view.locked()) return;
      if (e.button === 0) this.left = true;
      else if (e.button === 2) this.right = true;
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
      if (Number.isInteger(n) && n >= 1 && n <= 9) this.view.inv.selected = n - 1;
      if (e.code === "KeyQ") this.throwHeld(e.ctrlKey);
    });
    document.addEventListener("wheel", (e) => {
      if (!this.view.locked()) return;
      const inv = this.view.inv;
      inv.selected = (inv.selected + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    });
  }

  /** Cho script kiểm tra (?debug=1) giữ chuột trái/phải. */
  setButtons(left: boolean, right: boolean): void {
    this.left = left;
    this.right = right;
  }

  private heldTool(): HeldTool | null {
    const s = this.view.inv.held;
    const t = s ? itemDef(s.item)?.tool : undefined;
    return t ? { kind: t.kind, tier: t.tier } : null;
  }

  private spawnDrops(list: Dropped[], tool: HeldTool | null): void {
    for (const d of list)
      for (const s of blockDrops(d.id, d.meta, d.forced ? null : tool, this.view.rng, d.forced)) this.view.items.pop(s, d.x, d.y, d.z);
  }

  private throwHeld(all: boolean): void {
    const inv = this.view.inv;
    const s = inv.takeHeld(all ? (inv.held?.count ?? 1) : 1);
    if (!s) return;
    this.view.camera.getWorldDirection(this.dir);
    this.view.items.throw(s, this.view.camera.position, this.dir);
    this.view.swing();
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

  /** Chuột phải: cầm thức ăn thì giữ để ăn, cầm block thì đặt (giữ để đặt lặp lại). */
  private updateUse(dt: number, flying: boolean): void {
    const held = this.view.inv.held;
    const food = held ? itemDef(held.item)?.food : undefined;
    const s = this.view.player.state;
    if (!this.right) {
      this.placeCooldown = 0;
      this.eating = 0;
      return;
    }
    if (food) {
      if (!canEat(s, food)) return;
      this.eating += dt;
      this.view.swing();
      if (this.eating >= PLAYER.EAT_TIME_S) {
        eat(s, food);
        this.view.inv.takeHeld(1);
        this.eating = 0;
      }
      return;
    }
    this.placeCooldown -= dt;
    if (this.placeCooldown <= 0) {
      this.place(flying);
      this.placeCooldown = DIGGING.PLACE_REPEAT_S;
    }
  }

  private updateDig(dt: number, flying: boolean): void {
    const t = this.target;
    if (!this.left || !t) {
      this.dig = null;
      this.crack.hide();
      return;
    }
    this.view.swing();
    const key = `${t.x},${t.y},${t.z},${t.cell}`;
    if (this.dig?.key !== key) this.dig = { key, progress: 0 };
    const s = this.view.player.state;
    const tool = this.heldTool();
    const rate = flying ? Infinity : digRate(t.cell & 255, { tool, headInWater: s.headInWater, onGround: s.onGround });
    if (rate === 0) return;
    if (rate === Infinity) {
      // phá ngay; khi bay thì lặp lại sau 5 tick để không quét sạch một vùng
      if (flying && this.cooldown > 0) return;
      this.breakTarget(t, tool);
      if (flying) this.cooldown = DIGGING.COOLDOWN_S;
      return;
    }
    if (this.cooldown > 0) return;
    this.dig.progress += rate * dt;
    if (this.dig.progress >= 1) {
      this.breakTarget(t, tool);
      this.cooldown = DIGGING.COOLDOWN_S;
      this.crack.hide();
      return;
    }
    this.crack.show(t.x, t.y, t.z, selectionBoxes(t.cell, t.x, t.y, t.z, (x, y, z) => this.world.getBlock(x, y, z)), this.dig.progress);
  }

  private breakTarget(t: RayHit, tool: HeldTool | null): void {
    const id = t.cell & 255;
    this.spawnDrops(breakAt(this.acc, t.x, t.y, t.z, this.falling.start), tool);
    const inv = this.view.inv;
    const wear = toolWear(id, tool);
    if (wear > 0) inv.damageSlot("main", inv.selected, wear);
    if (!this.view.player.flying) addExhaustion(this.view.player.state, HUNGER.DIG);
    this.dig = null;
    this.target = null;
  }

  private place(flying: boolean): void {
    const t = this.target;
    const held = this.view.inv.held;
    const places = held ? itemDef(held.item)?.places : undefined;
    if (!t || places === undefined) return;
    // nhắm vào cỏ cao / tuyết phủ: đặt thay luôn ô đó
    const into = isReplaceable(t.cell & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const cells = placementCells(places, x, y, z, t.nx, t.ny, t.nz, this.view.yaw());
    if (!cells) return;
    const box = flying ? null : playerBox(this.view.player.state);
    if (!canPlace(cells, (a, b, c) => this.world.getCell(a, b, c), box)) return;
    this.spawnDrops(placeCells(this.acc, cells, this.falling.start), null);
    this.view.inv.takeHeld(1);
    this.view.swing();
  }
}
