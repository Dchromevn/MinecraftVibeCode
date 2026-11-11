// Công cụ debug tạm (Giai đoạn 2a): với camera bay, chuột trái phá block đang nhắm,
// chuột phải đặt block; phím 1–9 chọn loại block. Giai đoạn 3 thay bằng tương tác thật.
import * as THREE from "three";
import { B, BLOCKS, raycast, type BlockId, type World } from "../../../shared/src/index.js";

const REACH = 12; // tầm với debug (rộng hơn tầm với thật để kiểm tra cho tiện)
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

export class BlockEditor {
  selected = 0;
  private readonly box: THREE.LineSegments;
  private target: { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null = null;

  constructor(
    scene: THREE.Scene,
    private readonly world: World,
    private readonly camera: THREE.Camera,
    private readonly isLocked: () => boolean,
    private readonly onChange: (x: number, y: number, z: number) => void,
  ) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.box = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this.box.visible = false;
    scene.add(this.box);

    document.addEventListener("mousedown", (e) => {
      if (!this.isLocked() || !this.target) return;
      if (e.button === 0) this.breakBlock();
      else if (e.button === 2) this.placeBlock();
    });
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) this.selected = n - 1;
    });
    document.addEventListener("wheel", (e) => {
      if (!this.isLocked()) return;
      const d = e.deltaY > 0 ? 1 : -1;
      this.selected = (this.selected + d + PALETTE.length) % PALETTE.length;
    });
  }

  get selectedBlock(): BlockId {
    return PALETTE[this.selected]!;
  }

  update(): void {
    const p = this.camera.position;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const hit = raycast((x, y, z) => this.world.getBlock(x, y, z), p.x, p.y, p.z, dir.x, dir.y, dir.z, REACH);
    this.target = hit;
    this.box.visible = !!hit;
    if (hit) this.box.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  }

  private breakBlock(): void {
    const t = this.target!;
    if (this.world.getBlock(t.x, t.y, t.z) === B.BEDROCK) return;
    if (this.world.setBlock(t.x, t.y, t.z, B.AIR)) this.onChange(t.x, t.y, t.z);
  }

  private placeBlock(): void {
    const t = this.target!;
    const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;
    if (!replaceable(this.world.getBlock(x, y, z))) return;
    if (this.world.setBlock(x, y, z, this.selectedBlock)) this.onChange(x, y, z);
  }
}
