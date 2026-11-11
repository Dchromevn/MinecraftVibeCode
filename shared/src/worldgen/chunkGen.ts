// Sinh một chunk độc lập từ seed + (cx, cz). Không đọc dữ liệu chunk khác,
// nên mọi chunk sinh ra đều khớp nhau ở ranh giới.
import { TERRAIN, WORLD } from "../constants.js";
import { B, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, CHUNK_VOLUME, blockIndex } from "../chunk.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import { BIOME, TerrainSampler, hasGrassSurface, type Column } from "./terrainSampler.js";
import { placeTallGrass, placeTrees } from "./trees.js";
import { placeSprings } from "./springs.js";

const SEA = WORLD.SEA_LEVEL;

export class ChunkGenerator {
  readonly sampler: TerrainSampler;

  constructor(readonly seed: number) {
    this.sampler = new TerrainSampler(seed);
  }

  generate(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_VOLUME);
    const cols: Column[] = [];
    for (let lz = 0; lz < 16; lz++)
      for (let lx = 0; lx < 16; lx++) {
        const col = this.sampler.column(cx * 16 + lx, cz * 16 + lz);
        cols.push(col);
        this.fillColumn(data, lx, lz, col, cx * 16 + lx, cz * 16 + lz);
      }
    this.placeOres(data, cx, cz);
    placeTrees(this, data, cx, cz);
    placeTallGrass(this, data, cx, cz, cols);
    placeSprings(this.sampler, data, cx, cz, cols);
    return data;
  }

  private fillColumn(data: Uint8Array, lx: number, lz: number, col: Column, wx: number, wz: number): void {
    const h = col.height;
    const underwater = h < col.waterTop;
    const beach = !underwater && h <= col.waterTop + 1;
    let surface: BlockId = B.GRASS;
    let sub: BlockId = B.DIRT;
    if (underwater || beach) {
      surface = B.SAND;
      sub = B.SAND;
      if (underwater && this.sampler.patch.noise(wx * 0.07, wz * 0.07) > 0.35) surface = B.GRAVEL;
    } else if (col.biome === BIOME.DESERT) {
      surface = B.SAND;
      sub = B.SAND;
    } else if (col.biome === BIOME.MOUNTAINS && h > TERRAIN.STONE_PEAK_Y) {
      surface = B.STONE;
      sub = B.STONE;
    }

    data[blockIndex(lx, 0, lz)] = B.BEDROCK;
    for (let y = 1; y <= h; y++) {
      const depth = h - y;
      let id: BlockId;
      if (depth === 0) id = surface;
      else if (depth <= WORLD.DIRT_LAYERS) id = sub;
      else if (col.biome === BIOME.DESERT && depth <= WORLD.DIRT_LAYERS + 3) id = B.SANDSTONE;
      else id = y < WORLD.DEEPSLATE_BELOW_Y ? B.DEEPSLATE : B.STONE;
      data[blockIndex(lx, y, lz)] = id;
    }
    for (let y = h + 1; y <= col.waterTop; y++) data[blockIndex(lx, y, lz)] = B.WATER;

    // đường tuyết lượn nhẹ theo noise; trên đường tuyết, núi phủ tuyết mọi mặt trên (đá và cỏ)
    const snowLine = TERRAIN.SNOW_LINE_Y + Math.round(this.sampler.patch.noise(wx * 0.05 + 300, wz * 0.05) * TERRAIN.SNOW_LINE_JITTER);
    const snowy =
      (col.biome === BIOME.SNOWY && hasGrassSurface(col)) ||
      (col.biome === BIOME.MOUNTAINS && !underwater && h >= snowLine);
    if (snowy && h + 1 < CHUNK_HEIGHT) data[blockIndex(lx, h + 1, lz)] = B.SNOW_LAYER;
  }

  /** Quặng và sỏi theo cụm; cụm của chunk kề cũng được xét để liền mạch qua ranh giới. */
  private placeOres(data: Uint8Array, cx: number, cz: number): void {
    const specs = [
      { id: B.ORE_COAL, ...WORLD.ORE.coal },
      { id: B.ORE_IRON, ...WORLD.ORE.iron },
      { id: B.ORE_DIAMOND, ...WORLD.ORE.diamond },
    ];
    const x0 = cx * 16, z0 = cz * 16;
    const put = (x: number, y: number, z: number, id: BlockId): void => {
      const lx = x - x0, lz = z - z0;
      if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y < 1 || y >= CHUNK_HEIGHT) return;
      const i = blockIndex(lx, y, lz);
      if (data[i] === B.STONE) data[i] = id;
    };
    for (let ncz = cz - 1; ncz <= cz + 1; ncz++) {
      for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {
        const rng = mulberry32(hashInts(this.seed, ncx, ncz, 7));
        for (const s of specs) {
          for (let a = 0; a < s.attempts; a++) {
            let x = ncx * 16 + randInt(rng, 0, 15);
            let z = ncz * 16 + randInt(rng, 0, 15);
            let y = randInt(rng, 1, s.maxY - 1);
            for (let i = 0; i < s.cluster; i++) {
              put(x, y, z, s.id);
              const axis = randInt(rng, 0, 2);
              const dir = rng() < 0.5 ? -1 : 1;
              if (axis === 0) x += dir;
              else if (axis === 1) y = Math.max(1, Math.min(s.maxY - 1, y + dir));
              else z += dir;
            }
          }
        }
        const g = WORLD.GRAVEL;
        for (let a = 0; a < g.attempts; a++) {
          const x = ncx * 16 + randInt(rng, 0, 15);
          const z = ncz * 16 + randInt(rng, 0, 15);
          const y = randInt(rng, 1, g.maxY - 1);
          const r = g.radius;
          for (let dx = -r; dx <= r; dx++)
            for (let dy = -r; dy <= r; dy++)
              for (let dz = -r; dz <= r; dz++)
                if (dx * dx + dy * dy + dz * dz <= r * r + 0.5) put(x + dx, y + dy, z + dz, B.GRAVEL);
        }
      }
    }
  }
}
