// Đục hang trong một chunk: hang noise (sợi mì + phô mai) rồi cửa hang. Ô bị đục
// thành gì do CaveRules quyết định (không khí / dung nham / nước hồ ngầm / giữ đá).
import { CAVES } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { CaveField, type CaveSample } from "./caveField.js";
import { inSphere } from "./entrances.js";
import type { Column } from "./terrainSampler.js";
import type { ChunkGenerator } from "./chunkGen.js";

/** Block có thể bị đục (không đục đá nền, không đục nước bề mặt). */
function carvable(id: number): boolean {
  return id !== B.AIR && id !== B.BEDROCK && id !== B.WATER && id !== B.LAVA;
}

export function carveChunk(gen: ChunkGenerator, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  const grid = gen.caves.chunkGrid(cx, cz);
  const s: CaveSample = { a: 0, b: 0, c: 0 };
  const wet: [number, number][] = [];
  for (let lz = 0; lz < 16; lz++)
    for (let lx = 0; lx < 16; lx++) wet.push(gen.rules.wetRange(cx * 16 + lx, cz * 16 + lz));

  const put = (lx: number, y: number, lz: number): void => {
    const i = blockIndex(lx, y, lz);
    if (!carvable(data[i]!)) return;
    const [lo, hi] = wet[lz * 16 + lx]!;
    const f = gen.rules.fill(cx * 16 + lx, y, cz * 16 + lz, lo, hi);
    if (f === null) return;
    data[i] = f;
    // lớp tuyết / cỏ cao lơ lửng trên chỗ vừa đục thì bỏ đi
    if (y + 1 < CHUNK_HEIGHT) {
      const above = data[blockIndex(lx, y + 1, lz)];
      if (above === B.SNOW_LAYER || above === B.TALLGRASS) data[blockIndex(lx, y + 1, lz)] = B.AIR;
    }
  };

  // 1. hang noise
  for (let lz = 0; lz < 16; lz++)
    for (let lx = 0; lx < 16; lx++) {
      const top = cols[lz * 16 + lx]!.height - CAVES.SURFACE_MARGIN;
      for (let y = 1; y <= top; y++) {
        CaveField.fromGrid(grid, lx, y, lz, s);
        if (CaveField.carves(s, y, top)) put(lx, y, lz);
      }
    }

  // 2. cửa hang (khối cầu từ kế hoạch của các vùng xung quanh)
  const x0 = cx * 16, z0 = cz * 16;
  for (const sp of gen.entrances.spheresNear(cx, cz)) {
    const r = Math.ceil(sp.r);
    const bx = Math.floor(sp.x), by = Math.floor(sp.y), bz = Math.floor(sp.z);
    for (let x = bx - r; x <= bx + r; x++) {
      if (x < x0 || x >= x0 + 16) continue;
      for (let z = bz - r; z <= bz + r; z++) {
        if (z < z0 || z >= z0 + 16) continue;
        for (let y = Math.max(1, by - r); y <= Math.min(CHUNK_HEIGHT - 1, by + r); y++) {
          if (inSphere(sp, x, y, z)) put(x - x0, y, z - z0);
        }
      }
    }
  }
}
