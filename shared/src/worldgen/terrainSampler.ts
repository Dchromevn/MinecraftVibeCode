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
  SWAMP: 6, // 7b
  DARK_FOREST: 7, // 8c: rừng sồi tối (phần rừng có trường "tối" cao)
} as const;
export type BiomeId = (typeof BIOME)[keyof typeof BIOME];
export const BIOME_KEYS = ["plains", "forest", "desert", "snowy", "mountains", "ocean", "swamp", "dark_forest"] as const;

export interface Column {
  height: number; // y của block mặt đất cao nhất
  waterTop: number; // mặt nước của cột (mực biển, hoặc mặt hồ); nước lấp height+1..waterTop
  biome: BiomeId;
  land: number; // 0 = biển, 1 = đất liền
  mountain: number; // 0..1 mức nâng của núi
  river: boolean; // nằm trong lòng sông
  lake: boolean;
  temp: number; // trường nhiệt độ (chọn biome, loài cây)
  humid: number; // trường độ ẩm
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
  private readonly dark: SimplexNoise2D; // (8c) rừng sồi tối
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
    this.dark = noise(seed, 110);
    this.lakes = new LakePlanner(this);
  }

  /** Cột hoàn chỉnh (có hồ). */
  private readonly cache = new Map<number, Column>();

  /** Cột hoàn chỉnh (có hồ), có cache. Không được sửa đối tượng trả về. */
  column(x: number, z: number): Column {
    const key = (x + 0x800000) * 0x1000000 + (z + 0x800000);
    const hit = this.cache.get(key);
    if (hit) return hit;
    const col = this.baseColumn(x, z);
    this.lakes.apply(x, z, col);
    if (this.cache.size > 65536) this.cache.clear();
    this.cache.set(key, col);
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
    // (7b) đầm lầy: kéo mặt đất về sát mực nước, mượt dần ở rìa (không có vách ở ranh giới biome)
    const t = this.temp.fbm(x * T.TEMP_FREQ, z * T.TEMP_FREQ, 2);
    const h = this.humid.fbm(x * T.HUMID_FREQ, z * T.HUMID_FREQ, 2);
    const swamp = smoothstep(BIOMES.SWAMP_HUMID, BIOMES.SWAMP_HUMID + BIOMES.SWAMP_SPAN, h) *
      smoothstep(BIOMES.SNOWY_TEMP + 0.05, BIOMES.SNOWY_TEMP + 0.2, t) * (1 - smoothstep(BIOMES.DESERT_TEMP - 0.05, BIOMES.DESERT_TEMP + 0.1, t)) *
      (1 - smoothstep(0.05, 0.25, mountain)) * smoothstep(0.6, 0.85, land); // (2026-11-14, thế giới làm lại) có ở mọi khoảng cách
    // mặt đầm lầy: noise chi tiết (vệt sỏi đáy nước, tần số cao) → nhiều vũng nông xen gò đất thấp
    if (swamp > 0) raw += (SEA + 0.2 + BIOMES.SWAMP_DEPTH * this.patch.noise(x * 0.06 + 500, z * 0.06) - raw) * swamp;

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
      if (swamp > 0.5) biome = BIOME.SWAMP;
      else if (t < BIOMES.SNOWY_TEMP) biome = BIOME.SNOWY;
      else if (t > BIOMES.DESERT_TEMP && h < BIOMES.DESERT_HUMID) biome = BIOME.DESERT;
      else if (h > BIOMES.FOREST_HUMID)
        biome = this.dark.fbm(x * BIOMES.DARK_FOREST_FREQ, z * BIOMES.DARK_FOREST_FREQ, 2) > BIOMES.DARK_FOREST_MIN ? BIOME.DARK_FOREST : BIOME.FOREST;
      else biome = BIOME.PLAINS;
    }
    return { height, waterTop: SEA, biome, land, mountain, river, lake: false, temp: t, humid: h };
  }
}

/** Mặt trên của cột có phải là cỏ không (để trồng cây, cỏ cao). */
/** (7e) Đồng bằng tuyết: phần lạnh nhất của biome tuyết — phẳng, không cây (lều tuyết sinh ở đây). */
export const isSnowyPlains = (col: Column): boolean => col.biome === BIOME.SNOWY && col.temp < BIOMES.SNOWY_PLAINS_TEMP;

/** (8c) Rừng thường hoặc rừng sồi tối (cùng bảng động vật, trại bỏ hoang...). */
export const isForest = (col: Column): boolean => col.biome === BIOME.FOREST || col.biome === BIOME.DARK_FOREST;

export function hasGrassSurface(col: Column): boolean {
  if (col.biome === BIOME.SWAMP) return col.height >= col.waterTop; // đầm lầy: cỏ sát mép nước, không có bãi cát
  if (col.height <= col.waterTop + 1) return false; // bờ / đáy nước: cát
  if (col.biome === BIOME.DESERT || col.biome === BIOME.OCEAN) return false;
  if (col.biome === BIOME.MOUNTAINS && col.height > TERRAIN.STONE_PEAK_Y) return false;
  return true;
}

/** Số ngẫu nhiên [0,1) xác định theo seed + tọa độ + muối. */
export function hash01(seed: number, x: number, z: number, salt: number): number {
  return hashInts(seed, x, z, salt) / 4294967296;
}
