// Khối hộp Three.js dùng ô texture trong atlas (vết nứt, block đang rơi).
import * as THREE from "three";
import { BLOCKS, slabBox, stairBoxes, stairsMeta, type BlockBox } from "../../../shared/src/index.js";
import type { Atlas, TileUV } from "../atlas.js";

/** Góc uv gốc của mỗi mặt BoxGeometry (4 đỉnh): (0,1) (1,1) (0,0) (1,0). */
const CORNER_U = [0, 1, 0, 1] as const;
const CORNER_V = [1, 1, 0, 0] as const;

/** Gán ô atlas cho 6 mặt của BoxGeometry (thứ tự +X, −X, +Y, −Y, +Z, −Z); gọi lại được nhiều lần. */
export function setBoxTiles(geo: THREE.BoxGeometry, tiles: readonly TileUV[]): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const t = tiles[f]!;
    for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, CORNER_U[k] ? t.u1 : t.u0, CORNER_V[k] ? t.v1 : t.v0);
  }
  uv.needsUpdate = true;
}

/** Hộp để vẽ vật phẩm block hình đặc biệt (bậc thấy mặt cắt chữ L, tấm nửa dưới, tường có tay nối). */
export function shapeBoxes(blockId: number): readonly BlockBox[] {
  const r = BLOCKS[blockId]!.render;
  if (r === "stairs") return stairBoxes(stairsMeta(1, false)); // phía cao ở −X
  if (r === "slab") return [slabBox(0)];
  if (r === "carpet") return [[0, 0, 0, 1, 1 / 16, 1]];
  if (r === "plate") return [[1 / 16, 0, 1 / 16, 15 / 16, 2 / 16, 15 / 16]];
  if (r === "button") return [[3 / 16, 0, 4 / 16, 13 / 16, 4 / 16, 12 / 16]]; // to hơn nút thật cho dễ nhìn
  return [[4 / 16, 0, 4 / 16, 12 / 16, 1, 12 / 16], [5 / 16, 0, 0, 11 / 16, 14 / 16, 1]]; // tường
}

/** Mô hình 3D của vật phẩm hình đặc biệt: các hộp trong khối cạnh size, tâm ở gốc. */
export function shapeObject(atlas: Atlas, blockId: number, size: number, mat: THREE.Material, tex?: string): THREE.Group {
  const g = new THREE.Group();
  const tiles = blockTiles(atlas, blockId, tex);
  for (const [x0, y0, z0, x1, y1, z1] of shapeBoxes(blockId)) {
    const geo = new THREE.BoxGeometry((x1 - x0) * size, (y1 - y0) * size, (z1 - z0) * size);
    setBoxTiles(geo, tiles);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(((x0 + x1) / 2 - 0.5) * size, ((y0 + y1) / 2 - 0.5) * size, ((z0 + z1) / 2 - 0.5) * size);
    g.add(m);
  }
  return g;
}

/** 6 ô texture của một block theo bảng block (trên/dưới/bên/trước). */
export function blockTiles(atlas: Atlas, id: number, tex?: string): TileUV[] {
  if (tex) return Array<TileUV>(6).fill(atlas.uv(tex)); // block có màu: một ảnh cho mọi mặt
  const t = BLOCKS[id]!.tex;
  const side = atlas.uv(t.side);
  return [side, side, atlas.uv(t.top), atlas.uv(t.bottom), atlas.uv(t.front ?? t.side), side];
}
