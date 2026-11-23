// Dinh thự rừng (Giai đoạn 8c): dựng từ 73 mẫu woodland_mansion/* trong client.jar theo lưới phòng (mansionPieces.ts), xoay cả cụm
// ngẫu nhiên. Như Minecraft: chỉ ở rừng sồi tối, nền = mặt đất thấp nhất trong 4 góc ô 5 × 5 cạnh điểm gốc (phải ≥ 60), lấp móng đá
// cuội dưới tầng 1 xuống tới đất. Thêm (game): phần lớn chân nhà phải trên cạn, đất không quá dốc. Cả thế giới chỉ 1–2 cái (structPlan).
import { B } from "../blocks.js";
import type { Rng } from "../rng.js";
import { STRUCT } from "../structureConstants.js";
import { template } from "../structures.js";
import { mansionPieces } from "./mansionPieces.js";
import { rotSize, type Piece } from "./structPaint.js";
import { BIOME, type Column, type TerrainSampler } from "./terrainSampler.js";

export interface Box { x0: number; z0: number; x1: number; z1: number }

/** Vector (x, z) xoay r lần 90° theo chiều kim đồng hồ (Minecraft Rotation). */
const rotV = (r: number, x: number, z: number): [number, number] =>
  r === 1 ? [-z, x] : r === 2 ? [-x, -z] : r === 3 ? [z, -x] : [x, z];

/** Hộp chiếm của mảnh Minecraft (điểm gốc P, xoay r, lật m) → góc nhỏ nhất. */
function minCorner(px: number, pz: number, sx: number, sz: number, r: number, m: number): [number, number] {
  let mx = Infinity, mz = Infinity;
  for (const [cx, cz] of [[0, 0], [sx - 1, 0], [0, sz - 1], [sx - 1, sz - 1]] as const) {
    const [a, b] = rotV(r, m === 2 ? -cx : cx, m === 1 ? -cz : cz);
    mx = Math.min(mx, a);
    mz = Math.min(mz, b);
  }
  return [px + mx, pz + mz];
}

export function boxOf(pieces: readonly Piece[]): Box {
  const b: Box = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
  for (const p of pieces) {
    const [sx, , sz] = rotSize(p.t, p.rot);
    b.x0 = Math.min(b.x0, p.x);
    b.z0 = Math.min(b.z0, p.z);
    b.x1 = Math.max(b.x1, p.x + sx - 1);
    b.z1 = Math.max(b.z1, p.z + sz - 1);
  }
  return b;
}

const landOk = (c: Column): boolean => c.height > c.waterTop && !c.river && !c.lake && c.biome !== BIOME.OCEAN;

/** Dinh thự với điểm gốc (x, z), hoặc null nếu chỗ đó không hợp. */
export function mansion(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column): { pieces: Piece[]; box: Box } | null {
  const M = STRUCT.MANSION;
  if (col.biome !== BIOME.DARK_FOREST || !landOk(col) || !template("woodland_mansion/entrance")) return null;
  const R = Math.floor(rng() * 4);
  const ox = R === 1 || R === 2 ? -5 : 5, oz = R === 2 || R === 3 ? -5 : 5; // Minecraft getLowestYIn5by5BoxOffset7Blocks
  const y = Math.min(...[[0, 0], [ox, 0], [0, oz], [ox, oz]].map(([a, b]) => s.column(x + a!, z + b!).height));
  if (y < M.MIN_Y) return null;
  const pieces: Piece[] = [];
  for (const mp of mansionPieces(rng)) {
    const t = template(`woodland_mansion/${mp.name}`);
    if (!t) continue;
    const rot = (mp.rot + R) & 3, [px, pz] = rotV(R, mp.x, mp.z);
    const [mx, mz] = minCorner(x + px, z + pz, t.size[0], t.size[2], rot, mp.mir);
    const p: Piece = { t, rot, mir: mp.mir, x: mx, y: y + mp.y, z: mz, air: true };
    if (mp.y === 0) Object.assign(p, { fill: B.COBBLE, fillMax: M.FOUNDATION_MAX }); // móng đá cuội dưới tầng 1
    pieces.push(p);
  }
  // chân nhà: tâm các mảnh tầng 1 phần lớn trên cạn, mặt đất chênh không quá nhiều so với nền
  const feet = pieces.filter((p) => p.y === y).map((p) => {
    const [sx, , sz] = rotSize(p.t, p.rot);
    return s.column(p.x + (sx >> 1), p.z + (sz >> 1));
  });
  const land = feet.filter(landOk).length / Math.max(1, feet.length);
  if (land < M.LAND_SHARE || feet.some((c) => c.height - y > M.MAX_RISE)) return null;
  return { pieces, box: boxOf(pieces) };
}
