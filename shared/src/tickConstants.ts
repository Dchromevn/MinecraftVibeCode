// Thông số random tick, trồng trọt, rương, lò nung (Giai đoạn 4b; DESIGN.md 2.2, 2.5;
// MECHANICS.md 1, 9). Xuất lại qua constants.ts.

export const RANDOM_TICK = {
  TPS: 20, // tick logic mỗi giây
  SPEED: 3, // số ô ngẫu nhiên mỗi đoạn 16x16x16 mỗi tick (chỉnh được bằng lệnh debug)
  RADIUS: 6, // chunk quanh người chơi được mô phỏng
} as const;

export const CROPS = {
  GROW_LIGHT: 9, // lúa / cây non cần ánh sáng từ mức này
  POP_LIGHT: 8, // lúa: ánh sáng dưới mức này thì bật ra
  BASE_POINTS: 1,
  FARMLAND_DRY: 1,
  FARMLAND_WET: 3,
  NEIGHBOR_DRY: 0.25,
  NEIGHBOR_WET: 0.75,
  POINTS_DIVIDEND: 25, // xác suất lớn = 1 / (floor(25 / điểm) + 1)
  FARMLAND_WATER_RADIUS: 4,
  TRAMPLE_MIN_FALL: 0.5, // rơi lên đất cày: xác suất (quãng rơi − 0.5) thành đất
  SAPLING_STAGE_CHANCE: 1 / 7,
  SAPLING_STAGES: 2,
  LEAVES_RANGE: 6, // lá tìm thân gỗ trong số bước này
  GRASS_SPREAD_LIGHT: 9,
  GRASS_TARGET_LIGHT: 4,
  GRASS_SPREAD_TRIES: 4,
} as const;

export const CONTAINERS = {
  CHEST_SLOTS: 27,
  FURNACE_SLOTS: 3, // nguyên liệu, nhiên liệu, thành phẩm
  LOOT_SALT: 99, // muối số ngẫu nhiên đồ rương hầm mỏ (seed + vị trí)
} as const;
