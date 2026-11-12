// Thông số sinh tồn và vật phẩm (Giai đoạn 4a; DESIGN.md 2.3, 2.6; MECHANICS.md 3, 5.4, 11).
// Xuất lại qua constants.ts.

/** Đói ba biến: đói (hiển thị), độ no (ẩn), hao sức (ẩn). */
export const HUNGER = {
  MAX: 20,
  START_SATURATION: 5,
  EXHAUSTION_MAX: 4, // đạt mức này: trừ 1 độ no (hết độ no thì trừ 1 đói)
  SPRINT_PER_BLOCK: 0.1,
  JUMP: 0.05,
  SPRINT_JUMP: 0.2,
  SWIM_PER_BLOCK: 0.01,
  DIG: 0.005,
  ATTACK: 0.1,
  HURT: 0.1,
  REGEN_COST: 6, // hao sức mỗi lần hồi 1 máu
  FAST_REGEN_S: 0.5, // đói 20 và còn độ no
  REGEN_MIN: 18,
  REGEN_S: 4,
  STARVE_S: 4, // đói 0: mất 1 máu mỗi 4 giây, dừng ở STARVE_MIN_HEALTH
  STARVE_MIN_HEALTH: 1,
} as const;

export interface FoodDef {
  hunger: number;
  saturation: number;
  alwaysEdible?: boolean; // ăn được cả khi đói đầy
  heal?: number; // hồi máu rải đều trong healTimeS
  healTimeS?: number;
  returns?: string; // ăn xong trả lại vật phẩm này (bát)
  single?: boolean; // không chồng được (súp)
}

/** Thức ăn có trong Giai đoạn 4 (thịt thêm ở Giai đoạn 7 theo MECHANICS.md 3). */
export const FOODS: Readonly<Record<string, FoodDef>> = {
  apple: { hunger: 4, saturation: 2.4 },
  bread: { hunger: 5, saturation: 6 },
  carrot: { hunger: 3, saturation: 3.6 },
  potato: { hunger: 1, saturation: 0.6 },
  baked_potato: { hunger: 5, saturation: 6 },
  beetroot: { hunger: 1, saturation: 1.2 },
  beetroot_soup: { hunger: 6, saturation: 7.2, returns: "bowl", single: true },
  melon_slice: { hunger: 2, saturation: 1.2 },
  golden_apple: { hunger: 4, saturation: 9.6, alwaysEdible: true, heal: 4, healTimeS: 5 },
};

/** Giáp: độ cứng mỗi món (chỉ kim cương) và giới hạn công thức giảm sát thương. */
export const ARMOR_FORMULA = {
  TOUGHNESS: { leather: 0, iron: 0, gold: 0, diamond: 2 } as Readonly<Record<string, number>>,
  MAX_POINTS: 20,
  DIVISOR: 25,
} as const;

/** Vật phẩm rơi (MECHANICS.md 11). */
export const DROPPED = {
  LIFETIME_S: 300,
  PICKUP_RADIUS: 1.5,
  PICKUP_DELAY_S: 0.5, // đồ đào ra
  THROW_PICKUP_DELAY_S: 2, // đồ vứt bằng Q
  MERGE_RADIUS: 0.5,
  SIZE: 0.25, // cạnh hộp va chạm
  GRAVITY: 16,
  DRAG: 2, // giảm vận tốc ngang (1/giây)
  THROW_SPEED: 6,
  POP_SPEED: 2.5, // văng ra khi phá block
  ATTRACT_SPEED: 8, // bay về người chơi khi đã trong tầm nhặt
  DEATH_SCATTER: 3,
} as const;

/** Chỗ xuất phát ngẫu nhiên (client, tới khi có server ở Giai đoạn 5). */
export const SPAWN = {
  RANDOM_RADIUS: 1000,
  TRIES: 200,
  MAX_HEIGHT: 95, // tránh đỉnh núi tuyết
} as const;

/**
 * Bộ đồ thử khi mới vào game (chỉ bản chạy thử npm run dev; ?kit=0 để tắt). Hotbar trước, rồi túi.
 * Đồ chỉ chồng được 1 (công cụ, cửa, giường) thì cho 1.
 */
export const STARTER_KIT: readonly (readonly [string, number])[] = [
  ["diamond_pickaxe", 1], ["diamond_axe", 1], ["diamond_shovel", 1], ["diamond_sword", 1], ["iron_hoe", 1],
  ["torch", 64], ["cobble", 64], ["planks", 64], ["bread", 64],
  ["log", 64], ["coal", 64], ["raw_iron", 64], ["iron_ingot", 64], ["carrot", 64], ["water_bucket", 1],
  ["diamond", 64], ["potato", 64], ["lava_bucket", 1], ["beetroot_seeds", 64], ["dirt", 64], ["stone", 64], ["melon_seeds", 64],
  ["seeds", 64], ["bucket", 16], ["apple", 64], ["pumpkin_seeds", 64], ["stick", 64], ["workbench", 64],
  ["furnace", 64], ["chest", 64], ["ladder", 64], ["rail", 64], ["fence", 64], ["sapling", 64], ["door", 1], ["bed", 1],
];

export const INVENTORY = {
  HOTBAR: 9,
  MAIN: 36, // 9 hotbar + 27 túi
  ARMOR: 4,
  MAX_STACK: 64,
} as const;
