// Block "tự nhiên" tại một ô bất kỳ (địa hình + hang + cửa hang), tính chỉ từ seed
// + tọa độ — cho bộ lập kế hoạch hầm mỏ biết chỗ nào đặc, chỗ nào trống, mà không
// cần sinh các chunk xung quanh. Không tính quặng, cây (không ảnh hưởng hầm mỏ).
import { CAVES } from "../constants.js";
import { B } from "../blocks.js";
import { CaveField, type CaveSample } from "./caveField.js";
import { inSphere } from "./entrances.js";
import type { ChunkGenerator } from "./chunkGen.js";

const s: CaveSample = { a: 0, b: 0, c: 0 };

export function naturalBlock(gen: ChunkGenerator, x: number, y: number, z: number): number {
  if (y <= 0) return B.BEDROCK;
  const col = gen.sampler.column(x, z);
  if (y > col.height) return y <= col.waterTop ? B.WATER : B.AIR;
  let carved = false;
  gen.caves.sample(x, y, z, s);
  if (CaveField.carves(s, y, col.height - CAVES.SURFACE_MARGIN)) carved = true;
  if (!carved) {
    for (const sp of gen.entrances.spheresNear(x >> 4, z >> 4)) {
      if (inSphere(sp, x, y, z)) {
        carved = true;
        break;
      }
    }
  }
  if (carved) {
    const [lo, hi] = gen.rules.wetRange(x, z);
    const f = gen.rules.fill(x, y, z, lo, hi);
    if (f !== null) return f;
  }
  return B.STONE;
}
