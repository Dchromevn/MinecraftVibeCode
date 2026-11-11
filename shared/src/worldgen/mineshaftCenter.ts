// Tâm hầm mỏ của một vùng MINESHAFT.REGION (chỉ phụ thuộc seed + tọa độ vùng + địa hình),
// tách riêng để đo/kiểm tra được mà không cần lập cả kế hoạch hầm mỏ.
import { MINESHAFT } from "../constants.js";
import { hashInts, mulberry32 } from "../rng.js";
import type { TerrainSampler } from "./terrainSampler.js";
import type { CaveRules } from "./caveRules.js";

export interface MineCenter {
  x: number;
  y: number; // mức sàn phòng trung tâm
  z: number;
}

const cache = new WeakMap<TerrainSampler, Map<string, MineCenter | null>>();

/** Phòng (rộng tối đa 11) không được chạm phần dưới mực nước của hồ ngầm nào. */
function aboveLakes(rules: CaveRules, x: number, y: number, z: number): boolean {
  for (const [ox, oz] of [[0, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]] as const) {
    const level = rules.lakeLevel(x + ox, z + oz);
    if (level > 0 && y <= level) return false;
  }
  return true;
}

export function mineshaftCenter(sampler: TerrainSampler, rules: CaveRules, rx: number, rz: number): MineCenter | null {
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
    const margin = MINESHAFT.CENTER_MARGIN;
    const span = MINESHAFT.REGION - 2 * margin;
    // tâm rơi vào biển / đất không đủ dày thì thử chỗ khác trong vùng
    for (let t = 0; t < MINESHAFT.CENTER_TRIES && !center; t++) {
      const x = rx * MINESHAFT.REGION + margin + Math.floor(rng() * span);
      const z = rz * MINESHAFT.REGION + margin + Math.floor(rng() * span);
      const y = MINESHAFT.ROOM_Y_MIN + Math.floor(rng() * (MINESHAFT.ROOM_Y_MAX - MINESHAFT.ROOM_Y_MIN + 1));
      const col = sampler.column(x, z);
      // phòng trung tâm phải nằm dưới đất khô, đủ sâu
      if (col.height > col.waterTop && col.height >= y + 6 + MINESHAFT.MIN_COVER && aboveLakes(rules, x, y, z))
        center = { x, y, z };
    }
  }
  if (m.size > 1024) m.clear();
  m.set(key, center);
  return center;
}
