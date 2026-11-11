// Tính độ cao mặt đất, mực nước và biome cho một cột (x, z) bất kỳ, chỉ từ
// seed + tọa độ. Chiều cao là hàm liên tục của các trường noise nên ranh giới
// biome mượt; sông khoét vào hàm này, hồ áp sau cùng (lakes.ts).
import { BIOMES, RIVERS, TERRAIN, WORLD } from "../constants.js";
import { SimplexNoise2D } from "../noise.js";
import { hashInts, mulberry32 } from "../rng.js";
import { LakePlanner } from "./lakes.js";

export const BIOME = {
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
  SNOWY: 3,
  MOUNTAINS: 4,
  OCEAN: 5,
} as const;
export type BiomeId = (typeof BIOME)[keyof typeof BIOME];
export const BIOME_KEYS = ["plains", "forest", "desert", "snowy", "mountains", "ocean"] as const;

export interface Column {
  height: number; // y của block mặt đất cao nhất
  waterTop: number; // mặt nước của cột (mực biển, hoặc mặt hồ); nước lấp height+1..waterTop
  biome: BiomeId;
  land: number; // 0 = biển, 1 = đất liền
  mountain: number; // 0..1 mức nâng của núi
  river: boolean; // nằm trong lòng sông
  lake: boolean;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function noise(seed: number, salt: number): SimplexNoise2D {
  return new SimplexNoise2D(mulberry32(hashInts(seed, salt)));
}

export class TerrainSampler {
  private readonly continent: SimplexNoise2D;
  private readonly detail: SimplexNoise2D;
  private readonly hills: SimplexNoise2D;
  private readonly mountainN: SimplexNoise2D;
  private readonly ridge: SimplexNoise2D;
  private readonly temp: SimplexNoise2D;
  private readonly humid: SimplexNoise2D;
  private readonly riverN: SimplexNoise2D;
  private readonly riverWidth: SimplexNoise2D;
  readonly patch: SimplexNoise2D; // vệt sỏi đáy nước
  private readonly lakes: LakePlanner;

  constructor(readonly seed: number) {
    this.continent = noise(seed, 101);
    this.detail = noise(seed, 1);
    this.hills = noise(seed, 102);
    this.mountainN = noise(seed, 103);
    this.ridge = noise(seed, 104);
    this.temp = noise(seed, 105);
    this.humid = noise(seed, 106);
    this.patch = noise(seed, 107);
    this.riverN = noise(seed, 108);
    this.riverWidth = noise(seed, 109);
    this.lakes = new LakePlanner(this);
  }

  /** Cột hoàn chỉnh (có hồ). */
  column(x: number, z: number): Column {
    const col = this.baseColumn(x, z);
    this.lakes.apply(x, z, col);
    return col;
  }

  /** Địa hình + sông, chưa có hồ. */
  baseColumn(x: number, z: number): Column {
    const T = TERRAIN;
    const SEA = WORLD.SEA_LEVEL;
    const c = this.continent.fbm(x * T.CONTINENT_FREQ, z * T.CONTINENT_FREQ, T.CONTINENT_OCTAVES);
    const land = smoothstep(T.LAND_FROM, T.LAND_TO, c);
    const d = this.detail.fbm(x * T.DETAIL_FREQ, z * T.DETAIL_FREQ, 3);
    const hills = this.hills.fbm(x * T.HILLS_FREQ, z * T.HILLS_FREQ, 3);
    const m = this.mountainN.fbm(x * T.MOUNTAIN_FREQ, z * T.MOUNTAIN_FREQ, 3);
    const mountain = smoothstep(T.MOUNTAIN_FROM, T.MOUNTAIN_TO, m) * land;
    const ridge = 1 - Math.abs(this.ridge.fbm(x * T.RIDGE_FREQ, z * T.RIDGE_FREQ, 3));

    const oceanH = T.OCEAN_FLOOR + 3 * d;
    const landH = T.LAND_BASE + 4 * d + 4 * hills;
    let raw = oceanH + (landH - oceanH) * land + mountain * (T.MOUNTAIN_LIFT + T.MOUNTAIN_RIDGE * ridge);

    // sông: thung lũng hình chữ U khoét xuống dưới mực biển, bờ thoải, tắt dần ở núi cao
    let river = false;
    const fade = (1 - smoothstep(RIVERS.MAX_TERRAIN_Y - 6, RIVERS.MAX_TERRAIN_Y, raw)) * smoothstep(0.2, 0.6, land);
    if (fade > 0) {
      const r = Math.abs(this.riverN.fbm(x * RIVERS.FREQ, z * RIVERS.FREQ, 2));
      const wMul = 0.75 + 0.5 * (this.riverWidth.noise(x * RIVERS.WIDTH_FREQ, z * RIVERS.WIDTH_FREQ) * 0.5 + 0.5);
      const core = RIVERS.CORE * wMul;
      const bank = RIVERS.BANK * wMul;
      if (r < bank) {
        const depth = RIVERS.DEPTH_MIN + (RIVERS.DEPTH_MAX - RIVERS.DEPTH_MIN) * (d * 0.5 + 0.5);
        const bed = SEA - depth;
        const v = smoothstep(core * 0.5, bank, r); // 0 ở giữa lòng sông
        const carved = bed + (Math.max(raw, SEA + 1) - bed) * v;
        if (carved < raw) raw = raw + (carved - raw) * fade;
        river = r < core && fade > 0.5;
      }
    }
    const height = Math.max(2, Math.min(T.MAX_HEIGHT, Math.round(raw)));

    let biome: BiomeId;
    if (height < SEA && land < 0.5) biome = BIOME.OCEAN;
    else if (mountain > BIOMES.MOUNTAIN_FACTOR || height > T.MOUNTAIN_FROM_Y) biome = BIOME.MOUNTAINS;
    else {
      const t = this.temp.fbm(x * T.TEMP_FREQ, z * T.TEMP_FREQ, 2);
      const h = this.humid.fbm(x * T.HUMID_FREQ, z * T.HUMID_FREQ, 2);
      if (t < BIOMES.SNOWY_TEMP) biome = BIOME.SNOWY;
      else if (t > BIOMES.DESERT_TEMP && h < BIOMES.DESERT_HUMID) biome = BIOME.DESERT;
      else if (h > BIOMES.FOREST_HUMID) biome = BIOME.FOREST;
      else biome = BIOME.PLAINS;
    }
    return { height, waterTop: SEA, biome, land, mountain, river, lake: false };
  }
}

/** Mặt trên của cột có phải là cỏ không (để trồng cây, cỏ cao). */
export function hasGrassSurface(col: Column): boolean {
  if (col.height <= col.waterTop + 1) return false; // bờ / đáy nước: cát
  if (col.biome === BIOME.DESERT || col.biome === BIOME.OCEAN) return false;
  if (col.biome === BIOME.MOUNTAINS && col.height > TERRAIN.STONE_PEAK_Y) return false;
  return true;
}

/** Số ngẫu nhiên [0,1) xác định theo seed + tọa độ + muối. */
export function hash01(seed: number, x: number, z: number, salt: number): number {
  return hashInts(seed, x, z, salt) / 4294967296;
}
