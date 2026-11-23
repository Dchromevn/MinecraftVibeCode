// Vẽ công trình Giai đoạn 7e vào chunk (sau cây cỏ, nhà phù thủy) và tra rương công trình (server tạo đồ theo bảng).
import { B } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { hashInts, mulberry32 } from "../rng.js";
import { wood } from "../woods.js";
import { paintPiece, worldOf, type Piece } from "./structPaint.js";
import { paintTerrainPiece, paintVillageDecor } from "./villagePaint.js";
import { jigsawIn } from "./jigsawStructures.js";
import { structuresIn } from "./structPlan.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { planTree, trunkLength } from "./treeShapes.js";

/** Vẽ phần công trình (và cây của trại) nằm trong chunk (cx, cz). */
export function placeStructures(sampler: TerrainSampler, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const X0 = cx * 16, Z0 = cz * 16;
  const idx = (x: number, y: number, z: number): number =>
    x >= X0 && z >= Z0 && x < X0 + 16 && z < Z0 + 16 && y >= 1 && y < CHUNK_HEIGHT ? blockIndex(x - X0, y, z - Z0) : -1;
  for (const p of structuresIn(sampler, X0, Z0, X0 + 15, Z0 + 15)) {
    for (const piece of p.pieces) paintPiece(piece, data, meta, cx, cz);
    for (const t of p.trees) {
      const rng = mulberry32(hashInts(sampler.seed, t.x, t.y, t.z, 7702));
      const plan = planTree(t.kind, t.x, t.y, t.z, trunkLength(t.kind, rng()), rng), w = wood(t.kind);
      for (const [x, y, z] of plan.leaves) {
        const i = idx(x, y, z);
        if (i >= 0 && (data[i] === B.AIR || data[i] === B.SNOW_LAYER)) data[i] = w.leaves;
      }
      for (const [x, y, z] of plan.logs) {
        const i = idx(x, y, z);
        if (i >= 0) data[i] = w.log;
      }
    }
  }
  for (const v of jigsawIn(sampler, X0, Z0, X0 + 15, Z0 + 15)) { // (8a) làng, (8b) tiền đồn: đường bám đất, nhà, cây / đống trang trí
    for (const piece of v.pieces)
      if (piece.terrain) paintTerrainPiece(sampler, piece, data, meta, cx, cz);
      else paintPiece(piece, data, meta, cx, cz);
    paintVillageDecor(sampler, v, data, meta, cx, cz);
  }
}

/** Mọi mảnh công trình (kể cả làng) có thể chạm ô (x, z). */
export function piecesAt(sampler: TerrainSampler, x0: number, z0: number, x1: number, z1: number): Piece[] {
  return [...structuresIn(sampler, x0, z0, x1, z1), ...jigsawIn(sampler, x0, z0, x1, z1)].flatMap((p) => p.pieces);
}

/** Bảng đồ của rương công trình ở ô (x, y, z) ("igloo", "desert_pyramid", "ruined_portal", "camp_*"), hoặc null. */
export function structureLootAt(sampler: TerrainSampler, x: number, y: number, z: number): string | null {
  for (const piece of piecesAt(sampler, x, z, x, z))
      for (const [lx, ly, lz, key] of piece.t.loot) {
        const [wx, wy, wz] = worldOf(piece, lx, ly, lz);
        if (wx === x && wy === y && wz === z) return key;
      }
  return null;
}
