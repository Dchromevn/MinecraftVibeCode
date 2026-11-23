// Sinh một chunk độc lập từ seed + (cx, cz). Không đọc dữ liệu chunk khác,
// nên mọi chunk sinh ra đều khớp nhau ở ranh giới.
import { TERRAIN, WORLD } from "../constants.js";
import { B, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex, emptyChunkData, type ChunkData } from "../chunk.js";
import { BIOME, TerrainSampler, hasGrassSurface, type Column } from "./terrainSampler.js";
import { placeTallGrass, placeTrees } from "./trees.js";
import { placeCacti, placeFlowers } from "./flora.js";
import { placeSprings } from "./springs.js";
import { CaveField } from "./caveField.js";
import { CaveRules } from "./caveRules.js";
import { EntrancePlanner } from "./entrances.js";
import { carveChunk } from "./caves.js";
import { MineshaftPlanner } from "./mineshaft.js";
import { placeCaveSprings } from "./caveSprings.js";
import { placeEmeralds, placeInfested, placeLapis, placeOres } from "./ores.js";
import { placeDungeons } from "./dungeons.js";
import { placeWitchHuts } from "./witchHuts.js";
import { placeStructures } from "./structPlace.js";
import { placeLilyPads, placeSugarCane } from "./flora.js";

export class ChunkGenerator {
  readonly sampler: TerrainSampler;
  readonly caves: CaveField;
  readonly rules: CaveRules;
  readonly entrances: EntrancePlanner;
  readonly mineshafts: MineshaftPlanner;

  constructor(readonly seed: number) {
    this.sampler = new TerrainSampler(seed);
    this.caves = new CaveField(seed);
    this.rules = new CaveRules(this.sampler);
    this.entrances = new EntrancePlanner(this.sampler, this.caves);
    this.mineshafts = new MineshaftPlanner(this);
  }

  /** id block + dữ liệu phụ của chunk (cx, cz). */
  generate(cx: number, cz: number): ChunkData {
    const { data, meta } = emptyChunkData();
    const cols: Column[] = [];
    for (let lz = 0; lz < 16; lz++)
      for (let lx = 0; lx < 16; lx++) {
        const col = this.sampler.column(cx * 16 + lx, cz * 16 + lz);
        cols.push(col);
        this.fillColumn(data, lx, lz, col, cx * 16 + lx, cz * 16 + lz);
      }
    placeOres(this.seed, data, cx, cz); // trước khi đục hang để quặng lộ ra trên vách
    placeEmeralds(this.sampler, data, cx, cz);
    placeLapis(this.seed, data, cx, cz); // 8b2
    placeInfested(this.sampler, data, cx, cz); // 7b
    carveChunk(this, data, cx, cz, cols);
    this.mineshafts.apply(data, meta, cx, cz); // ray, đuốc ghi dữ liệu phụ ngay khi sinh
    placeDungeons(this.sampler, data, meta, cx, cz); // 7b: hầm quái
    placeTrees(this, data, meta, cx, cz);
    placeFlowers(this.sampler, data, cx, cz, cols);
    placeCacti(this.sampler, data, cx, cz, cols);
    placeTallGrass(this, data, cx, cz, cols);
    placeLilyPads(this.sampler, data, cx, cz, cols); // 7b: lá súng trên vũng đầm lầy
    placeSugarCane(this.sampler, data, cx, cz, cols); // 8b2: mía cạnh nước
    placeWitchHuts(this.sampler, data, meta, cx, cz); // 7b: nhà phù thủy (sau cây, cỏ: dọn chỗ)
    placeStructures(this.sampler, data, meta, cx, cz); // 7e: lều tuyết, cổng đổ nát, kim tự tháp sa mạc, trại bỏ hoang
    placeSprings(this.sampler, data, cx, cz, cols);
    placeCaveSprings(this.seed, data, cx, cz, cols);
    return { data, meta };
  }

  private fillColumn(data: Uint8Array, lx: number, lz: number, col: Column, wx: number, wz: number): void {
    const h = col.height;
    const underwater = h < col.waterTop;
    const beach = !underwater && h <= col.waterTop + 1;
    let surface: BlockId = B.GRASS;
    let sub: BlockId = B.DIRT;
    if (col.biome === BIOME.SWAMP) {
      if (underwater) surface = B.DIRT; // đáy vũng đầm lầy: đất (không cát, sỏi)
    } else if (underwater || beach) {
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
}
