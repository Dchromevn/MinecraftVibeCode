// Đào / đặt block (Giai đoạn 3b): giữ chuột trái đào theo công thức MECHANICS mục 4 (tay
// không; đang bay thì phá ngay), vết nứt 5 mức; chuột phải đặt có kiểm tra chỗ bám, không
// chồng lên người; block mất chỗ bám rơi ra (dây chuyền), cát/sỏi rơi. Phím 1–9 / lăn chuột
// chọn block, số lượng vô hạn (tạm thời).
import * as THREE from "three";
import {
  B, DIGGING, PLAYER, breakAt, canPlace, digRate, isReplaceable, placeCells, placementCells, playerBox,
  raycast, selectionBoxes, type BlockAccess, type BlockId, type Dropped, type RayHit, type World,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { PlayerController } from "../player/playerController.js";
import { CrackOverlay } from "./crackOverlay.js";
import { FallingBlocks } from "./fallingBlocks.js";

const REACH_FLY = 12; // khi bay (debug) với xa hơn cho tiện
/** 1–9 chọn 9 block đầu; lăn chuột duyệt cả danh sách. */
export const PALETTE: readonly BlockId[] = [
  B.STONE, B.PLANKS, B.TORCH, B.SAND, B.FENCE, B.RAIL, B.LADDER, B.DOOR, B.GRAVEL,
  B.BED, B.FURNACE, B.FARMLAND, B.WHEAT, B.LOG, B.DIRT, B.COBBLE, B.GLASS, B.COBWEB,
  B.SANDSTONE, B.MOSSY_COBBLE, B.DEEPSLATE, B.SAPLING, B.WORKBENCH, B.CHEST, B.LEAVES, B.WATER, B.LAVA,
];

export interface InteractView {
  camera: THREE.Camera;
  player: PlayerController;
  locked: () => boolean;
  yaw: () => number;
  swing: () => void;
}

export class Interaction {
  selected = 0;
  /** Block rơi ra gần nhất (Giai đoạn 4 mới tạo vật phẩm thật). */
  lastDrops: Dropped[] = [];
  lastDropTime = 0;
  private target: RayHit | null = null;
  private left = false;
  private right = false;
  private dig: { key: string; progress: number } | null = null;
  private cooldown = 0;
  private placeCooldown = 0;
  private readonly outline = new THREE.Group();
  private readonly lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  private outlineKey = "";
  private readonly dir = new THREE.Vector3();
  private readonly acc: BlockAccess;
  private readonly crack: CrackOverlay;
  readonly falling: FallingBlocks;

  constructor(
    scene: THREE.Scene, private readonly world: World, atlas: Atlas, private readonly view: InteractView,
    onChange: (x: number, y: number, z: number) => void,
  ) {
    scene.add(this.outline);
    this.acc = {
      getCell: (x, y, z) => world.getCell(x, y, z),
      setCell: (x, y, z, id, meta) => {
        if (world.setBlock(x, y, z, id as BlockId, meta)) onChange(x, y, z);
      },
    };
    this.crack = new CrackOverlay(scene, atlas);
    this.falling = new FallingBlocks(scene, atlas, this.acc, (d) => this.noteDrops(d));
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
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) this.selected = n - 1;
    });
    document.addEventListener("wheel", (e) => {
      if (!this.view.locked()) return;
      const d = e.deltaY > 0 ? 1 : -1;
      this.selected = (this.selected + d + PALETTE.length) % PALETTE.length;
    });
  }

  get selectedBlock(): BlockId {
    return PALETTE[this.selected]!;
  }

  /** Cho script kiểm tra (?debug=1) giữ chuột trái/phải. */
  setButtons(left: boolean, right: boolean): void {
    this.left = left;
    this.right = right;
  }

  private idAt = (x: number, y: number, z: number): number => this.world.getBlock(x, y, z);

  private noteDrops(d: Dropped[]): void {
    if (d.length === 0) return;
    this.lastDrops = d;
    this.lastDropTime = performance.now();
  }

  update(dt: number): void {
    const p = this.view.camera.position;
    this.view.camera.getWorldDirection(this.dir);
    const flying = this.view.player.flying;
    const d = this.dir;
    this.target = raycast((x, y, z) => this.world.getCell(x, y, z), p.x, p.y, p.z, d.x, d.y, d.z, flying ? REACH_FLY : PLAYER.REACH);
    this.updateOutline();
    this.falling.update(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.updateDig(dt, flying);
    if (this.right) {
      this.placeCooldown -= dt;
      if (this.placeCooldown <= 0) {
        this.place(flying);
        this.placeCooldown = DIGGING.PLACE_REPEAT_S;
      }
    } else this.placeCooldown = 0;
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
    const rate = flying ? Infinity : digRate(t.cell & 255, { tool: null, headInWater: s.headInWater, onGround: s.onGround });
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
    this.crack.show(t.x, t.y, t.z, selectionBoxes(t.cell, t.x, t.y, t.z, this.idAt), this.dig.progress);
  }

  private breakTarget(t: RayHit): void {
    this.noteDrops(breakAt(this.acc, t.x, t.y, t.z, this.falling.start));
    this.dig = null;
    this.target = null;
  }

  private place(flying: boolean): void {
    const t = this.target;
    if (!t) return;
    // nhắm vào cỏ cao / tuyết phủ: đặt thay luôn ô đó
    const into = isReplaceable(t.cell & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const cells = placementCells(this.selectedBlock, x, y, z, t.nx, t.ny, t.nz, this.view.yaw());
    if (!cells) return;
    const box = flying ? null : playerBox(this.view.player.state);
    if (!canPlace(cells, (a, b, c) => this.world.getCell(a, b, c), box)) return;
    this.noteDrops(placeCells(this.acc, cells, this.falling.start));
    this.view.swing();
  }

  /** Khung viền theo các hộp nhắm thật của block (đuốc, ray, rào nối...). */
  private updateOutline(): void {
    const t = this.target;
    const boxes = t ? selectionBoxes(t.cell, t.x, t.y, t.z, this.idAt) : [];
    const key = t ? `${t.x},${t.y},${t.z},${t.cell},${boxes.length}` : "";
    if (key === this.outlineKey) return;
    this.outlineKey = key;
    for (const c of this.outline.children) (c as THREE.LineSegments).geometry.dispose();
    this.outline.clear();
    if (!t) return;
    const g = 0.002;
    for (const b of boxes) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(b[3] - b[0] + g * 2, b[4] - b[1] + g * 2, b[5] - b[2] + g * 2));
      const line = new THREE.LineSegments(geo, this.lineMat);
      line.position.set(t.x + (b[0] + b[3]) / 2, t.y + (b[1] + b[4]) / 2, t.z + (b[2] + b[5]) / 2);
      this.outline.add(line);
    }
  }
}
