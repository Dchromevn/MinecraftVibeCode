// Thông số công trình Giai đoạn 7e — theo Minecraft (structure_set trong client.jar, Minecraft Wiki). Cổng đổ nát: thế giới chia
// vùng SPACING × SPACING chunk, mỗi vùng thử một chỗ ở chunk ngẫu nhiên cách mép xa ≥ SEPARATION (random_spread), theo seed + SALT.
// Kim tự tháp, lều tuyết, trại bỏ hoang, tàu đắm, tàn tích đại dương: cả thế giới mỗi loại chỉ 1–2 cái (UNIQUE — người dùng chọn
// 2026-11-15).

export const STRUCT = {
  IGLOO: {
    SALT: 14357618,
    BASEMENT_CHANCE: 0.5, // 50% có tầng hầm
    LADDER_MIN: 4, LADDER_MAX: 11, // số đoạn hầm thang (mỗi đoạn 3 block)
    MIN_Y: 6, // đáy hầm không thấp hơn
    MAX_SLOPE: 2, // chênh cao tối đa quanh chỗ đặt (chỉ ở đồng bằng tuyết)
  },
  DESERT_PYRAMID: {
    SALT: 14357617,
    SINK_MIN: 1, SINK_MAX: 3, // lún vào cát (wiki: thường bị chôn một phần)
  },
  RUINED_PORTAL: {
    SPACING: 40, SEPARATION: 15, SALT: 34222645,
    GIANT_CHANCE: 0.05, // 5% cổng lớn (3 mẫu), 95% cổng thường (10 mẫu)
    GOLD_GONE: 0.3, // khối vàng thành không khí
    CRYING: 0.15, // đá vỏ chai → đá vỏ chai khóc
    NETHERRACK_MAGMA: 0.07, // đá lửa ngục → magma (không lạnh)
    LAVA_MAGMA: 0.2, // dung nham → magma (đáy biển: luôn; vùng lạnh: dung nham → đá lửa ngục)
    UNDERGROUND_MIN_Y: 15,
    BURY_MIN: 2, BURY_MAX: 8, // nửa chôn (sa mạc): phần nhô lên khỏi mặt đất
    MOSSY: { standard: 0.2, desert: 0, swamp: 0.5, mountain: 0.2, ocean: 0.8 } as Readonly<Record<string, number>>,
  },
  CAMP: { SALT: 91231127 },
  // 7f (người dùng chọn 2026-11-15: bỏ kho báu chôn; tàu đắm và tàn tích cũng chỉ 1–2 cái mỗi loại cả thế giới)
  SHIPWRECK: {
    SALT: 165745295,
    MIN_DEPTH: 4, // biển sâu ít nhất 4 (tàu dưới đáy)
    BEACH_MAX_ABOVE: 2, // mắc cạn: bãi cao hơn mặt nước tối đa 2, có biển trong BEACH_SEA_R block
    BEACH_SEA_R: 12,
    SINK_MIN: 1, SINK_MAX: 2, // lún xuống đáy
  },
  OCEAN_RUIN: {
    SALT: 14357621,
    MIN_DEPTH: 3,
    WARM_TEMP: 0, // biển ấm / hơi ấm (nhiệt độ > 0): tàn tích đá cát; còn lại: gạch đá
    LARGE_CHANCE: 0.3, BIG_INTEGRITY: 0.9, SMALL_INTEGRITY: 0.8, // tỉ lệ block còn lại
    CLUSTER_CHANCE: 0.9, CLUSTER_MIN: 4, CLUSTER_MAX: 8, CLUSTER_R_MIN: 12, CLUSTER_R_MAX: 24, // cụm tàn tích nhỏ quanh tàn tích lớn
  },
  /** (8c) Dinh thự rừng: chỉ ở rừng sồi tối, cả thế giới 1–2 cái (UNIQUE). Minecraft: nền ≥ y 60, lấp móng đá cuội tới đất. */
  MANSION: { SALT: 10387319, MIN_Y: 60, FOUNDATION_MAX: 48, LAND_SHARE: 0.85, MAX_RISE: 8 },
  /** (người dùng chọn 2026-11-15) kim tự tháp sa mạc, lều tuyết, trại bỏ hoang: cả thế giới mỗi loại 1–2 cái, gần gốc nhất có thể. */
  UNIQUE: { COUNT_MIN: 1, COUNT_MAX: 2, MIN_R: 150, MAX_R: 4000, TRIES: 6000, MIN_GAP: 800 },
  FOUNDATION_MAX: 6, // lấp móng xuống tối đa 6 block cho chỗ đất trũng dưới công trình
} as const;
