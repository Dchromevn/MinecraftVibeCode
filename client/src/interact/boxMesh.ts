// Khối hộp Three.js dùng ô texture trong atlas (vết nứt, block đang rơi).
import * as THREE from "three";
import { BLOCKS } from "../../../shared/src/index.js";
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

/** 6 ô texture của một block theo bảng block (trên/dưới/bên/trước). */
export function blockTiles(atlas: Atlas, id: number): TileUV[] {
  const t = BLOCKS[id]!.tex;
  const side = atlas.uv(t.side);
  return [side, side, atlas.uv(t.top), atlas.uv(t.bottom), atlas.uv(t.front ?? t.side), side];
}
