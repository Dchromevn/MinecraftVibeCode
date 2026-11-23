// Thông số Giai đoạn 10c (Minecraft Java, mức Thường; số đọc từ client.jar — structure_set/nether_complexes.json, structure/fortress.json,
// loot_table/entities/*.json, Blaze$BlazeAttackGoal): pháo đài Vực Lửa, quỷ lửa, bộ xương héo, hiệu ứng Héo, bóng tuyết, giáp ngựa.
// Tốc độ: block / giây (Minecraft: block / tick × 20).

/** Chỗ đặt "công trình lớn Vực Lửa": lưới ô SPACING × SPACING chunk, mỗi ô một công trình, cách mép ô ≥ SEPARATION chunk; 2/5 là
 *  pháo đài, 3/5 là tàn tích pháo đài lợn (10d — ở 10c để trống, nên sang 10d vị trí pháo đài không đổi). */
export const FORTRESS = {
  SPACING: 27, SEPARATION: 4, SALT: 30084232,
  WEIGHT_FORTRESS: 2, WEIGHT_BASTION: 3,
  START_Y: 64, // ngã tư cầu đầu tiên dựng ở y 64 rồi cả pháo đài dời vào khoảng y 48–70
  Y_RANGE: [48, 70] as const,
  MAX_DEPTH: 30, MAX_DIST: 112, // tối đa 30 lớp mảnh nối tiếp, không xa quá 112 block tính từ mảnh đầu
  MIN_Y: 10, // mảnh có đáy ≤ 10 thì bỏ
  REACH: 160, // pháo đài không vượt quá ngần này block quanh điểm đầu (dò chunk / tìm pháo đài)
  CHEST_CHANCE: 1 / 3, // hành lang rẽ trái / phải có rương
  LOCATE_RADIUS: 100, // /locate: dò tối đa 100 ô lưới quanh người chơi
} as const;

/** Quái tự sinh trong phạm vi các mảnh pháo đài (thay bảng biome): trọng số, cỡ đàn. */
export const FORTRESS_SPAWNS: readonly { key: string; w: number; min: number; max: number }[] = [
  { key: "blaze", w: 10, min: 2, max: 3 }, { key: "zombified_piglin", w: 5, min: 4, max: 4 },
  { key: "wither_skeleton", w: 8, min: 5, max: 5 }, { key: "skeleton", w: 2, min: 5, max: 5 }, { key: "magma_cube", w: 3, min: 4, max: 4 },
];

export const BLAZE = {
  FOLLOW: 48, // tầm theo dõi
  MELEE_R: 2, // mục tiêu trong 2 block: đánh cận chiến 6
  CHARGE_S: 3, // nạp lửa 3 giây (người bốc cháy) ...
  BURST: 3, BURST_GAP_S: 0.3, // ... rồi bắn 3 cầu lửa nhỏ cách nhau 0.3 giây ...
  REST_S: 5, // ... rồi nghỉ 5 giây
  FIREBALL_SPEED: 24, FIREBALL_DAMAGE: 5, FIREBALL_BURN_S: 5, FIREBALL_LIFE_S: 5, // cầu lửa nhỏ: không nổ, đốt ô trúng
  RISE_V: 3, SINK_V: -1.2, // bay lên khi mục tiêu cao hơn; còn lại hạ chậm (Minecraft: rơi × 0.6)
  HOVER_DY: 1, // giữ mắt cao hơn mắt mục tiêu chừng này
  WATER_DAMAGE: 1, // trong nước: mất 1 máu mỗi lần (≈ mỗi giây)
  SNOWBALL_DAMAGE: 3, // bóng tuyết trúng quỷ lửa
} as const;

export const WITHER_SKELETON = {
  WITHER_S: 10, // đánh trúng: Héo I 10 giây
  SKULL_CHANCE: 0.025, // sọ (chỉ khi người chơi giết; Cướp bóc +1% mỗi cấp)
} as const;

/** Hiệu ứng Héo: mất 1 máu mỗi 2 giây (cấp II: 1 giây), có thể chết; tim đen. */
export const WITHER_FX = { INTERVAL_S: [2, 1] as const } as const;

export const SNOWBALL = { STACK: 16, SPEED: 30, PER_LAYER: 1, PER_BLOCK: 4 } as const; // tuyết (lớp / khối) đào bằng xẻng ra bóng tuyết

/** Giáp ngựa (chỉ ngựa — không lừa / la): điểm giáp. Đeo bằng chuột phải vào ngựa đã thuần; kéo tháo ra (giáp trước, yên sau). */
export const HORSE_ARMOR: Readonly<Record<string, number>> = { iron_horse_armor: 5, golden_horse_armor: 7, diamond_horse_armor: 11 };
/** Thứ tự giáp ngựa gửi qua mạng (1..3; 0 = không). */
export const HORSE_ARMOR_KEYS = ["", "iron_horse_armor", "golden_horse_armor", "diamond_horse_armor"] as const;
