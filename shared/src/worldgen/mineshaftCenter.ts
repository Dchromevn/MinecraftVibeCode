// Tâm hầm mỏ của một vùng 256x256 (chỉ phụ thuộc seed + tọa độ vùng + địa hình),
// tách riêng để quy tắc hồ ngầm dùng được mà không cần lập cả kế hoạch hầm mỏ.
import { MINESHAFT } from "../constants.js";
import { hashInts, mulberry32 } from "../rng.js";
import type { TerrainSampler } from "./terrainSampler.js";

export interface MineCenter {
  x: number;
  y: number; // mức sàn phòng trung tâm
  z: number;
}

const cache = new WeakMap<TerrainSampler, Map<string, MineCenter | null>>();

export function mineshaftCenter(sampler: TerrainSampler, rx: number, rz: number): MineCenter | null {
  let m = cache.get(sampler);
  if (!m) {
    m = new Map();
    cache.set(sampler, m);
  }
  const key = `${rx},${rz}`;
  const hit = m.get(key);
  if (hit !== undefined) return hit;

  const rng = mulberry32(hashInts(sampler.seed, rx, rz, 41));
  let center: MineCenter | null = null;
  if (rng() < MINESHAFT.CHANCE) {
    const margin = MINESHAFT.MAX_RADIUS + 8;
    const span = MINESHAFT.REGION - 2 * margin;
    const x = rx * MINESHAFT.REGION + margin + Math.floor(rng() * span);
    const z = rz * MINESHAFT.REGION + margin + Math.floor(rng() * span);
    const y = MINESHAFT.ROOM_Y_MIN + Math.floor(rng() * (MINESHAFT.ROOM_Y_MAX - MINESHAFT.ROOM_Y_MIN + 1));
    const col = sampler.column(x, z);
    // phòng trung tâm phải nằm dưới đất khô, đủ sâu
    if (col.height > col.waterTop && col.height >= y + 6 + MINESHAFT.MIN_COVER) center = { x, y, z };
  }
  if (m.size > 1024) m.clear();
  m.set(key, center);
  return center;
}
