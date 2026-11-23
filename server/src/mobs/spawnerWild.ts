// Sinh động vật theo biome (Giai đoạn 7c; MECHANICS.md 8.1, 8.4): khi chunk tạo lần đầu chọn loài theo bảng biome
// (ANIMAL_BIOMES), biến thể theo nơi sinh (sói, thỏ, cáo, lạc đà...), gấu trắng có thể kèm gấu con; dơi và sinh vật nước
// sinh lại liên tục quanh người chơi (16–64 block) tới giới hạn riêng từng nhóm, đi xa thì tự biến mất.
import {
  B, BIOME, BIOMES, HORSE_COLORS, HORSE_MARKINGS, SPAWN_RULES, TERRAIN, TREE_MIX, mobDef, mobFits, randInt, type CellReader, type Column, type MobKey, type Rng,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

export interface WildHost {
  mobs: Mobs;
  cell: CellReader;
  rng: Rng;
  rawLight(x: number, y: number, z: number): number;
  column(x: number, z: number): Column;
  /** Ô trống đầu tiên trên mặt đất (null nếu mặt không đặt chân được / chưa tải). */
  surface(x: number, z: number): number | null;
  woolColor(): number;
  variantAt(x: number, z: number): number;
}

/** Bốc thăm theo trọng số. */
export function pick(weights: Readonly<Record<string, number>>, rng: Rng): string {
  const all = Object.entries(weights);
  let r = rng() * all.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of all) if ((r -= w) < 0) return k;
  return all[0]![0];
}

/** Khóa bảng ANIMAL_BIOMES của cột, hoặc null (đại dương). */
export function animalBiome(c: Column): string | null {
  switch (c.biome) {
    case BIOME.PLAINS: return c.temp > TREE_MIX.ACACIA_TEMP && c.humid < TREE_MIX.ACACIA_HUMID ? "plains_warm" : "plains";
    case BIOME.FOREST: case BIOME.DARK_FOREST: return "forest"; // (8c) rừng sồi tối dùng chung bảng rừng
    case BIOME.DESERT: return "desert";
    case BIOME.SNOWY: return "snowy";
    case BIOME.MOUNTAINS: return c.height >= TERRAIN.SNOW_LINE_Y ? "mountains_snow" : "mountains";
    case BIOME.SWAMP: return "swamp";
    default: return null;
  }
}

const GROUND: ReadonlySet<number> = new Set([B.GRASS, B.SNOW_LAYER, B.SAND, B.STONE, B.DIRT]);

/** Mặt đất loài key đứng được (cỏ; thỏ sa mạc: cát; dê núi tuyết: đá). */
function groundOk(key: MobKey, id: number): boolean {
  if (id === B.SAND) return key === "rabbit";
  if (id === B.STONE || id === B.DIRT) return key === "goat" || key === "llama";
  return GROUND.has(id);
}

/** Biến thể loài 7c theo biome nơi sinh. */
export function wildVariant(h: WildHost, key: MobKey, biome: string, x: number, z: number): number {
  const r = h.rng();
  switch (key) {
    case "sheep": return h.woolColor();
    case "pig": case "cow": case "chicken": return h.variantAt(x, z);
    case "rabbit": // nâu, trắng, trắng đốm, vàng, đen, muối tiêu
      if (biome === "desert") return 3;
      if (biome === "snowy" || biome === "mountains_snow") return r < 0.8 ? 1 : 2;
      return r < 0.5 ? 0 : r < 0.9 ? 5 : 4;
    case "wolf": // xám nhạt, rừng, tro, tuyết, đốm, đen, hạt dẻ, gỉ sắt, sọc
      if (biome === "forest") return r < 0.7 ? 1 : 0;
      if (biome === "snowy") return r < 0.5 ? 2 : 3;
      if (biome === "mountains") return r < 0.4 ? 5 : r < 0.8 ? 6 : 0;
      if (biome === "plains_warm") return 4;
      if (biome === "desert") return 8;
      return Math.floor(r * 9);
    case "fox": return biome === "snowy" || biome === "mountains_snow" ? 1 : 0;
    case "llama": return Math.floor(r * 4);
    case "horse": return Math.floor(r * HORSE_COLORS.length) * HORSE_MARKINGS.length + Math.floor(h.rng() * HORSE_MARKINGS.length); // (7d) màu × kiểu vết
    default: return 0;
  }
}

/** Chunk tạo lần đầu: một đàn loài chọn theo biome giữa chunk. */
export function populateChunk(h: WildHost, cx: number, cz: number): void {
  const rng = h.rng;
  if (rng() >= SPAWN_RULES.ANIMAL_CHUNK_CHANCE) return;
  const bx = cx * 16 + randInt(rng, 3, 12), bz = cz * 16 + randInt(rng, 3, 12);
  const biome = animalBiome(h.column(bx, bz)), table = biome ? SPAWN_RULES.ANIMAL_BIOMES[biome] : undefined;
  if (!biome || !table) return;
  const key = pick(table, rng) as MobKey, def = mobDef(key);
  const n = key === "polar_bear" ? randInt(rng, 1, 2) : key === "wolf" ? randInt(rng, 1, SPAWN_RULES.WOLF_PACK)
    : key === "horse" ? randInt(rng, 2, 6) : key === "donkey" ? randInt(rng, 1, 3) // (7d) đàn ngựa 2–6, lừa 1–3
    : randInt(rng, SPAWN_RULES.ANIMAL_HERD_MIN, SPAWN_RULES.ANIMAL_HERD_MAX);
  const variant = wildVariant(h, key, biome, bx, bz); // cả đàn cùng biến thể (cừu: mỗi con một màu)
  for (let i = 0, made = 0; i < n * 4 && made < n; i++) {
    const x = bx + randInt(rng, -3, 3), z = bz + randInt(rng, -3, 3);
    if (x >> 4 !== cx || z >> 4 !== cz) continue;
    const y = h.surface(x, z);
    if (y === null || !groundOk(key, h.cell(x, y - 1, z) & 255)) continue;
    if (!mobFits(h.cell, def.width, def.height, x + 0.5, y, z + 0.5)) continue;
    const baby = key === "polar_bear" && made > 0 && rng() < SPAWN_RULES.POLAR_CUB_CHANCE; // gấu thứ hai thường là gấu con
    h.mobs.spawn(key, x + 0.5, y, z + 0.5, { variant: key === "sheep" || key === "rabbit" || key === "horse" ? wildVariant(h, key, biome, x, z) : variant, baby });
    made++;
  }
}

/** Nhóm giới hạn sinh vật "môi trường" (AMBIENT_CAPS). */
function capGroup(m: Mob): string | null {
  switch (m.def.key) {
    case "bat": return "bat";
    case "glow_squid": return "glow";
    case "squid": case "dolphin": return "water";
    case "cod": case "salmon": case "pufferfish": case "tropical_fish": return "fish";
    default: return null;
  }
}

/** Mỗi tick: quanh mỗi người chơi thử sinh dơi (hang tối) và sinh vật nước, chưa đủ giới hạn nhóm. */
export function spawnAmbient(h: WildHost, players: readonly ServerPlayer[]): void {
  const R = SPAWN_RULES, rng = h.rng;
  for (const p of players) {
    const count: Record<string, number> = {};
    for (const m of h.mobs.list) {
      const g = capGroup(m);
      if (g && Math.abs(m.x - p.x) <= R.AMBIENT_MAX_DIST && Math.abs(m.z - p.z) <= R.AMBIENT_MAX_DIST) count[g] = (count[g] ?? 0) + 1;
    }
    for (let t = 0; t < R.AMBIENT_TRIES; t++) {
      const a = rng() * Math.PI * 2, d = R.AMBIENT_MIN_DIST + rng() * (R.AMBIENT_MAX_DIST - R.AMBIENT_MIN_DIST);
      const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d), y = randInt(rng, 2, 70);
      const c = h.cell(x, y, z);
      if (c < 0) continue; // chưa tải
      if ((c & 255) === B.WATER) waterSpot(h, x, y, z, count);
      else if (c === 0 && y < R.BAT_MAX_Y && (count.bat ?? 0) < R.AMBIENT_CAPS.bat!) {
        const v = h.rawLight(x, y, z);
        if (v < 0 || v >> 4 > R.BAT_MAX_LIGHT || (v & 15) > R.BAT_MAX_LIGHT || h.cell(x, y + 1, z) !== 0) continue;
        h.mobs.spawn("bat", x + 0.5, y, z + 0.5);
        count.bat = (count.bat ?? 0) + 1;
      }
    }
  }
}

/** Ô nước (x, y, z): mực phát sáng (sâu, tối), mực / cá heo / đàn cá theo nhiệt độ đại dương; sông / hồ: cá hồi, mực. */
function waterSpot(h: WildHost, x: number, y: number, z: number, count: Record<string, number>): void {
  const R = SPAWN_RULES, rng = h.rng, v = h.rawLight(x, y, z), caps = R.AMBIENT_CAPS;
  if ((h.cell(x, y + 1, z) & 255) !== B.WATER && (h.cell(x, y - 1, z) & 255) !== B.WATER) return; // vũng 1 ô: bỏ
  const add = (key: MobKey, n: number, group: string): void => {
    for (let i = 0; i < n && (count[group] ?? 0) < caps[group]!; i++) { // cả đàn cũng không vượt giới hạn nhóm
      const dx = i ? randInt(rng, -2, 2) : 0, dz = i ? randInt(rng, -2, 2) : 0;
      if ((h.cell(x + dx, y, z + dz) & 255) !== B.WATER) continue;
      h.mobs.spawn(key, x + dx + 0.5, y + 0.1, z + dz + 0.5);
      count[group] = (count[group] ?? 0) + 1;
    }
  };
  if (y < R.GLOW_SQUID_MAX_Y) {
    if (v >= 0 && v >> 4 === 0 && (v & 15) === 0 && (count.glow ?? 0) < caps.glow!) add("glow_squid", 1, "glow");
    return;
  }
  const col = h.column(x, z), ocean = col.biome === BIOME.OCEAN;
  const inSquidBand = y >= R.SQUID_Y[0]! && y <= R.SQUID_Y[1]!;
  if (rng() < R.SQUID_CHANCE) {
    if (!inSquidBand || (count.water ?? 0) >= caps.water!) return;
    if (ocean && col.temp >= BIOMES.SNOWY_TEMP && rng() < R.DOLPHIN_CHANCE / R.SQUID_CHANCE) return add("dolphin", randInt(rng, 1, 3), "water");
    return add("squid", randInt(rng, 1, 4), "water");
  }
  if ((count.fish ?? 0) >= caps.fish! || y < R.SQUID_Y[0]! - 10) return;
  const table = !ocean ? R.RIVER_FISH : col.temp < BIOMES.SNOWY_TEMP ? R.OCEAN_FISH.cold! : col.temp > BIOMES.DESERT_TEMP ? R.OCEAN_FISH.warm! : R.OCEAN_FISH.mild!;
  const key = pick(table, rng) as MobKey, school = R.FISH_SCHOOL[key] ?? [1, 1];
  add(key, randInt(rng, school[0]!, school[1]!), "fish");
}
