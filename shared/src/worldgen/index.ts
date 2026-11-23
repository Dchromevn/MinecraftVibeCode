// Sinh thế giới vô hạn theo từng chunk. Cùng seed → cùng thế giới ở client và server.
export { ChunkGenerator } from "./chunkGen.js";
export { treeCanopy, planTree, trunkLength } from "./treeShapes.js";
export type { TreePlan } from "./treeShapes.js";
export { treeKind } from "./trees.js";
export { CaveField } from "./caveField.js";
export { mineshaftCenter } from "./mineshaftCenter.js";
export { BIOME, BIOME_KEYS, TerrainSampler, hasGrassSurface, hash01, isForest, isSnowyPlains, smoothstep } from "./terrainSampler.js";
export type { BiomeId, Column } from "./terrainSampler.js";
export * from "./witchHuts.js";
export { dungeonChestAt } from "./dungeons.js";
export { structureLootAt } from "./structPlace.js";
export { structuresIn, biomeKey, uniquePlacements, type Placement } from "./structPlan.js";
export { desertPyramidTemplate } from "./desertPyramid.js";
export { mirrorCell, rotateCell, worldOf, type Piece } from "./structPaint.js";
export { piecesAt } from "./structPlace.js";
export { colKey, villageAt, villagesIn, villageTypeAt, type VillagePlan } from "./villagePlan.js";
export { jigsawIn, nearVillage } from "./jigsawStructures.js";
export { outpostAt, outpostsIn } from "./outpostPlan.js";
export { NetherGenerator } from "./netherGen.js";
export { NetherBiomes, netherSeed } from "./netherBiomes.js"; // (10b)
export { fungusCells, fungusStem } from "./hugeFungus.js";
export { makeGenerator, type WorldGenerator } from "./dimGen.js";
export { FortressLocator, type Fortress, type FortPiece } from "./fortressPlan.js"; // (10c)
export { BastionLocator, boxOf, planBastion, type Bastion } from "./bastionPlan.js"; // (10d2)
export { LOCATE_ALIAS, LOCATE_KINDS, locateOverworld, type LocateKind } from "./locate.js"; // /locate công trình thế giới chính
