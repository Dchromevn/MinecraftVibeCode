// Tiền đồn kẻ cướp (Giai đoạn 8b; structure "pillager_outpost" trong client.jar): nền + tháp canh (rương ở đỉnh) + 0–3 tấm nền phụ bám
// mặt đất có lều, lồng nhốt người sắt / tiểu linh, đống gỗ, bia tập bắn. Mỗi vùng OUTPOST.SPACING × SPACING chunk thử một chỗ, chỉ
// FREQUENCY phần vùng có, không gần làng (Minecraft: exclusion_zone 10 chunk quanh chỗ làng), biome như làng. Dùng bộ ghép của làng.
import { hashInts, mulberry32, randInt } from "../rng.js";
import { structureData } from "../structures.js";
import { OUTPOST } from "../illagerConstants.js";
import { VILLAGE } from "../villageConstants.js";
import type { Piece } from "./structPaint.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { assemble, flatEnough, shuffled, surfaceY, villageAt, villageTypeAt, type VillagePlan } from "./villagePlan.js";

const cache = new Map<string, VillagePlan | null>();

/** Chỗ làng gần (x, z) trong VILLAGE_EXCLUSION_CHUNKS chunk. */
function nearVillageStart(s: TerrainSampler, x: number, z: number): boolean {
  const span = VILLAGE.SPACING * 16, r = OUTPOST.VILLAGE_EXCLUSION_CHUNKS * 16;
  for (let rx = Math.floor((x - r) / span); rx <= Math.floor((x + r) / span); rx++)
    for (let rz = Math.floor((z - r) / span); rz <= Math.floor((z + r) / span); rz++) {
      const v = villageAt(s, rx, rz);
      if (v && Math.abs(v.x - x) <= r && Math.abs(v.z - z) <= r) return true;
    }
  return false;
}

/** Tiền đồn của vùng (rx, rz), hoặc null. */
export function outpostAt(s: TerrainSampler, rx: number, rz: number): VillagePlan | null {
  const data = structureData();
  if (!data?.pools["pillager_outpost/base_plates"]) return null;
  const key = `${s.seed},${rx},${rz}`;
  if (cache.has(key)) return cache.get(key)!;
  const O = OUTPOST, rng = mulberry32(hashInts(s.seed, rx, rz, O.SALT));
  const cx = rx * O.SPACING + randInt(rng, 0, O.SPACING - O.SEPARATION - 1), cz = rz * O.SPACING + randInt(rng, 0, O.SPACING - O.SEPARATION - 1);
  const x = cx * 16 + 8, z = cz * 16 + 8, type = villageTypeAt(s, x, z);
  let plan: VillagePlan | null = null;
  if (rng() < O.FREQUENCY && type && flatEnough(s, x, z) && !nearVillageStart(s, x, z)) {
    const name = shuffled(data.pools["pillager_outpost/base_plates"], rng)[0], t = name ? data.templates[name] : undefined;
    if (t) {
      const rot = randInt(rng, 0, 3), sx = rot & 1 ? t.size[2] : t.size[0], sz = rot & 1 ? t.size[0] : t.size[2];
      const start: Piece = { t, rot, x: x - (sx >> 1), y: surfaceY(s, x, z), z: z - (sz >> 1), air: true, fill: 2 };
      plan = assemble(s, rng, type, start, x, z, 0, { kind: "outpost", depth: O.MAX_DEPTH, vertCheck: true });
      if (!plan.pieces.some((p) => p.t.loot.length)) plan = null; // không có tháp canh: bỏ
    }
  }
  if (cache.size > 256) cache.clear();
  cache.set(key, plan);
  return plan;
}

/** Mọi tiền đồn có phần nằm trong [x0..x1] × [z0..z1]. */
export function outpostsIn(s: TerrainSampler, x0: number, z0: number, x1: number, z1: number): VillagePlan[] {
  const span = OUTPOST.SPACING * 16, m = VILLAGE.MAX_DIST + 24, out: VillagePlan[] = [];
  for (let rx = Math.floor((x0 - m) / span); rx <= Math.floor((x1 + m) / span); rx++)
    for (let rz = Math.floor((z0 - m) / span); rz <= Math.floor((z1 + m) / span); rz++) {
      const v = outpostAt(s, rx, rz);
      if (v && v.x + m >= x0 && v.x - m <= x1 && v.z + m >= z0 && v.z - m <= z1) out.push(v);
    }
  return out;
}
