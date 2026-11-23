// Công trình ghép khối (làng 8a, tiền đồn kẻ cướp 8b) có phần nằm trong một vùng — dùng để vẽ, tra rương, sinh vật, chặn cây tự nhiên.
import { outpostsIn } from "./outpostPlan.js";
import type { TerrainSampler } from "./terrainSampler.js";
import { colKey, villagesIn, type VillagePlan } from "./villagePlan.js";

export function jigsawIn(s: TerrainSampler, x0: number, z0: number, x1: number, z1: number): VillagePlan[] {
  return [...villagesIn(s, x0, z0, x1, z1), ...outpostsIn(s, x0, z0, x1, z1)];
}

/** Cột (x, z) nằm trong / sát (r block) nhà, đường của làng hoặc nền tiền đồn (cây tự nhiên không mọc). */
export function nearVillage(s: TerrainSampler, x: number, z: number, r: number): boolean {
  for (const v of jigsawIn(s, x, z, x, z))
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (v.cols.has(colKey(x + dx, z + dz))) return true;
  return false;
}
