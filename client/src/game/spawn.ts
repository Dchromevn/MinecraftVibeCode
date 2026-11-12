// Chọn chỗ xuất phát: ngẫu nhiên trên đất liền trong bán kính SPAWN.RANDOM_RADIUS (mặc định),
// hoặc cố định (đất liền gần gốc nhất, ?spawn=fixed). Giai đoạn 5 server giữ điểm hồi sinh chung.
import { SPAWN, WORLD, type TerrainSampler } from "../../../shared/src/index.js";

export interface SpawnPoint {
  x: number;
  z: number;
  h: number; // độ cao mặt đất
}

/** Đất liền gần gốc tọa độ nhất (xác định theo seed). */
export function fixedSpawn(sampler: TerrainSampler): SpawnPoint {
  for (let r = 0; r < 4000; r += 16)
    for (let a = 0; a < 16; a++) {
      const x = Math.round(r * Math.cos((a / 16) * Math.PI * 2));
      const z = Math.round(r * Math.sin((a / 16) * Math.PI * 2));
      const c = sampler.column(x, z);
      if (c.height > c.waterTop) return { x, z, h: c.height };
    }
  return { x: 0, z: 0, h: WORLD.SEA_LEVEL };
}

/** Điểm đất liền ngẫu nhiên (thử nhiều lần; không được thì dùng điểm cố định). */
export function randomSpawn(sampler: TerrainSampler, rand: () => number = Math.random): SpawnPoint {
  for (let t = 0; t < SPAWN.TRIES; t++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * SPAWN.RANDOM_RADIUS;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    const c = sampler.column(x, z);
    if (c.height > c.waterTop && c.height < SPAWN.MAX_HEIGHT) return { x, z, h: c.height };
  }
  return fixedSpawn(sampler);
}
