// Cây, cỏ cao và bí ngô mọc hoang. Vị trí cây quyết định theo lưới 5x5 + seed, nên chunk nào chứa
// phần lá / thân của cây (kể cả cây gốc ở chunk kề) thì tự đặt phần đó. Loài cây theo biome
// (Giai đoạn 4d) chọn bằng một số băm riêng nên cây sồi giữ đúng vị trí và hình như trước.
import { BIOMES, TREE_MIX, TREE_SPECIES, WORLD } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { hashInts, mulberry32 } from "../rng.js";
import { wood, type WoodKind } from "../woods.js";
import { BIOME, BIOME_KEYS, hasGrassSurface, hash01, type Column } from "./terrainSampler.js";
import { planTree, trunkLength, type TreePlan } from "./treeShapes.js";
import type { ChunkGenerator } from "./chunkGen.js";

const CELL = WORLD.TREE_CELL;
const REACH = TREE_SPECIES.MAX_REACH;

interface Tree {
  kind: WoodKind;
  plan: TreePlan;
}

/** Loài cây theo biome của cột gốc (s = số ngẫu nhiên riêng của ô lưới). */
export function treeKind(col: Column, s: number): WoodKind {
  switch (col.biome) {
    case BIOME.SNOWY:
      return "spruce";
    case BIOME.MOUNTAINS:
      return s < TREE_MIX.MOUNTAIN_SPRUCE ? "spruce" : "oak";
    case BIOME.FOREST:
      return s < TREE_MIX.FOREST_BIRCH ? "birch" : "oak";
    default:
      if (col.temp > TREE_MIX.ACACIA_TEMP && col.humid < TREE_MIX.ACACIA_HUMID) return "acacia";
      return s < TREE_MIX.PLAINS_BIRCH ? "birch" : "oak";
  }
}

function treesNear(gen: ChunkGenerator, cx: number, cz: number): Tree[] {
  const out: Tree[] = [];
  const gx0 = Math.floor((cx * 16 - REACH) / CELL), gx1 = Math.floor((cx * 16 + 15 + REACH) / CELL);
  const gz0 = Math.floor((cz * 16 - REACH) / CELL), gz1 = Math.floor((cz * 16 + 15 + REACH) / CELL);
  for (let gz = gz0; gz <= gz1; gz++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const rng = mulberry32(hashInts(gen.seed, gx, gz, 11));
      const p = rng();
      const x = gx * CELL + 1 + Math.floor(rng() * 3);
      const z = gz * CELL + 1 + Math.floor(rng() * 3);
      const tr = rng();
      const col = gen.sampler.column(x, z);
      const chance = BIOMES[BIOME_KEYS[col.biome]].treeChance;
      if (p >= chance || !hasGrassSurface(col)) continue;
      if (col.biome === BIOME.MOUNTAINS && col.height > BIOMES.MOUNTAIN_TREE_MAX_Y) continue;
      const kind = treeKind(col, hash01(gen.seed, gx, gz, 31));
      const trunk = trunkLength(kind, tr);
      if (col.height + trunk + 4 >= CHUNK_HEIGHT) continue;
      if (gen.entrances.mouthNear(x, z, col.height, 3)) continue; // không trồng lên miệng hang
      out.push({ kind, plan: planTree(kind, x, col.height + 1, z, trunk, rng) });
    }
  }
  return out;
}

export function placeTrees(gen: ChunkGenerator, data: Uint8Array, cx: number, cz: number): void {
  const x0 = cx * 16, z0 = cz * 16;
  const idx = (x: number, y: number, z: number): number =>
    x >= x0 && z >= z0 && x < x0 + 16 && z < z0 + 16 && y >= 0 && y < CHUNK_HEIGHT ? blockIndex(x - x0, y, z - z0) : -1;
  const trees = treesNear(gen, cx, cz);
  // lượt 1: lá của mọi cây; lượt 2: thân (đè lên lá) — kết quả không phụ thuộc thứ tự chunk
  for (const t of trees) {
    const leaves = wood(t.kind).leaves;
    for (const [x, y, z] of t.plan.leaves) {
      const i = idx(x, y, z);
      // lá thay được không khí và lớp tuyết mỏng (sườn núi phủ tuyết)
      if (i >= 0 && (data[i] === B.AIR || data[i] === B.SNOW_LAYER)) data[i] = leaves;
    }
  }
  for (const t of trees) {
    const log = wood(t.kind).log;
    for (const [x, y, z] of t.plan.logs) {
      const i = idx(x, y, z);
      if (i >= 0) data[i] = log;
    }
  }
}

export function placeTallGrass(gen: ChunkGenerator, data: Uint8Array, cx: number, cz: number, cols: Column[]): void {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const col = cols[lz * 16 + lx]!;
      if (!hasGrassSurface(col)) continue;
      const biome = BIOMES[BIOME_KEYS[col.biome]];
      const wx = cx * 16 + lx, wz = cz * 16 + lz;
      const pumpkin = hash01(gen.seed, wx, wz, 29) < biome.pumpkinChance;
      if (!pumpkin && hash01(gen.seed, wx, wz, 13) >= biome.grassChance) continue;
      const y = col.height + 1;
      if (y >= CHUNK_HEIGHT || data[blockIndex(lx, col.height, lz)] !== B.GRASS) continue;
      const i = blockIndex(lx, y, lz);
      if (data[i] === B.AIR) data[i] = pumpkin ? B.PUMPKIN : B.TALLGRASS;
    }
  }
}
