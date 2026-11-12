// Hoa theo đám và xương rồng (DESIGN.md 2.13, Giai đoạn 4d). Xác định theo seed + tọa độ: mỗi cột tự
// tính đám hoa / cây xương rồng nào chứa nó, nên chunk sinh độc lập vẫn liền mạch.
import { CACTUS, FLOWERS } from "../constants.js";
import { B, BLOCKS, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { BIOME, BIOME_KEYS, hasGrassSurface, hash01, type Column, type TerrainSampler } from "./terrainSampler.js";

const FLOWER_ID: Readonly<Record<string, BlockId>> = Object.fromEntries(
  ["dandelion", "poppy", "cornflower", "lily_of_the_valley"].map((k) => [k, BLOCKS.find((b) => b.key === k)!.id]),
);

interface Patch {
  x: number;
  z: number;
  flower: BlockId;
}

/** Đám hoa của ô lưới (gx, gz), hoặc null. Loại hoa theo biome ở tâm đám. */
function patchAt(sampler: TerrainSampler, gx: number, gz: number): Patch | null {
  const seed = sampler.seed;
  const x = gx * FLOWERS.CELL + Math.floor(hash01(seed, gx, gz, 41) * FLOWERS.CELL);
  const z = gz * FLOWERS.CELL + Math.floor(hash01(seed, gx, gz, 42) * FLOWERS.CELL);
  const key = BIOME_KEYS[sampler.column(x, z).biome];
  const chance = FLOWERS.PATCH_CHANCE[key] ?? 0;
  if (hash01(seed, gx, gz, 43) >= chance) return null;
  const types = FLOWERS.TYPES[key]!;
  return { x, z, flower: FLOWER_ID[types[Math.floor(hash01(seed, gx, gz, 44) * types.length)]!]! };
}

export function placeFlowers(sampler: TerrainSampler, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  const R = FLOWERS.RADIUS, C = FLOWERS.CELL;
  const gx0 = Math.floor((cx * 16 - R) / C), gx1 = Math.floor((cx * 16 + 15 + R) / C);
  const gz0 = Math.floor((cz * 16 - R) / C), gz1 = Math.floor((cz * 16 + 15 + R) / C);
  for (let gz = gz0; gz <= gz1; gz++)
    for (let gx = gx0; gx <= gx1; gx++) {
      const p = patchAt(sampler, gx, gz);
      if (!p) continue;
      for (let wz = p.z - R; wz <= p.z + R; wz++)
        for (let wx = p.x - R; wx <= p.x + R; wx++) {
          const lx = wx - cx * 16, lz = wz - cz * 16;
          if (lx < 0 || lz < 0 || lx > 15 || lz > 15) continue;
          if ((wx - p.x) ** 2 + (wz - p.z) ** 2 > R * R + 1) continue;
          if (hash01(sampler.seed, wx, wz, 45) >= FLOWERS.DENSITY) continue;
          const col = cols[lz * 16 + lx]!;
          const y = col.height + 1;
          if (!hasGrassSurface(col) || y >= CHUNK_HEIGHT || data[blockIndex(lx, col.height, lz)] !== B.GRASS) continue;
          const i = blockIndex(lx, y, lz);
          if (data[i] === B.AIR) data[i] = p.flower;
        }
    }
}

/** Cột sa mạc khô, mặt cát, không ở bờ nước. */
function desertDry(col: Column): boolean {
  return col.biome === BIOME.DESERT && col.height > col.waterTop + 1;
}

export function placeCacti(sampler: TerrainSampler, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  const C = CACTUS.CELL, seed = sampler.seed;
  for (let gz = Math.floor((cz * 16) / C); gz <= Math.floor((cz * 16 + 15) / C); gz++)
    for (let gx = Math.floor((cx * 16) / C); gx <= Math.floor((cx * 16 + 15) / C); gx++) {
      if (hash01(seed, gx, gz, 51) >= CACTUS.CHANCE) continue;
      // vị trí 0..2 trong ô 4: hai cây ở hai ô kề nhau cách nhau ít nhất 2 block
      const wx = gx * C + Math.floor(hash01(seed, gx, gz, 52) * (C - 1));
      const wz = gz * C + Math.floor(hash01(seed, gx, gz, 53) * (C - 1));
      const lx = wx - cx * 16, lz = wz - cz * 16;
      if (lx < 0 || lz < 0 || lx > 15 || lz > 15) continue;
      const col = cols[lz * 16 + lx]!;
      const h = col.height;
      if (!desertDry(col) || data[blockIndex(lx, h, lz)] !== B.SAND) continue;
      // 4 ô ngang bên cạnh phải trống ở mọi tầng của cây: cột kề cũng là sa mạc khô, không cao hơn
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => {
        const n = sampler.column(wx + dx!, wz + dz!);
        return desertDry(n) && n.height <= h;
      });
      if (!ok) continue;
      const span = CACTUS.HEIGHT_MAX - CACTUS.HEIGHT_MIN + 1;
      const tall = CACTUS.HEIGHT_MIN + Math.floor(hash01(seed, gx, gz, 54) * span);
      for (let y = h + 1; y <= h + tall && y < CHUNK_HEIGHT; y++) {
        const i = blockIndex(lx, y, lz);
        if (data[i] !== B.AIR) break;
        data[i] = B.CACTUS;
      }
    }
}
