// Công cụ debug tạm (2a–3a): chuột trái phá tức thì block đang nhắm, chuột phải đặt block;
// phím 1–9 / lăn chuột chọn loại block. Ghi dữ liệu phụ khi đặt (hướng theo mặt bấm / hướng
// nhìn, ray tự nối, cửa/giường 2 ô). Giai đoạn 3b thay bằng đào/đặt thật có chỗ bám.
import * as THREE from "three";
import {
  B, BLOCKS, PLAYER, cellId, linkedCell, placementCells, raycast, selectionBoxes, updateRailsAround,
  type BlockId, type RayHit, type World,
} from "../../../shared/src/index.js";

const REACH_FLY = 12; // khi bay: với xa hơn để kiểm tra cho tiện
/** 1–9 chọn 9 block đầu; lăn chuột duyệt cả danh sách. */
export const PALETTE: readonly BlockId[] = [
  B.STONE, B.PLANKS, B.TORCH, B.GLASS, B.FENCE, B.RAIL, B.LADDER, B.COBWEB, B.DOOR,
  B.BED, B.FURNACE, B.FARMLAND, B.WHEAT, B.LOG, B.DIRT, B.COBBLE, B.SAND, B.GRAVEL,
  B.SANDSTONE, B.MOSSY_COBBLE, B.DEEPSLATE, B.SAPLING, B.WORKBENCH, B.CHEST, B.LEAVES, B.WATER, B.LAVA,
];

/** Có thể đặt đè lên các block này. */
function replaceable(id: number): boolean {
  const d = BLOCKS[id]!;
  return d.render === "none" || d.liquid || id === B.TALLGRASS || id === B.SNOW_LAYER;
}

export interface EditorView {
  camera: THREE.Camera;
  yaw: () => number;
  locked: () => boolean;
  flying: () => boolean;
}

export class BlockEditor {
  selected = 0;
  private readonly outline = new THREE.Group();
  private readonly lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  private outlineKey = "";
  private target: RayHit | null = null;
  private readonly dir = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    private readonly world: World,
    private readonly view: EditorView,
    private readonly onChange: (x: number, y: number, z: number) => void,
  ) {
    scene.add(this.outline);
    document.addEventListener("mousedown", (e) => {
      if (!this.view.locked() || !this.target) return;
      if (e.button === 0) this.breakBlock();
      else if (e.button === 2) this.placeBlock();
    });
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

  private cellAt = (x: number, y: number, z: number): number => this.world.getCell(x, y, z);
  private idAt = (x: number, y: number, z: number): number => this.world.getBlock(x, y, z);

  update(): void {
    const p = this.view.camera.position;
    this.view.camera.getWorldDirection(this.dir);
    const reach = this.view.flying() ? REACH_FLY : PLAYER.REACH;
    const d = this.dir;
    this.target = raycast(this.cellAt, p.x, p.y, p.z, d.x, d.y, d.z, reach);
    this.updateOutline();
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
    const g = 0.002; // nới ra một chút để không bị mặt block che
    for (const b of boxes) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(b[3] - b[0] + g * 2, b[4] - b[1] + g * 2, b[5] - b[2] + g * 2));
      const line = new THREE.LineSegments(geo, this.lineMat);
      line.position.set(t.x + (b[0] + b[3]) / 2, t.y + (b[1] + b[4]) / 2, t.z + (b[2] + b[5]) / 2);
      this.outline.add(line);
    }
  }

  private setAndNotify(x: number, y: number, z: number, id: number, meta = 0): boolean {
    if (!this.world.setBlock(x, y, z, id as BlockId, meta)) return false;
    this.onChange(x, y, z);
    return true;
  }

  private fixRails(x: number, y: number, z: number): void {
    updateRailsAround(x, y, z, this.idAt, (px, py, pz, meta) => this.setAndNotify(px, py, pz, B.RAIL, meta));
  }

  private breakBlock(): void {
    const t = this.target!;
    const id = cellId(t.cell);
    if (id === B.BEDROCK) return;
    const other = linkedCell(t.cell, t.x, t.y, t.z); // cửa / giường: mất cả nửa kia
    this.setAndNotify(t.x, t.y, t.z, B.AIR);
    if (other && this.idAt(other.x, other.y, other.z) === id) this.setAndNotify(other.x, other.y, other.z, B.AIR);
    if (id === B.RAIL) this.fixRails(t.x, t.y, t.z);
  }

  private placeBlock(): void {
    const t = this.target!;
    const id = this.selectedBlock;
    const cells = placementCells(id, t.x + t.nx, t.y + t.ny, t.z + t.nz, t.nx, t.ny, t.nz, this.view.yaw());
    if (!cells || !cells.every((c) => replaceable(this.idAt(c.x, c.y, c.z)) && c.y < 128)) return;
    for (const c of cells) this.setAndNotify(c.x, c.y, c.z, c.id, c.meta);
    if (id === B.RAIL) this.fixRails(cells[0]!.x, cells[0]!.y, cells[0]!.z);
  }
}
