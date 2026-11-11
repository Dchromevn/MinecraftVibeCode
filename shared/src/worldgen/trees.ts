// Cây và cỏ cao. Vị trí cây quyết định theo lưới 5x5 + seed, nên chunk nào chứa
// phần lá của cây (kể cả cây gốc ở chunk kề) thì tự đặt phần đó.
import { BIOMES, WORLD } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { hashInts, mulberry32, type Rng } from "../rng.js";
import { BIOME_KEYS, hasGrassSurface, hash01, type Column } from "./terrainSampler.js";
import type { ChunkGenerator } from "./chunkGen.js";

const CELL = WORLD.TREE_CELL;
const R = (WORLD.TREE_CANOPY_SIZE - 1) / 2; // 2

interface Tree {
  x: number;
  z: number;
  base: number; // y của khúc thân thấp nhất
  trunk: number;
  rng: Rng; // tiếp tục dùng cho hình tán lá (xác định theo cây)
}

function treesNear(gen: ChunkGenerator, cx: number, cz: number): Tree[] {
  const out: Tree[] = [];
  const gx0 = Math.floor((cx * 16 - R) / CELL), gx1 = Math.floor((cx * 16 + 15 + R) / CELL);
  const gz0 = Math.floor((cz * 16 - R) / CELL), gz1 = Math.floor((cz * 16 + 15 + R) / CELL);
  for (let gz = gz0; gz <= gz1; gz++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const rng = mulberry32(hashInts(gen.seed, gx, gz, 11));
      const p = rng();
      const x = gx * CELL + 1 + Math.floor(rng() * 3);
      const z = gz * CELL + 1 + Math.floor(rng() * 3);
      const trunk = WORLD.TREE_TRUNK_MIN + Math.floor(rng() * (WORLD.TREE_TRUNK_MAX - WORLD.TREE_TRUNK_MIN + 1));
      const col = gen.sampler.column(x, z);
      const chance = BIOMES[BIOME_KEYS[col.biome]].treeChance;
      if (p >= chance || !hasGrassSurface(col)) continue;
      if (col.biome === 4 /* núi */ && col.height > BIOMES.MOUNTAIN_TREE_MAX_Y) continue;
      if (col.height + trunk + 3 >= CHUNK_HEIGHT) continue;
      out.push({ x, z, base: col.height + 1, trunk, rng });
    }
  }
  return out;
}

export function placeTrees(gen: ChunkGenerator, data: Uint8Array, cx: number, cz: number): void {
  const x0 = cx * 16, z0 = cz * 16;
  const inside = (x: number, z: number): boolean => x >= x0 && z >= z0 && x < x0 + 16 && z < z0 + 16;
  const leaf = (x: number, y: number, z: number): void => {
    if (!inside(x, z) || y >= CHUNK_HEIGHT) return;
    const i = blockIndex(x - x0, y, z - z0);
    if (data[i] === B.AIR) data[i] = B.LEAVES;
  };
  const trees = treesNear(gen, cx, cz);

  // lượt 1: lá của mọi cây; lượt 2: thân (đè lên lá) — kết quả không phụ thuộc thứ tự chunk
  for (const t of trees) {
    const top = t.base + t.trunk - 1;
    for (let dy = -2; dy <= -1; dy++)
      for (let dx = -R; dx <= R; dx++)
        for (let dz = -R; dz <= R; dz++) {
          const corner = Math.abs(dx) === R && Math.abs(dz) === R;
          if (corner && t.rng() < 0.6) continue;
          leaf(t.x + dx, top + dy, t.z + dz);
        }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && t.rng() < 0.5) continue;
        leaf(t.x + dx, top, t.z + dz);
      }
    leaf(t.x, top + 1, t.z);
    leaf(t.x + 1, top + 1, t.z);
    leaf(t.x - 1, top + 1, t.z);
    leaf(t.x, top + 1, t.z + 1);
    leaf(t.x, top + 1, t.z - 1);
  }
  for (const t of trees) {
    if (!inside(t.x, t.z)) continue;
    for (let dy = 0; dy < t.trunk; dy++) data[blockIndex(t.x - x0, t.base + dy, t.z - z0)] = B.LOG;
  }
}

export function placeTallGrass(gen: ChunkGenerator, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const col = cols[lz * 16 + lx]!;
      if (!hasGrassSurface(col)) continue;
      const chance = BIOMES[BIOME_KEYS[col.biome]].grassChance;
      if (hash01(gen.seed, cx * 16 + lx, cz * 16 + lz, 13) >= chance) continue;
      const y = col.height + 1;
      if (y >= CHUNK_HEIGHT || data[blockIndex(lx, col.height, lz)] !== B.GRASS) continue;
      const i = blockIndex(lx, y, lz);
      if (data[i] === B.AIR) data[i] = B.TALLGRASS;
    }
  }
}
