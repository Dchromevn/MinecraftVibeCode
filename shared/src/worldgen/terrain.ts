// Sinh địa hình cơ bản: độ cao, các lớp, cát vùng thấp, quặng theo cụm.
import { WORLD } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_SIZE } from "../chunk.js";
import { SimplexNoise2D } from "../noise.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { MAP_CHUNKS, MAP_SIZE, World } from "../world.js";

const NOISE_SCALE = WORLD.NOISE_SCALE;

export function generateHeightmap(world: World, seed: number): void {
  const noise = new SimplexNoise2D(mulberry32(hashInts(seed, 1)));
  const range = WORLD.GROUND_MAX_Y - WORLD.GROUND_MIN_Y;
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const n = noise.fbm(x * NOISE_SCALE, z * NOISE_SCALE, WORLD.NOISE_OCTAVES);
      const t = Math.min(1, Math.max(0, n * 0.5 + 0.5));
      world.heightmap[z * MAP_SIZE + x] = Math.round(WORLD.GROUND_MIN_Y + t * range);
    }
  }
}

export function fillColumns(world: World): void {
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const h = world.heightAt(x, z);
      const sandy = h < WORLD.SAND_BELOW_Y;
      world.setBlock(x, 0, z, B.BEDROCK);
      for (let y = 1; y <= h; y++) {
        const depth = h - y; // 0 = mặt trên
        if (depth === 0) {
          world.setBlock(x, y, z, sandy ? B.SAND : B.GRASS);
        } else if (depth <= WORLD.DIRT_LAYERS) {
          world.setBlock(x, y, z, sandy && depth < WORLD.DIRT_LAYERS ? B.SAND : B.DIRT);
        } else {
          world.setBlock(x, y, z, B.STONE);
        }
      }
    }
  }
}

interface OreSpec {
  id: typeof B.ORE_COAL | typeof B.ORE_IRON | typeof B.ORE_DIAMOND;
  maxY: number;
  cluster: number;
  attemptsPerChunk: number;
}

const ORES: readonly OreSpec[] = [
  { id: B.ORE_COAL, maxY: WORLD.ORE.coal.maxY, cluster: WORLD.ORE.coal.cluster, attemptsPerChunk: WORLD.ORE.coal.attempts },
  { id: B.ORE_IRON, maxY: WORLD.ORE.iron.maxY, cluster: WORLD.ORE.iron.cluster, attemptsPerChunk: WORLD.ORE.iron.attempts },
  { id: B.ORE_DIAMOND, maxY: WORLD.ORE.diamond.maxY, cluster: WORLD.ORE.diamond.cluster, attemptsPerChunk: WORLD.ORE.diamond.attempts },
];

function placeCluster(world: World, rng: Rng, spec: OreSpec, x: number, y: number, z: number): void {
  let cx = x, cy = y, cz = z;
  for (let i = 0; i < spec.cluster; i++) {
    if (world.getBlock(cx, cy, cz) === B.STONE) world.setBlock(cx, cy, cz, spec.id);
    const axis = randInt(rng, 0, 2);
    const dir = rng() < 0.5 ? -1 : 1;
    if (axis === 0) cx += dir;
    else if (axis === 1) cy = Math.max(1, Math.min(spec.maxY - 1, cy + dir));
    else cz += dir;
  }
}

export function placeOres(world: World, seed: number): void {
  for (let cz = 0; cz < MAP_CHUNKS; cz++) {
    for (let cx = 0; cx < MAP_CHUNKS; cx++) {
      const rng = mulberry32(hashInts(seed, cx, cz, 7));
      for (const spec of ORES) {
        for (let a = 0; a < spec.attemptsPerChunk; a++) {
          const x = cx * CHUNK_SIZE + randInt(rng, 0, CHUNK_SIZE - 1);
          const z = cz * CHUNK_SIZE + randInt(rng, 0, CHUNK_SIZE - 1);
          const y = randInt(rng, 1, spec.maxY - 1);
          placeCluster(world, rng, spec, x, y, z);
        }
      }
    }
  }
}
