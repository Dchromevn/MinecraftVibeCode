// Thông số 4 biome Vực Lửa thêm ở Giai đoạn 10b (theo Minecraft Wiki, Java): chọn biome kiểu "multi-noise" như Minecraft
// (2 noise nhiệt độ / độ ẩm; mỗi biome một điểm + độ lệch, chọn điểm gần nhất), khối mặt, đặc điểm (nấm khổng lồ, dây leo, cột
// bazan, hóa thạch, vũng dung nham), màu sương, bảng sinh quái theo biome.

/** Biome Vực Lửa (chỉ số gửi / lưu: đừng đổi thứ tự). */
export const NB = { WASTES: 0, SOUL_VALLEY: 1, CRIMSON: 2, WARPED: 3, BASALT: 4 } as const;
export type NetherBiome = (typeof NB)[keyof typeof NB];

export const NETHER_BIOMES = {
  SEED_SALT: 0x42494f4d,
  FREQ: 1 / 190, // noise nhiệt độ / độ ẩm (Vực Lửa nhỏ hơn 8 lần: biome rộng ~100–300 block)
  OCTAVES: 2,
  SCALE: 0.85, // nhân giá trị noise: đo trên 4 seed được hoang mạc 35.8%, thung lũng 17.6%, rừng đỏ 22.9%, cong vênh 7.5%, bazan 16.3%
  // (Minecraft: 36.3 / 17.1 / 22.2 / 8.5 / 15.9)
  /** [nhiệt độ, độ ẩm, độ lệch] như MultiNoiseBiomeSourceParameterList.NETHER. */
  POINTS: [[0, 0, 0], [0, -0.5, 0], [0.4, 0, 0], [0, 0.5, 0.375], [-0.5, 0, 0.175]] as readonly (readonly [number, number, number])[],
  /** Màu sương / trời (Minecraft): hoang mạc, thung lũng cát linh hồn, rừng đỏ thẫm, rừng cong vênh, đồng bằng bazan. */
  FOG: [0x330808, 0x1b4745, 0x330303, 0x1a051a, 0x685f70] as readonly number[],
};

/** Đặc điểm địa hình theo biome. */
export const NETHER_FEATURES = {
  // nấm khổng lồ (rừng đỏ thẫm / cong vênh): lưới ô CELL × CELL, mỗi ô CHANCE có một cây (vắt qua chunk vẫn liền)
  FUNGUS: {
    CELL: 7, CHANCE: 0.85,
    STEM: [4, 13] as const, DOUBLE_CHANCE: 1 / 12, // thân 4–13, 1/12 gấp đôi
    THICK_CHANCE: 0.06, // thân 3 × 3 (chỉ khi sinh thế giới)
    BONE_MEAL_CHANCE: 0.4, // bột xương lên nấm trên đúng loại nylium
    SHROOM: 0.05, WART_INNER: 0.1, // trong mũ: đèn nấm, khối mụn
    VINE: 0.15, // dưới vành mũ nấm đỏ thẫm: dây leo rủ (dài 1–3)
  },
  VEGETATION: { CRIMSON: 0.3, WARPED: 0.3, SPROUTS: 0.12 }, // xác suất mỗi ô nylium có cây nhỏ (rễ / nấm nhỏ / mầm)
  // trọng số cây nhỏ (Minecraft crimson_forest_vegetation / warped_forest_vegetation)
  CRIMSON_PLANTS: { crimson_roots: 87, crimson_fungus: 11, warped_fungus: 1 } as Readonly<Record<string, number>>,
  WARPED_PLANTS: { warped_roots: 85, warped_fungus: 13, crimson_roots: 1, crimson_fungus: 1 } as Readonly<Record<string, number>>,
  VINES: { TRIES: 8, LEN: [1, 8] as const, SPREAD: 3, PER: 8 }, // cụm dây leo rủ (đỏ thẫm) / xoắn (cong vênh) mỗi chunk
  SOUL_FIRE: 0.006, // lửa linh hồn trên mặt cát / đất linh hồn (thung lũng)
  BASALT_PILLAR: { TRIES: 2, MAX: 40 }, // cột bazan trần → sàn (thung lũng)
  FOSSIL_CHANCE: 0.3, // hóa thạch khối xương mỗi chunk (thung lũng)
  DELTA: { TRIES: 14, R: [1, 3] as const }, // vũng dung nham viền magma (đồng bằng bazan)
  COLUMNS: { SMALL: 6, SMALL_H: [1, 4] as const, LARGE: 2, LARGE_H: [4, 10] as const }, // cột bazan đứng
  BLOBS: { TRIES: 10, SIZE: 30 }, // cục bazan / đá đen trong đá lửa ngục (đồng bằng bazan)
  GLOWSTONE_SOUL: 0.3, // thung lũng: chùm đá phát sáng chỉ còn 30%
};

/** Sinh quái theo biome (Minecraft Java: trọng số, cỡ đàn); (10d1) người lợn ở hoang mạc và rừng đỏ thẫm. */
export const NETHER_SPAWNS: readonly (readonly { key: string; w: number; min: number; max: number }[])[] = [
  [{ key: "zombified_piglin", w: 100, min: 4, max: 4 }, { key: "ghast", w: 50, min: 1, max: 1 }, { key: "magma_cube", w: 2, min: 4, max: 4 },
    { key: "enderman", w: 1, min: 4, max: 4 }, { key: "piglin", w: 15, min: 4, max: 4 }],
  [{ key: "skeleton", w: 20, min: 5, max: 5 }, { key: "ghast", w: 50, min: 1, max: 1 }, { key: "enderman", w: 1, min: 4, max: 4 }],
  [{ key: "zombified_piglin", w: 1, min: 2, max: 4 }, { key: "hoglin", w: 9, min: 3, max: 4 }, { key: "piglin", w: 5, min: 3, max: 4 }],
  [{ key: "enderman", w: 1, min: 4, max: 4 }],
  [{ key: "magma_cube", w: 100, min: 2, max: 5 }, { key: "ghast", w: 40, min: 1, max: 1 }],
];
