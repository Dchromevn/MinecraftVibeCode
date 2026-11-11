// Quy tắc chung cho mọi thứ đục hang (hang noise, cửa hang): ô bị đục thành gì.
// Bảo đảm nước sinh sẵn luôn "tĩnh": không đục cạnh / ngay dưới nước bề mặt, hồ
// ngầm có đập giữ ở biên vùng, có lớp đá ngăn hồ ngầm với dung nham bên dưới.
import { CAVES, MINESHAFT } from "../constants.js";
import { B } from "../blocks.js";
import { hashInts, mulberry32 } from "../rng.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { mineshaftCenter } from "./mineshaftCenter.js";

const LR = CAVES.LAKE_REGION;

export class CaveRules {
  private readonly lakeCache = new Map<string, number>();

  constructor(private readonly sampler: TerrainSampler) {}

  /** Mực nước hồ ngầm của vùng chứa (x, z), 0 = không có hồ. */
  lakeLevel(x: number, z: number): number {
    const rx = Math.floor(x / LR), rz = Math.floor(z / LR);
    const key = `${rx},${rz}`;
    let level = this.lakeCache.get(key);
    if (level === undefined) {
      level = this.planLake(rx, rz);
      if (this.lakeCache.size > 4096) this.lakeCache.clear();
      this.lakeCache.set(key, level);
    }
    return level;
  }

  private planLake(rx: number, rz: number): number {
    const rng = mulberry32(hashInts(this.sampler.seed, rx, rz, 36));
    if (rng() >= CAVES.LAKE_CHANCE) return 0;
    const level = CAVES.LAKE_MIN_Y + Math.floor(rng() * (CAVES.LAKE_MAX_Y - CAVES.LAKE_MIN_Y + 1));
    // không có hồ ngầm trong vùng của hầm mỏ (hành lang khô sẽ làm nước tràn)
    const x0 = rx * LR, z0 = rz * LR, reach = MINESHAFT.MAX_RADIUS + 8;
    const mr = MINESHAFT.REGION;
    for (let mz = Math.floor((z0 - reach) / mr); mz <= Math.floor((z0 + LR + reach) / mr); mz++)
      for (let mx = Math.floor((x0 - reach) / mr); mx <= Math.floor((x0 + LR + reach) / mr); mx++) {
        const c = mineshaftCenter(this.sampler, mx, mz);
        if (!c) continue;
        if (c.x + reach > x0 && c.x - reach < x0 + LR && c.z + reach > z0 && c.z - reach < z0 + LR) return 0;
      }
    return level;
  }

  /**
   * Ô (x, y, z) bị đục thì thành block gì; null = phải giữ nguyên (không đục).
   * wetMin..wetMax: khoảng y mà một cột kề (4 hướng) đang chứa nước bề mặt.
   */
  fill(x: number, y: number, z: number, wetMin: number, wetMax: number): number | null {
    if (y < 1) return null;
    if (y >= wetMin && y <= wetMax) return null; // cạnh nước bề mặt
    if (y <= CAVES.LAVA_MAX_Y) return B.LAVA;
    const level = this.lakeLevel(x, z);
    if (level > 0 && y <= level) {
      const lx = x - Math.floor(x / LR) * LR, lz = z - Math.floor(z / LR) * LR;
      const dam = CAVES.LAKE_DAM;
      if (lx < dam || lz < dam || lx >= LR - dam || lz >= LR - dam) return null; // đập giữ nước
      if (y === CAVES.LAVA_MAX_Y + 1) return null; // lớp đá ngăn với dung nham
      return B.WATER;
    }
    return B.AIR;
  }

  /** Khoảng y chứa nước bề mặt của 4 cột kề (x, z); [Infinity, -Infinity] nếu không có. */
  wetRange(x: number, z: number): [number, number] {
    let lo = Infinity, hi = -Infinity;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const c = this.sampler.column(x + dx, z + dz);
      if (c.waterTop > c.height) {
        lo = Math.min(lo, c.height + 1);
        hi = Math.max(hi, c.waterTop);
      }
    }
    // cột của chính nó đang ở dưới nước: không đục sát đáy (tránh nước rơi xuống)
    const own = this.sampler.column(x, z);
    if (own.waterTop > own.height) {
      lo = Math.min(lo, own.height - 1);
      hi = Math.max(hi, own.waterTop);
    }
    return [lo, hi];
  }
}
