// Quặng (DESIGN.md 2.1): cụm đi ngẫu nhiên, xét cả 8 chunk kề để cụm vắt qua ranh giới
// vẫn liền mạch; sỏi khối cầu; ngọc lục bảo từng khối lẻ trong núi.
import { WORLD } from "../constants.js";
import { B, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import { BIOME, type TerrainSampler } from "./terrainSampler.js";

interface OreSpec {
  id: BlockId;
  deepId: BlockId | null; // bản trong đá sâu (null = không thay đá sâu)
  maxY: number;
  cluster: readonly [number, number];
  attempts: number;
}

const O = WORLD.ORE;
const SPECS: readonly OreSpec[] = [
  { id: B.ORE_COAL, deepId: null, ...O.coal },
  { id: B.ORE_IRON, deepId: null, ...O.iron },
  { id: B.ORE_GOLD, deepId: B.ORE_GOLD_DEEP, ...O.gold },
  { id: B.ORE_DIAMOND, deepId: null, ...O.diamond },
];

export function placeOres(seed: number, data: Uint8Array, cx: number, cz: number): void {
  const x0 = cx * 16, z0 = cz * 16;
  const put = (x: number, y: number, z: number, id: BlockId, deepId: BlockId | null): void => {
    const lx = x - x0, lz = z - z0;
    if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y < 1 || y >= CHUNK_HEIGHT) return;
    const i = blockIndex(lx, y, lz);
    if (data[i] === B.STONE) data[i] = id;
    else if (deepId !== null && data[i] === B.DEEPSLATE) data[i] = deepId;
  };
  for (let ncz = cz - 1; ncz <= cz + 1; ncz++) {
    for (let ncx = cx - 1; ncx <= cx + 1; ncx++) {
      const rng = mulberry32(hashInts(seed, ncx, ncz, 7));
      for (const s of SPECS) {
        for (let a = 0; a < s.attempts; a++) {
          let x = ncx * 16 + randInt(rng, 0, 15);
          let z = ncz * 16 + randInt(rng, 0, 15);
          let y = randInt(rng, 1, s.maxY - 1);
          const size = randInt(rng, s.cluster[0], s.cluster[1]);
          for (let i = 0; i < size; i++) {
            put(x, y, z, s.id, s.deepId);
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
              if (dx * dx + dy * dy + dz * dz <= r * r + 0.5) put(x + dx, y + dy, z + dz, B.GRAVEL, null);
      }
    }
  }
}

/** Ngọc lục bảo: khối lẻ nên chỉ cần xét chunk của chính nó. */
export function placeEmeralds(sampler: TerrainSampler, data: Uint8Array, cx: number, cz: number): void {
  const e = WORLD.EMERALD;
  const rng = mulberry32(hashInts(sampler.seed, cx, cz, 8));
  const n = randInt(rng, e.attemptsMin, e.attemptsMax);
  for (let a = 0; a < n; a++) {
    const lx = randInt(rng, 0, 15), lz = randInt(rng, 0, 15);
    const y = randInt(rng, 1, e.maxY - 1);
    if (sampler.column(cx * 16 + lx, cz * 16 + lz).biome !== BIOME.MOUNTAINS) continue;
    const i = blockIndex(lx, y, lz);
    if (data[i] === B.STONE) data[i] = B.ORE_EMERALD;
  }
}
