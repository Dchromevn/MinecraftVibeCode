// Bộ sinh chunk theo cõi (Giai đoạn 10a): thế giới chính hoặc Vực Lửa — server và client (worker) cùng dùng.
import type { ChunkData } from "../chunk.js";
import { DIM } from "../netherConstants.js";
import { ChunkGenerator } from "./chunkGen.js";
import { NetherGenerator } from "./netherGen.js";

export interface WorldGenerator {
  generate(cx: number, cz: number): ChunkData;
}

export const makeGenerator = (seed: number, dim: number): WorldGenerator =>
  dim === DIM.NETHER ? new NetherGenerator(seed) : new ChunkGenerator(seed);
