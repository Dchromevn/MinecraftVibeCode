// Công trình dưới nước Giai đoạn 7f (người dùng chọn 2026-11-15: bỏ kho báu chôn; mỗi loại 1–2 cái cả thế giới):
// - Tàu đắm (mẫu client.jar): dưới đáy biển (mọi mẫu) hoặc mắc cạn trên bãi biển (mẫu đứng thẳng / có cột buồm), xoay ngẫu nhiên,
//   lún 1–2 block; không vẽ ô không khí của mẫu nên nước còn trong thân tàu (như Minecraft).
// - Tàn tích đại dương: lạnh (gạch đá / nứt / rêu) hoặc ấm (đá cát) theo nhiệt độ biển; 30% tàn tích lớn (giữ 90% block), còn lại
//   nhỏ (giữ 80%); tàn tích lớn 90% kèm cụm 4–8 tàn tích nhỏ quanh đó. Rương và xác đuối canh theo khối dữ liệu trong mẫu.
import { B } from "../blocks.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { STRUCT } from "../structureConstants.js";
import { structureData, type StructTemplate } from "../structures.js";
import type { Placement } from "./structPlan.js";
import { rotSize, type Piece } from "./structPaint.js";
import { BIOME, type Column, type TerrainSampler } from "./terrainSampler.js";

const names = (prefix: string, f: (n: string) => boolean = () => true): string[] =>
  Object.keys(structureData()?.templates ?? {}).filter((n) => n.startsWith(prefix) && f(n));
const pick = <T>(rng: Rng, a: readonly T[]): T => a[randInt(rng, 0, a.length - 1)]!;

/** Mảnh đặt tâm ở (x, z), đáy ở y. */
function centered(t: StructTemplate, rot: number, x: number, y: number, z: number, extra: Partial<Piece> = {}): Piece {
  const [sx, , sz] = rotSize(t, rot);
  return { t, rot, x: x - (sx >> 1), y, z: z - (sz >> 1), air: false, ...extra };
}

/** Có cột biển (đại dương) trong bán kính r quanh (x, z). */
function oceanNear(s: TerrainSampler, x: number, z: number, r: number): boolean {
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]])
    if (s.column(x + dx!, z + dz!).biome === BIOME.OCEAN) return true;
  return false;
}

export function shipwreck(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column): Placement | null {
  const W = STRUCT.SHIPWRECK, data = structureData();
  if (!data) return null;
  const ocean = col.biome === BIOME.OCEAN && col.waterTop - col.height >= W.MIN_DEPTH;
  const beached = !ocean && col.biome !== BIOME.OCEAN && col.height <= col.waterTop + W.BEACH_MAX_ABOVE && !col.lake && oceanNear(s, x, z, W.BEACH_SEA_R);
  if (!ocean && !beached) return null;
  const list = beached ? names("shipwreck/", (n) => n.includes("rightsideup") || n.includes("with_mast")) : names("shipwreck/");
  if (!list.length) return null;
  const t = data.templates[pick(rng, list)]!, rot = randInt(rng, 0, 3);
  const y = beached ? col.height - (t.size[1] >> 1) - randInt(rng, 0, 2) : col.height + 1 - randInt(rng, W.SINK_MIN, W.SINK_MAX);
  return { kind: "shipwreck", pieces: [centered(t, rot, x, Math.max(2, y), z)], trees: [] };
}

/** Xóa ngẫu nhiên một phần block (độ nguyên vẹn), theo vị trí — chunk nào cũng ra như nhau. */
const rot = (seed: number, integrity: number) => (cell: number, x: number, y: number, z: number): number | null =>
  (cell & 255) === B.CHEST || mulberry32(hashInts(seed, x, y, z, 7703))() < integrity ? cell : null; // rương luôn còn

export function oceanRuin(s: TerrainSampler, rng: Rng, x: number, z: number, col: Column): Placement | null {
  const R = STRUCT.OCEAN_RUIN, data = structureData();
  if (!data || col.biome !== BIOME.OCEAN || col.waterTop - col.height < R.MIN_DEPTH) return null;
  const warm = col.temp > R.WARM_TEMP;
  const family = warm ? "warm" : pick(rng, ["brick", "cracked", "mossy"]);
  const large = rng() < R.LARGE_CHANCE;
  const smalls = names(`underwater_ruin/${family}_`), bigs = names(`underwater_ruin/big_${family}_`);
  const list = large && bigs.length ? bigs : smalls;
  if (!list.length) return null;
  const t = data.templates[pick(rng, list)]!;
  const pieces: Piece[] = [centered(t, randInt(rng, 0, 3), x, col.height, z, { proc: rot(s.seed, large ? R.BIG_INTEGRITY : R.SMALL_INTEGRITY) })];
  if (large && rng() < R.CLUSTER_CHANCE && smalls.length)
    for (let n = randInt(rng, R.CLUSTER_MIN, R.CLUSTER_MAX), i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = R.CLUSTER_R_MIN + rng() * (R.CLUSTER_R_MAX - R.CLUSTER_R_MIN);
      const px = Math.round(x + Math.cos(a) * d), pz = Math.round(z + Math.sin(a) * d), c = s.column(px, pz);
      if (c.biome !== BIOME.OCEAN || c.waterTop - c.height < R.MIN_DEPTH) continue;
      pieces.push(centered(data.templates[pick(rng, smalls)]!, randInt(rng, 0, 3), px, c.height, pz, { proc: rot(s.seed, R.SMALL_INTEGRITY) }));
    }
  return { kind: "ocean_ruin", pieces, trees: [] };
}
