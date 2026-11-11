// Hồ trên mặt đất: mỗi vùng 128x128 có thể có một hồ ở chỗ đất bằng.
// Mặt nước = điểm thấp nhất của bờ (có thể cao hơn mực biển), nên nước luôn
// được bờ giữ lại. Hồ nằm gọn trong vùng của nó nên các vùng không chồng nhau.
import { LAKES, WORLD } from "../constants.js";
import { hashInts, mulberry32 } from "../rng.js";
import type { Column, TerrainSampler } from "./terrainSampler.js";

export interface Lake {
  x: number;
  z: number;
  radius: number;
  level: number; // y mặt nước
}

const OCEAN = 5;
const MOUNTAINS = 4;

export class LakePlanner {
  private readonly cache = new Map<string, Lake | null>();

  constructor(private readonly sampler: TerrainSampler) {}

  /** Nếu cột thuộc hồ: hạ đáy và đặt mặt nước. */
  apply(x: number, z: number, col: Column): void {
    const lake = this.lakeFor(Math.floor(x / LAKES.REGION), Math.floor(z / LAKES.REGION));
    if (!lake) return;
    const dx = x - lake.x, dz = z - lake.z;
    const d2 = dx * dx + dz * dz;
    const r2 = lake.radius * lake.radius;
    if (d2 > r2) return;
    // đáy hình lòng chảo: sâu nhất ở giữa
    const depth = 1 + Math.round((LAKES.DEPTH_MAX - 1) * (1 - d2 / r2));
    col.height = Math.min(col.height, lake.level - depth);
    col.waterTop = lake.level;
    col.lake = true;
  }

  lakeFor(rx: number, rz: number): Lake | null {
    const key = `${rx},${rz}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const lake = this.plan(rx, rz);
    if (this.cache.size > 4096) this.cache.clear();
    this.cache.set(key, lake);
    return lake;
  }

  private plan(rx: number, rz: number): Lake | null {
    const rng = mulberry32(hashInts(this.sampler.seed, rx, rz, 21));
    if (rng() >= LAKES.CHANCE) return null;
    // thử vài vị trí trong vùng, lấy chỗ đầu tiên đủ bằng phẳng
    for (let t = 0; t < LAKES.TRIES; t++) {
      const lake = this.tryAt(rx, rz, rng);
      if (lake) return lake;
    }
    return null;
  }

  private tryAt(rx: number, rz: number, rng: () => number): Lake | null {
    const radius = LAKES.RADIUS_MIN + Math.floor(rng() * (LAKES.RADIUS_MAX - LAKES.RADIUS_MIN + 1));
    const margin = radius + 3;
    const span = LAKES.REGION - 2 * margin;
    const x = rx * LAKES.REGION + margin + Math.floor(rng() * span);
    const z = rz * LAKES.REGION + margin + Math.floor(rng() * span);

    const center = this.sampler.baseColumn(x, z);
    if (center.biome === OCEAN || center.biome === MOUNTAINS || center.river) return null;

    // bờ = các cột ngay ngoài đĩa hồ (kề với ô nước); mặt nước = bờ thấp nhất
    let lo = Infinity, hi = -Infinity;
    const outer = (radius + 1.5) * (radius + 1.5);
    for (let dz = -radius - 2; dz <= radius + 2; dz++) {
      for (let dx = -radius - 2; dx <= radius + 2; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= radius * radius || d2 > outer) continue;
        const c = this.sampler.baseColumn(x + dx, z + dz);
        if (c.river || c.height <= WORLD.SEA_LEVEL) return null; // không chạm sông/biển
        lo = Math.min(lo, c.height);
        hi = Math.max(hi, c.height);
      }
    }
    if (hi - lo > LAKES.MAX_RELIEF) return null; // không đủ bằng phẳng
    return { x, z, radius, level: lo };
  }
}
