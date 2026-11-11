// Sinh thế giới vô hạn theo từng chunk. Cùng seed → cùng thế giới ở client và server.
export { ChunkGenerator } from "./chunkGen.js";
export { BIOME, BIOME_KEYS, TerrainSampler, hasGrassSurface, hash01, smoothstep } from "./terrainSampler.js";
export type { BiomeId, Column } from "./terrainSampler.js";
