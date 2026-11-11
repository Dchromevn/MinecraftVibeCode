// Mạch nước / dung nham trên trần hang: một block chất lỏng ở trần, bên dưới là
// không khí. Trước Giai đoạn 4 nó chỉ là một block; Giai đoạn 4 cho chảy khi tải chunk.
import { CAVES } from "../constants.js";
import { B } from "../blocks.js";
import { blockIndex } from "../chunk.js";
import { hashInts, mulberry32, type Rng } from "../rng.js";
import type { Column } from "./terrainSampler.js";

const TRIES = 96;

function findCeiling(data: Uint8Array, cols: Column[], rng: Rng, maxY: number): { i: number } | null {
  for (let t = 0; t < TRIES; t++) {
    const lx = Math.floor(rng() * 16), lz = Math.floor(rng() * 16);
    const top = Math.min(maxY, cols[lz * 16 + lx]!.height - 8);
    if (top <= CAVES.LAVA_MAX_Y + 2) continue;
    const y = CAVES.LAVA_MAX_Y + 2 + Math.floor(rng() * (top - CAVES.LAVA_MAX_Y - 2));
    // tìm lên trên tới trần: ô không khí có đá ngay phía trên
    for (let yy = y; yy < top; yy++) {
      if (data[blockIndex(lx, yy, lz)] !== B.AIR) continue;
      const above = data[blockIndex(lx, yy + 1, lz)];
      // trần dày ít nhất 2 block để mạch có đá phía trên
      const above2 = data[blockIndex(lx, yy + 2, lz)];
      const solid = (b: number | undefined): boolean => b === B.STONE || b === B.DEEPSLATE;
      if (solid(above) && solid(above2)) return { i: blockIndex(lx, yy + 1, lz) };
      break;
    }
  }
  return null;
}

export function placeCaveSprings(seed: number, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  const rng = mulberry32(hashInts(seed, cx, cz, 19));
  if (rng() < CAVES.SPRING_WATER_CHANCE) {
    const c = findCeiling(data, cols, rng, 127);
    if (c) data[c.i] = B.WATER;
  }
  if (rng() < CAVES.SPRING_LAVA_CHANCE) {
    const c = findCeiling(data, cols, rng, CAVES.SPRING_LAVA_MAX_Y);
    if (c) data[c.i] = B.LAVA;
  }
}
