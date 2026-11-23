// Thông số Giai đoạn 10d1 (Minecraft Java, mức Thường — Minecraft Wiki): người lợn (trung lập khi mặc giáp vàng, đổi vàng, tức khi
// mở rương / đào vàng gần đó, nhặt đồ vàng, sợ lửa linh hồn, săn lợn rừng lửa), người lợn vệ binh, lợn rừng xác sống, biến thành xác
// sống ở thế giới chính; bảng đổi vàng piglin_bartering; thuốc kháng lửa, mũi tên quang phổ (Phát sáng), Tốc độ linh hồn.
import { B } from "./blocks.js";

export const PIGLIN = {
  CROSSBOW_CHANCE: 0.5, // người lợn lớn: 50% nỏ, 50% kiếm vàng (biến thể 1 kiếm, 2 nỏ; 0 = chưa phát)
  BABY_CHANCE: 0.2,
  ADMIRE_S: 6, // cầm vàng ngắm 6 giây rồi đổi
  WANT_R: 9, // thấy đồ vàng rơi trong 9 block thì đi nhặt
  PICK_R: 1.4,
  STARE_R: 8, // người chơi cầm đồ vàng trong 8 block: nhìn chằm chằm
  ANGER_S: 30, // bị chọc: tức 30 giây
  ALERT_R: 16, // người lợn trong 16 block (thấy người chơi) tức theo khi người đó mở rương / đào khối vàng / đánh người lợn
  AVOID_R: 8, // lửa linh hồn, đuốc linh hồn trong 8 block: tránh
  ZOMBIE_R: 6, // người lợn xác sống / lợn rừng xác sống trong 6 block: chạy
  OUTNUMBER_R: 10, // lợn rừng lửa đông hơn người lợn trong 10 block: chạy
  HUNT_R: 16, // săn lợn rừng lửa / đánh bộ xương héo trong 16 block
  HUNT_CD_S: [30, 120] as const, // săn xong: cả bầy nghỉ 30–120 giây
  SCAN_S: 1, // dò quanh mỗi giây
  POCKET: 8, // túi người lợn: tối đa 8 chồng đồ (rơi ra khi chết)
  WEAPON_DROP: 0.085,
  CROSSBOW_CD_S: 1, // nghỉ sau mỗi phát nỏ (rồi lên dây 1.25 giây như kẻ cướp)
} as const;

export const BRUTE = { DAMAGE: 13, WEAPON_DROP: 0.085 } as const;
export const ZOGLIN = { DAMAGE: [3, 8] as const, TOSS_V: 6, SCAN_S: 1 } as const;
/** Ở thế giới chính 15 giây: người lợn / người lợn vệ binh → người lợn xác sống, lợn rừng lửa → lợn rừng xác sống. */
export const ZOMBIFY = { S: 15, INTO: { piglin: "zombified_piglin", piglin_brute: "zombified_piglin", hoglin: "zoglin" } as Readonly<Record<string, string>> } as const;

/** Đồ người lợn thích (nhặt, ngắm): thỏi vàng thì đổi; mảnh vàng cất ngay; còn lại ngắm rồi giữ. Khóa không có trong game thì bỏ qua. */
export const PIGLIN_LOVED: readonly string[] = [
  "gold_ingot", "gold_nugget", "gold_block", "raw_gold", "raw_gold_block", "ore_gold", "ore_gold_deep", "nether_gold_ore", "golden_apple",
  "golden_carrot", "gold_sword", "gold_axe", "gold_pickaxe", "gold_shovel", "gold_hoe", "gold_helmet", "gold_chestplate", "gold_leggings",
  "gold_boots", "golden_horse_armor", "clock", "bell", "glistering_melon_slice",
];
export const BARTER_ITEM = "gold_ingot";
/** Đào những khối này gần người lợn thì cả bầy tức. */
export const PIGLIN_GOLD_BLOCKS: ReadonlySet<number> = new Set([B.GOLD_BLOCK, B.ORE_GOLD, B.ORE_GOLD_DEEP, B.NETHER_GOLD_ORE, B.RAW_GOLD_BLOCK]);
/** Người lợn tránh (lửa linh hồn, đuốc linh hồn). */
export const PIGLIN_REPELLENTS: ReadonlySet<number> = new Set([B.SOUL_FIRE, B.SOUL_TORCH]);

/** Bảng đổi vàng (piglin_bartering, tổng trọng số 459); ench = phù phép cấp ngẫu nhiên 1..max. */
export interface BarterEntry { item: string; w: number; min: number; max: number; ench?: { key: string; max: number } }
export const BARTER: readonly BarterEntry[] = [
  { item: "enchanted_book", w: 5, min: 1, max: 1, ench: { key: "soul_speed", max: 3 } },
  { item: "iron_boots", w: 8, min: 1, max: 1, ench: { key: "soul_speed", max: 3 } },
  { item: "fire_resistance_potion", w: 8, min: 1, max: 1 },
  { item: "fire_resistance_splash_potion", w: 8, min: 1, max: 1 },
  { item: "water_bottle", w: 10, min: 1, max: 1 },
  { item: "iron_nugget", w: 10, min: 10, max: 36 },
  { item: "ender_pearl", w: 10, min: 2, max: 4 },
  { item: "string", w: 20, min: 3, max: 9 },
  { item: "quartz", w: 20, min: 5, max: 12 },
  { item: "obsidian", w: 40, min: 1, max: 1 },
  { item: "crying_obsidian", w: 40, min: 1, max: 3 },
  { item: "fire_charge", w: 40, min: 1, max: 1 },
  { item: "leather", w: 40, min: 2, max: 4 },
  { item: "soul_sand", w: 40, min: 2, max: 8 },
  { item: "nether_brick", w: 40, min: 2, max: 8 },
  { item: "spectral_arrow", w: 40, min: 6, max: 12 },
  { item: "gravel", w: 40, min: 8, max: 16 },
  { item: "blackstone", w: 40, min: 8, max: 16 },
];

/** (10d2) Tàn tích pháo đài lợn (structure bastion_remnant): điểm đầu y 33, ghép tối đa 6 lớp trong 80 block; dò chunk / tìm trong REACH. */
export const BASTION = { START_Y: 33, MAX_DEPTH: 6, MAX_DIST: 80, REACH: 136, SALT: 0x62617374, LINEAR_MAX: 0.05 } as const;

/** Thuốc (uống / ném), mũi tên quang phổ, Tốc độ linh hồn. */
export const POTION = {
  FIRE_RES_S: 180, // uống: Kháng lửa 3 phút
  SPLASH_FIRE_RES_S: 135, // ném vỡ: 2 phút 15 giây khi trúng thẳng, xa hơn thì ít hơn (bán kính 4)
  SPLASH_R: 4,
  FIRE_RES_COLOR: 0xff9900,
  WATER_COLOR: 0x385dc6,
} as const;
export const SPECTRAL = { GLOW_S: 10 } as const; // mũi tên quang phổ: trúng thì Phát sáng 10 giây (thấy xuyên tường)
export const SOUL_SPEED = {
  BONUS: [0, 0.405, 0.51, 0.615] as readonly number[], // đi trên cát / đất linh hồn: nhanh thêm (Minecraft 0.03 × (1 + 0.35 cấp) / 0.1)
  WEAR_CHANCE: 0.04, // mỗi tick đi trên khối linh hồn: 4% ủng mất 1 độ bền
} as const;
