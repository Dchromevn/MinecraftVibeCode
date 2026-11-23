// Thông số Vực Lửa (Giai đoạn 10a; theo Minecraft Wiki, Java, mức Thường). Thế giới thứ hai chạy song song trên server (cõi = dimension).

/** Cõi: 0 thế giới chính, 1 Vực Lửa. */
export const DIM = { OVERWORLD: 0, NETHER: 1 } as const;
export type Dim = (typeof DIM)[keyof typeof DIM];

export const NETHER = {
  SEED_SALT: 0x4e455448, // seed Vực Lửa = băm(seed thế giới, muối này) — "seed riêng" nhưng suy ra được
  SCALE: 8, // 1 block Vực Lửa = 8 block thế giới chính
  LAVA_LEVEL: 31, // biển dung nham: ô trống y ≤ 31
  BEDROCK_FLOOR: 4, BEDROCK_ROOF: 123, // đá nền đáy y 0..4, trần y 123..127 (lởm chởm)
  NOISE_XZ: 1 / 80, NOISE_Y: 1 / 36, // hang khổng lồ: noise 3D lấy mẫu mỗi 4 × 8 × 4 block rồi nội suy
  FLOOR_FADE: [2, 24] as const, CEIL_FADE: [100, 121] as const, // dưới / trên các mức này đặc dần (sàn, trần)
  SOLID_BIAS: -0.16, // cộng vào mật độ: âm = nhiều khoảng trống hơn
  SOUL_SAND_SPEED: 0.4, // đi trên cát linh hồn
  SURFACE_Y: [28, 36] as const, // bãi cát linh hồn / sỏi quanh mực dung nham
  QUARTZ: { TRIES: 16, SIZE: 14, Y: [10, 117] as const }, GOLD: { TRIES: 10, SIZE: 10, Y: [10, 117] as const },
  MAGMA: { TRIES: 4, SIZE: 30, Y: [27, 36] as const },
  // (10d2) phế tích cổ (Minecraft ore_debris_large / small): cụm to (≤ 3) y 8–24 phân bố tam giác, cụm nhỏ (≤ 2) y 8–119; không lộ ra không khí
  DEBRIS: [{ SIZE: 3, Y: [8, 24] as const, TRIANGLE: true }, { SIZE: 2, Y: [8, 119] as const, TRIANGLE: false }] as const,
  GLOWSTONE: { CELL: 12, CHANCE: 0.55, R: 3, DROP: 5 }, // chùm đá phát sáng treo trần: mỗi ô lưới 12 × 12 có thể có một chùm
  LAVA_SPRINGS: 8, // dòng dung nham chảy ra từ vách mỗi chunk
  AMBIENT_LIGHT: 0.12, // độ sáng tối thiểu (không có trời)
};

/** Cổng Vực Lửa: khung đá vỏ chai, lòng 2..21 rộng × 3..21 cao; đứng trong cổng 4 giây (quản trị viên đang bay: ngay). */
export const PORTAL = {
  MIN_W: 2, MAX_W: 21, MIN_H: 3, MAX_H: 21,
  WAIT_S: 4, // sang xong phải bước ra khỏi cổng rồi vào lại mới đi tiếp
  SEARCH_OVERWORLD: 128, SEARCH_NETHER: 16, // tìm cổng có sẵn quanh chỗ đến (Minecraft 1.16+)
  BUILD_SEARCH: 16, // không có cổng: tìm chỗ đặt cổng mới trong bán kính này, không có thì dựng nền đá vỏ chai
  NETHER_Y: [32, 112] as const, // giới hạn độ cao khi tạo cổng ở Vực Lửa
  LIGHT: 11,
};
