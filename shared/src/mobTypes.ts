// Bảng loài sinh vật (Giai đoạn 7a; PLAN / DESIGN mục 2.7, MECHANICS.md 8.3). Thêm loài mới ở 7b–7d: thêm một dòng
// vào MOB_DEFS (cuối danh sách: chỉ số = mã loài gửi qua mạng), một model ở client, hành vi ở server.
import { MOB_AI } from "./mobConstants.js";
import { PROFESSIONS } from "./villageConstants.js";
import type { EffectKey } from "./survivalConstants.js";

export type MobKey =
  | "zombie" | "skeleton" | "spider" | "pig" | "cow" | "sheep" | "chicken"
  // 7b
  | "creeper" | "enderman" | "endermite" | "slime" | "husk" | "drowned" | "stray" | "cave_spider" | "phantom" | "witch" | "silverfish"
  // 7c
  | "rabbit" | "wolf" | "fox" | "goat" | "polar_bear" | "llama" | "armadillo" | "bat"
  | "squid" | "glow_squid" | "cod" | "salmon" | "pufferfish" | "tropical_fish" | "dolphin"
  // 7d
  | "horse" | "donkey" | "mule"
  // 8a
  | "villager" | "iron_golem" | "cat" | "zombie_villager" | "wandering_trader" | "trader_llama" | "camel"
  // 8b
  | "pillager" | "allay"
  // 8c
  | "vindicator" | "evoker" | "vex"
  // 10b: Vực Lửa
  | "ghast" | "zombified_piglin" | "magma_cube" | "strider" | "hoglin"
  // 10c: pháo đài Vực Lửa
  | "blaze" | "wither_skeleton"
  | "piglin" | "piglin_brute" | "zoglin"; // 10d1: người lợn, người lợn vệ binh, lợn rừng xác sống
/** melee: đuổi đánh; ranged: giữ khoảng cách bắn tên; animal: đi lang thang, chạy khi bị đánh. */
export type MobBrain = "melee" | "ranged" | "spider" | "animal" | "creeper" | "enderman" | "slime" | "flyer" | "witch"
  | "wolf" | "fox" | "goat" | "bear" | "llama" | "armadillo" | "bat" | "fish" | "dolphin" // 7c
  | "horse" // 7d: ngựa, lừa, la
  | "villager" | "golem" | "cat" | "trader" // 8a
  | "allay" // 8b
  | "evoker" | "vex" // 8c
  | "ghast" | "strider" | "hoglin" // 10b (người lợn xác sống: melee trung lập; khối nhầy dung nham: slime)
  | "blaze" | "piglin" | "zoglin"; // 10c (bộ xương héo: melee); 10d1 (người lợn vệ binh: "piglin")

export interface MobDrop {
  item: string;
  min: number;
  max: number;
  chance?: number; // xác suất rơi cả nhóm (mặc định 1)
  cooked?: string; // chết khi đang cháy thì rơi món chín này
  worn?: boolean; // đồ sinh vật cầm (cung của bộ xương): rơi ra đã mòn nhiều, độ bền ngẫu nhiên như Minecraft
  player?: boolean; // (10c) chỉ rơi khi người chơi giết (que quỷ lửa, sọ bộ xương héo)
}

export interface MobDef {
  key: MobKey;
  hostile: boolean;
  brain: MobBrain;
  health: number;
  armor: number; // điểm giáp tự nhiên (xác sống 2)
  width: number;
  height: number;
  eye: number; // độ cao mắt (nhìn thấy, bắn tên)
  walk: number; // tốc độ đi lang thang
  run: number; // tốc độ khi đuổi / chạy trốn
  damage: number; // cận chiến (0 = không đánh)
  attackS: number; // hồi đòn của sinh vật (giây)
  follow: number; // tầm phát hiện người chơi
  burnsInSun: boolean;
  drops: MobDrop[];
  /** Món làm nó đi theo / cho ăn để phối giống. */
  food?: string[];
  // ---- 7b ----
  hitFx?: { fx: EffectKey; s: number }; // đánh trúng thì gây hiệu ứng (xác khô: đói, nhện hang: độc)
  arrowFx?: { fx: EffectKey; s: number }; // tên gây hiệu ứng (bộ xương băng: chậm)
  swims?: boolean; // bơi lặn trong nước (xác đuối)
  flies?: boolean; // bay (bóng ma đêm)
  sized?: boolean; // biến thể = cỡ (khối nhầy 1, 2, 4)
  lifeS?: number; // tự biến mất sau chừng này giây (mọt hư không)
  // ---- 7c ----
  aquatic?: boolean; // sống dưới nước (lên cạn thì giãy, ngạt)
  ambient?: boolean; // sinh lại liên tục theo giới hạn riêng, bị gỡ khi xa (dơi, cá, mực, cá heo)
  fallSafe?: number; // rơi dưới mức này không mất máu (dê 10)
  maxHealth?: [number, number]; // máu ngẫu nhiên lúc sinh (lạc đà không bướu 15–30)
  // ---- 10b ----
  fireproof?: boolean; // không cháy, không mất máu vì lửa / dung nham (sinh vật Vực Lửa)
  neutral?: boolean; // quái trung lập: chỉ đánh khi bị chọc (người lợn xác sống — cả bầy tức theo)
  kbResist?: number; // giảm đẩy lùi (lợn rừng lửa 0.6)
  lavaWalk?: boolean; // đi trên mặt dung nham (kẻ lội dung nham)
}

const ANIMAL = { hostile: false, brain: "animal", armor: 0, damage: 0, attackS: 0, follow: 0, burnsInSun: false } as const;

export const MOB_DEFS: readonly MobDef[] = [
  {
    key: "zombie", hostile: true, brain: "melee", health: 20, armor: 2, width: 0.6, height: 1.95, eye: 1.74, walk: 1.6, run: 3.6,
    damage: 3, attackS: 1, follow: 35, burnsInSun: true,
    drops: [{ item: "rotten_flesh", min: 0, max: 2 }, { item: "iron_ingot", min: 1, max: 1, chance: 0.0083 },
      { item: "carrot", min: 1, max: 1, chance: 0.0083 }, { item: "potato", min: 1, max: 1, chance: 0.0083 }],
  },
  {
    key: "skeleton", hostile: true, brain: "ranged", health: 20, armor: 0, width: 0.6, height: 1.99, eye: 1.74, walk: 1.6, run: 3.4,
    damage: 0, attackS: 2, follow: 16, burnsInSun: true,
    drops: [{ item: "bone", min: 0, max: 2 }, { item: "arrow", min: 0, max: 2 }, { item: "bow", min: 1, max: 1, chance: 0.085, worn: true }],
  },
  {
    key: "spider", hostile: true, brain: "spider", health: 16, armor: 0, width: 1.4, height: 0.9, eye: 0.65, walk: 2.2, run: 5.2,
    damage: 2, attackS: 1, follow: 16, burnsInSun: false,
    drops: [{ item: "string", min: 0, max: 2 }, { item: "spider_eye", min: 1, max: 1, chance: 1 / 3 }],
  },
  { key: "pig", ...ANIMAL, health: 10, width: 0.9, height: 0.9, eye: 0.7, walk: 1.2, run: 2.8,
    drops: [{ item: "porkchop", min: 1, max: 3, cooked: "cooked_porkchop" }], food: ["carrot", "potato", "beetroot"] },
  { key: "cow", ...ANIMAL, health: 10, width: 0.9, height: 1.4, eye: 1.3, walk: 1.1, run: 2.6,
    drops: [{ item: "beef", min: 1, max: 3, cooked: "cooked_beef" }, { item: "leather", min: 0, max: 2 }], food: ["wheat"] },
  { key: "sheep", ...ANIMAL, health: 8, width: 0.9, height: 1.3, eye: 1.1, walk: 1.1, run: 2.6,
    drops: [{ item: "mutton", min: 1, max: 2, cooked: "cooked_mutton" }], food: ["wheat"] },
  { key: "chicken", ...ANIMAL, health: 4, width: 0.4, height: 0.7, eye: 0.6, walk: 1.2, run: 2.6,
    drops: [{ item: "chicken", min: 1, max: 1, cooked: "cooked_chicken" }, { item: "feather", min: 0, max: 2 }],
    food: ["seeds", "beetroot_seeds", "melon_seeds", "pumpkin_seeds"] },
  // ---- Giai đoạn 7b (MECHANICS.md 8.3) ----
  { key: "creeper", hostile: true, brain: "creeper", health: 20, armor: 0, width: 0.6, height: 1.7, eye: 1.5, walk: 1.6, run: 3.2,
    damage: 0, attackS: 0, follow: 16, burnsInSun: false, drops: [{ item: "gunpowder", min: 0, max: 2 }] },
  { key: "enderman", hostile: true, brain: "enderman", health: 40, armor: 0, width: 0.6, height: 2.9, eye: 2.55, walk: 1.8, run: 6.5,
    damage: 7, attackS: 1, follow: 64, burnsInSun: false, drops: [{ item: "ender_pearl", min: 0, max: 1 }] },
  { key: "endermite", hostile: true, brain: "melee", health: 8, armor: 0, width: 0.4, height: 0.3, eye: 0.13, walk: 2, run: 4.5,
    damage: 2, attackS: 1, follow: 16, burnsInSun: false, drops: [], lifeS: 120 },
  { key: "slime", hostile: true, brain: "slime", health: 1, armor: 0, width: 0.51, height: 0.51, eye: 0.33, walk: 2.5, run: 3.5,
    damage: 0, attackS: 1, follow: 16, burnsInSun: false, drops: [{ item: "slime_ball", min: 0, max: 2 }], sized: true },
  { key: "husk", hostile: true, brain: "melee", health: 20, armor: 2, width: 0.6, height: 1.95, eye: 1.74, walk: 1.6, run: 3.6,
    damage: 3, attackS: 1, follow: 35, burnsInSun: false, drops: [{ item: "rotten_flesh", min: 0, max: 2 }], hitFx: { fx: "hunger", s: 7 } },
  { key: "drowned", hostile: true, brain: "melee", health: 20, armor: 2, width: 0.6, height: 1.95, eye: 1.74, walk: 1.6, run: 3.6,
    damage: 3, attackS: 1, follow: 35, burnsInSun: true, drops: [{ item: "rotten_flesh", min: 0, max: 2 }], swims: true },
  { key: "stray", hostile: true, brain: "ranged", health: 20, armor: 0, width: 0.6, height: 1.99, eye: 1.74, walk: 1.6, run: 3.4,
    damage: 0, attackS: 2, follow: 16, burnsInSun: true, drops: [{ item: "bone", min: 0, max: 2 }, { item: "arrow", min: 0, max: 2 },
      { item: "bow", min: 1, max: 1, chance: 0.085, worn: true }], arrowFx: { fx: "slowness", s: 30 } },
  { key: "cave_spider", hostile: true, brain: "spider", health: 12, armor: 0, width: 0.7, height: 0.5, eye: 0.45, walk: 2.2, run: 5.2,
    damage: 2, attackS: 1, follow: 16, burnsInSun: false,
    drops: [{ item: "string", min: 0, max: 2 }, { item: "spider_eye", min: 1, max: 1, chance: 1 / 3 }], hitFx: { fx: "poison", s: 7 } },
  { key: "phantom", hostile: true, brain: "flyer", health: 20, armor: 0, width: 0.9, height: 0.5, eye: 0.18, walk: 5, run: 10,
    damage: 6, attackS: 1, follow: 64, burnsInSun: true, drops: [{ item: "phantom_membrane", min: 0, max: 1 }], flies: true },
  { key: "witch", hostile: true, brain: "witch", health: 26, armor: 0, width: 0.6, height: 1.95, eye: 1.62, walk: 1.6, run: 2.2,
    damage: 0, attackS: 3, follow: 16, burnsInSun: false, drops: [{ item: "gunpowder", min: 0, max: 2, chance: 0.4 },
      { item: "spider_eye", min: 0, max: 2, chance: 0.4 }, { item: "stick", min: 0, max: 2, chance: 0.4 }] },
  { key: "silverfish", hostile: true, brain: "melee", health: 8, armor: 0, width: 0.4, height: 0.3, eye: 0.13, walk: 2.5, run: 5,
    damage: 1, attackS: 1, follow: 16, burnsInSun: false, drops: [] },
  // ---- Giai đoạn 7c (MECHANICS.md 8.3) ----
  { key: "rabbit", ...ANIMAL, health: 3, width: 0.4, height: 0.5, eye: 0.4, walk: 2, run: 4.5, food: ["dandelion", "carrot"],
    drops: [{ item: "rabbit", min: 0, max: 1, cooked: "cooked_rabbit" }, { item: "rabbit_hide", min: 0, max: 1 }, { item: "rabbit_foot", min: 1, max: 1, chance: 0.1 }] },
  { key: "wolf", ...ANIMAL, brain: "wolf", health: 8, damage: 4, attackS: 1, follow: 16, width: 0.6, height: 0.85, eye: 0.68, walk: 2, run: 5,
    drops: [], food: ["beef", "cooked_beef", "porkchop", "cooked_porkchop", "chicken", "cooked_chicken", "mutton", "cooked_mutton", "rabbit", "cooked_rabbit", "rotten_flesh"] },
  { key: "fox", ...ANIMAL, brain: "fox", health: 10, damage: 2, attackS: 1, follow: 16, width: 0.6, height: 0.7, eye: 0.4, walk: 2, run: 5, drops: [] },
  { key: "goat", ...ANIMAL, brain: "goat", health: 10, damage: 2, attackS: 1, follow: 16, width: 0.9, height: 1.3, eye: 1.1, walk: 1.6, run: 6,
    drops: [], food: ["wheat"], fallSafe: 10 },
  { key: "polar_bear", ...ANIMAL, brain: "bear", health: 30, damage: 6, attackS: 1.2, follow: 20, width: 1.4, height: 1.4, eye: 1.2, walk: 1.6, run: 4,
    drops: [{ item: "cod", min: 0, max: 2, chance: 0.75 }, { item: "salmon", min: 0, max: 2, chance: 0.25 }] },
  { key: "llama", ...ANIMAL, brain: "llama", health: 15, damage: 1, attackS: 2, follow: 16, width: 0.9, height: 1.87, eye: 1.7, walk: 1.4, run: 3,
    drops: [{ item: "leather", min: 0, max: 2 }], food: ["wheat", "hay_block"], maxHealth: [15, 30] },
  { key: "armadillo", ...ANIMAL, brain: "armadillo", health: 12, width: 0.7, height: 0.65, eye: 0.3, walk: 1.4, run: 3,
    drops: [], food: ["spider_eye"] },
  { key: "bat", ...ANIMAL, brain: "bat", health: 6, width: 0.5, height: 0.9, eye: 0.45, walk: 3, run: 4, drops: [], flies: true, ambient: true },
  { key: "squid", ...ANIMAL, brain: "fish", health: 10, width: 0.8, height: 0.8, eye: 0.4, walk: 1.5, run: 4, aquatic: true, ambient: true,
    drops: [{ item: "ink_sac", min: 1, max: 3 }] },
  { key: "glow_squid", ...ANIMAL, brain: "fish", health: 10, width: 0.8, height: 0.8, eye: 0.4, walk: 1.5, run: 4, aquatic: true, ambient: true,
    drops: [{ item: "glow_ink_sac", min: 1, max: 3 }] },
  { key: "cod", ...ANIMAL, brain: "fish", health: 3, width: 0.5, height: 0.3, eye: 0.2, walk: 2, run: 4, aquatic: true, ambient: true,
    drops: [{ item: "cod", min: 1, max: 1, cooked: "cooked_cod" }, { item: "bone", min: 1, max: 1, chance: 0.05 }] },
  { key: "salmon", ...ANIMAL, brain: "fish", health: 3, width: 0.7, height: 0.4, eye: 0.2, walk: 2, run: 4, aquatic: true, ambient: true,
    drops: [{ item: "salmon", min: 1, max: 1, cooked: "cooked_salmon" }, { item: "bone", min: 1, max: 1, chance: 0.05 }] },
  { key: "pufferfish", ...ANIMAL, brain: "fish", health: 3, width: 0.7, height: 0.7, eye: 0.35, walk: 1.5, run: 3, aquatic: true, ambient: true,
    drops: [{ item: "pufferfish", min: 1, max: 1 }, { item: "bone", min: 1, max: 1, chance: 0.05 }] },
  { key: "tropical_fish", ...ANIMAL, brain: "fish", health: 3, width: 0.5, height: 0.4, eye: 0.2, walk: 2, run: 4, aquatic: true, ambient: true,
    drops: [{ item: "tropical_fish", min: 1, max: 1 }, { item: "bone", min: 1, max: 1, chance: 0.05 }] },
  { key: "dolphin", ...ANIMAL, brain: "dolphin", health: 10, damage: 3, attackS: 1, follow: 16, width: 0.9, height: 0.6, eye: 0.3, walk: 4, run: 8,
    aquatic: true, ambient: true, drops: [{ item: "cod", min: 0, max: 1 }] },
  // ---- 7d: cưỡi được (MECHANICS.md 8.3, 8.4) — tốc độ / độ nhảy thật lấy theo từng con (RIDE) ----
  { key: "horse", ...ANIMAL, brain: "horse", health: 15, width: 1.4, height: 1.6, eye: 1.5, walk: 1.6, run: 4.5,
    drops: [{ item: "leather", min: 0, max: 2 }], food: ["wheat", "apple", "golden_apple", "hay_block"], maxHealth: [15, 30] },
  { key: "donkey", ...ANIMAL, brain: "horse", health: 15, width: 1.4, height: 1.5, eye: 1.4, walk: 1.6, run: 4,
    drops: [{ item: "leather", min: 0, max: 2 }], food: ["wheat", "apple", "golden_apple", "hay_block"], maxHealth: [15, 30] },
  { key: "mule", ...ANIMAL, brain: "horse", health: 15, width: 1.4, height: 1.6, eye: 1.5, walk: 1.6, run: 4,
    drops: [{ item: "leather", min: 0, max: 2 }], food: ["wheat", "apple", "golden_apple", "hay_block"], maxHealth: [15, 30] },
  // ---- 8a: làng (MECHANICS.md 8.3) — biến thể dân làng / dân làng xác sống = vùng × 16 + nghề (VILLAGER_TYPES, VILLAGER_PROFS) ----
  { key: "villager", ...ANIMAL, brain: "villager", health: 20, width: 0.6, height: 1.95, eye: 1.62, walk: 1.3, run: 2.8, drops: [] },
  { key: "iron_golem", ...ANIMAL, brain: "golem", health: 100, damage: 14, attackS: 1.25, follow: 16, width: 1.4, height: 2.7, eye: 2.3,
    walk: 1.1, run: 2.2, drops: [{ item: "iron_ingot", min: 3, max: 5 }, { item: "poppy", min: 0, max: 2 }] },
  { key: "cat", ...ANIMAL, brain: "cat", health: 10, damage: 3, attackS: 1, width: 0.6, height: 0.7, eye: 0.35, walk: 1.6, run: 4.5,
    drops: [{ item: "string", min: 0, max: 2 }], food: ["cod", "salmon"] },
  {
    key: "zombie_villager", hostile: true, brain: "melee", health: 20, armor: 2, width: 0.6, height: 1.95, eye: 1.74, walk: 1.6, run: 3.6,
    damage: 3, attackS: 1, follow: 35, burnsInSun: true, drops: [{ item: "rotten_flesh", min: 0, max: 2 }],
  },
  { key: "wandering_trader", ...ANIMAL, brain: "trader", health: 20, width: 0.6, height: 1.95, eye: 1.62, walk: 1.3, run: 3, drops: [] },
  { key: "trader_llama", ...ANIMAL, brain: "llama", health: 15, damage: 1, attackS: 2, follow: 16, width: 0.9, height: 1.87, eye: 1.7, walk: 1.4, run: 3,
    drops: [{ item: "leather", min: 0, max: 2 }], maxHealth: [15, 30] },
  { key: "camel", ...ANIMAL, brain: "horse", health: 32, width: 1.7, height: 2.375, eye: 2.3, walk: 1.4, run: 3.8, drops: [], food: ["cactus"] },
  // ---- 8b: kẻ cướp (nỏ; biến thể 1 = đội trưởng đeo cờ), tiểu linh (bay, nhặt đồ mang về) ----
  {
    key: "pillager", hostile: true, brain: "ranged", health: 24, armor: 0, width: 0.6, height: 1.95, eye: 1.62, walk: 1.6, run: 3.2,
    damage: 0, attackS: 2.5, follow: 32, burnsInSun: false,
    drops: [{ item: "arrow", min: 0, max: 2 }, { item: "crossbow", min: 1, max: 1, chance: 0.085, worn: true }],
  },
  { key: "allay", ...ANIMAL, brain: "allay", health: 20, width: 0.35, height: 0.6, eye: 0.36, walk: 3, run: 6, flies: true, drops: [] },
  // ---- 8c: dinh thự rừng — đao phủ (rìu sắt), pháp sư (nanh, gọi tiểu quỷ), tiểu quỷ (bay xuyên block, tự chết) ----
  {
    key: "vindicator", hostile: true, brain: "melee", health: 24, armor: 0, width: 0.6, height: 1.95, eye: 1.62, walk: 1.6, run: 4.6,
    damage: 13, attackS: 1, follow: 12, burnsInSun: false,
    drops: [{ item: "emerald", min: 0, max: 1 }, { item: "iron_axe", min: 1, max: 1, chance: 0.085, worn: true }],
  },
  {
    key: "evoker", hostile: true, brain: "evoker", health: 24, armor: 0, width: 0.6, height: 1.95, eye: 1.62, walk: 1.6, run: 3.6,
    damage: 0, attackS: 1, follow: 12, burnsInSun: false,
    drops: [{ item: "totem_of_undying", min: 1, max: 1 }, { item: "emerald", min: 0, max: 1 }],
  },
  {
    key: "vex", hostile: true, brain: "vex", health: 14, armor: 0, width: 0.4, height: 0.8, eye: 0.6, walk: 3, run: 8,
    damage: 9, attackS: 1, follow: 16, burnsInSun: false, flies: true, drops: [],
  },
  // ---- 10b: Vực Lửa (netherMobConstants.ts) ----
  {
    key: "ghast", hostile: true, brain: "ghast", health: 10, armor: 0, width: 4, height: 4, eye: 2.6, walk: 2, run: 2.5,
    damage: 0, attackS: 3, follow: 100, burnsInSun: false, flies: true, fireproof: true,
    drops: [{ item: "ghast_tear", min: 0, max: 1 }, { item: "gunpowder", min: 0, max: 2 }],
  },
  {
    key: "zombified_piglin", hostile: true, brain: "melee", health: 20, armor: 2, width: 0.6, height: 1.95, eye: 1.79, walk: 1.6, run: 4.6,
    damage: 8, attackS: 1, follow: 35, burnsInSun: false, fireproof: true, neutral: true,
    drops: [{ item: "rotten_flesh", min: 0, max: 1 }, { item: "gold_nugget", min: 0, max: 1 }, { item: "gold_ingot", min: 1, max: 1, chance: 0.025 },
      { item: "gold_sword", min: 1, max: 1, chance: 0.085, worn: true }],
  },
  { key: "magma_cube", hostile: true, brain: "slime", health: 1, armor: 0, width: 0.52, height: 0.52, eye: 0.33, walk: 2.8, run: 4,
    damage: 0, attackS: 1, follow: 16, burnsInSun: false, sized: true, fireproof: true, drops: [{ item: "magma_cream", min: 0, max: 1 }] },
  { key: "strider", ...ANIMAL, brain: "strider", health: 20, width: 0.9, height: 1.7, eye: 1.5, walk: 2.2, run: 3.5, fireproof: true, lavaWalk: true,
    drops: [{ item: "string", min: 2, max: 5 }], food: ["warped_fungus"] },
  {
    key: "hoglin", hostile: true, brain: "hoglin", health: 40, armor: 0, width: 1.4, height: 1.4, eye: 1.2, walk: 1.6, run: 4.5,
    damage: 3, attackS: 2, follow: 16, burnsInSun: false, kbResist: 0.6, food: ["crimson_fungus"],
    drops: [{ item: "porkchop", min: 2, max: 4, cooked: "cooked_porkchop" }, { item: "leather", min: 0, max: 1 }],
  },
  // ---- 10c: pháo đài Vực Lửa (fortressConstants.ts) ----
  {
    key: "blaze", hostile: true, brain: "blaze", health: 20, armor: 6, width: 0.6, height: 1.8, eye: 1.53, walk: 2.3, run: 4.6,
    damage: 6, attackS: 1, follow: 48, burnsInSun: false, flies: true, fireproof: true,
    drops: [{ item: "blaze_rod", min: 0, max: 1, player: true }],
  },
  {
    key: "wither_skeleton", hostile: true, brain: "melee", health: 20, armor: 0, width: 0.7, height: 2.4, eye: 2.1, walk: 1.6, run: 5,
    damage: 8, attackS: 1, follow: 16, burnsInSun: false, fireproof: true, hitFx: { fx: "wither", s: 10 },
    drops: [{ item: "coal", min: -1, max: 1 }, { item: "bone", min: 0, max: 2 },
      { item: "wither_skeleton_skull", min: 1, max: 1, chance: 0.025, player: true }, { item: "stone_sword", min: 1, max: 1, chance: 0.085, worn: true }],
  },
  { key: "piglin", hostile: true, brain: "piglin", health: 16, armor: 0, width: 0.6, height: 1.95, eye: 1.79, walk: 1.8, run: 4.6, // 10d1 (vũ khí, túi: mobDrops)
    damage: 8, attackS: 1, follow: 16, burnsInSun: false, drops: [] },
  { key: "piglin_brute", hostile: true, brain: "piglin", health: 50, armor: 0, width: 0.6, height: 1.95, eye: 1.79, walk: 1.8, run: 4.6,
    damage: 13, attackS: 1, follow: 16, burnsInSun: false, drops: [{ item: "gold_axe", min: 1, max: 1, chance: 0.085, worn: true }] },
  { key: "zoglin", hostile: true, brain: "zoglin", health: 40, armor: 0, width: 1.4, height: 1.4, eye: 1.2, walk: 1.6, run: 4.5,
    damage: 3, attackS: 2, follow: 16, burnsInSun: false, kbResist: 0.6, drops: [{ item: "rotten_flesh", min: 1, max: 3 }] },
];
/** (8a) Vùng của dân làng (ảnh skin Minecraft), nghề: 0 thất nghiệp, 1 ngốc, 2.. PROFESSIONS. */
export const VILLAGER_TYPES = ["plains", "desert", "savanna", "snow", "taiga"] as const;
export const VILLAGER_PROFS = ["none", "nitwit", ...PROFESSIONS] as const;
export const CAT_SKINS = ["tabby", "black", "red", "siamese", "british_shorthair", "calico", "persian", "ragdoll", "white", "jellie", "all_black"] as const;

/** Skin theo biến thể (7c): thỏ, sói (theo biome), lạc đà không bướu. */
export const RABBIT_SKINS = ["brown", "white", "white_splotched", "gold", "black", "salt"] as const;
export const WOLF_SKINS = ["", "woods", "ashen", "snowy", "spotted", "black", "chestnut", "rusty", "striped"] as const; // "" = pale
export const LLAMA_SKINS = ["creamy", "white", "brown", "gray"] as const;
/** Byte riêng từng loài (gói MOBS): sói thuần / ngồi / có giáp / màu vòng cổ; cáo ngủ; tatu cuộn; cá nóc phồng; màu hoa văn cá. */
export const MOB_EXTRA = { TAMED: 1, SITTING: 2, ARMORED: 4, SLEEPING: 1, ROLLED: 1, SADDLED: 8, CHEST: 16, CURING: 1,
  CASTING: 1, SUMMONING: 2, CHARGING: 1, // (8c) pháp sư đang làm phép (nanh / gọi tiểu quỷ), tiểu quỷ đang lao
  SHOOTING: 1, COLD: 1, ADMIRING: 2, ZOMBIFYING: 4, // (10b) ma bay há miệng (10c: quỷ lửa nạp lửa; 10d1: người lợn giương nỏ); kẻ lội lạnh; (10d1) ngắm vàng, đang thành xác sống
  HORSE_ARMOR_SHIFT: 5 } as const; // (10c) bit 5–6: giáp ngựa (1 sắt, 2 vàng, 3 kim cương)
/** (7d) Ngựa: biến thể = màu × 5 + kiểu vết. */
export const HORSE_COLORS = ["white", "creamy", "chestnut", "brown", "black", "gray", "darkbrown"] as const;
export const HORSE_MARKINGS = ["", "white", "whitefield", "whitedots", "blackdots"] as const;
/** Cưỡi được (7d). */
export const isMount = (key: MobKey): boolean =>
  key === "horse" || key === "donkey" || key === "mule" || key === "llama" || key === "trader_llama" || key === "camel" || key === "strider";

export const MOB_KEYS: readonly MobKey[] = MOB_DEFS.map((d) => d.key);
const BY_KEY = new Map(MOB_DEFS.map((d) => [d.key, d]));
export const mobDef = (key: MobKey): MobDef => BY_KEY.get(key)!;
export const mobIndex = (key: MobKey): number => MOB_KEYS.indexOf(key);

/** Loài quái của lồng sinh quái theo dữ liệu phụ 0..3 (7b). */
export const SPAWNER_MOBS: readonly MobKey[] = ["cave_spider", "zombie", "skeleton", "spider", "blaze", "magma_cube"]; // (10c) quỷ lửa: pháo đài; (10d2) khối nhầy dung nham: tàn tích

/** Sinh vật thù địch (đếm giới hạn quái, ngăn ngủ). */
export const isMonster = (def: MobDef): boolean => def.hostile;

/** Hệ số cỡ: con non 0.5; khối nhầy theo cỡ (biến thể 1, 2, 4). */
export const mobScale = (def: MobDef, baby: boolean, variant: number): number => (baby ? 0.5 : def.sized ? Math.max(1, variant) : 1);

/** Hộp va chạm sinh vật [x0, y0, z0, x1, y1, z1] (chân ở y; con non thu nhỏ theo scale). */
export function mobBox(def: MobDef, x: number, y: number, z: number, scale = 1, pad = 0): number[] {
  const hw = (def.width * scale) / 2 + pad;
  return [x - hw, y - pad, z - hw, x + hw, y + def.height * scale + pad, z + hw];
}

/** Biến thể skin theo nhiệt độ (lợn, bò, gà): 0 ôn hòa, 1 lạnh, 2 ấm. */
export const TEMPERATURE_VARIANTS = ["temperate", "cold", "warm"] as const;
export const hasTemperatureVariant = (key: MobKey): boolean => key === "pig" || key === "cow" || key === "chicken";

/** Cờ trạng thái gửi qua mạng. */
export const MOB_FLAG = { BABY: 1, SHEARED: 2, BURNING: 4, DYING: 8, ANGRY: 16, LOVE: 32, FUSE: 64, GLOWING: 128 } as const; // (10d1) Phát sáng

/** Tầm đánh: sinh vật đánh trúng khi khoảng cách ngang tâm ≤ tầm này. */
export const mobReach = (def: MobDef, targetWidth: number): number => def.width / 2 + targetWidth / 2 + MOB_AI.ATTACK_REACH_PAD;
