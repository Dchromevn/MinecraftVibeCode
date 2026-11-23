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

/** Số lượng rơi khi phá cây trồng (khoảng [min, max]). */
export const CROP_DROPS = {
  SEEDS: [1, 3], // lúa chín: hạt lúa
  ROOTS: [2, 5], // cà rốt, khoai tây chín
  BEETROOT_SEEDS: [1, 4],
  MELON_SLICES: [3, 7],
} as const satisfies Record<string, readonly [number, number]>;

/** Chất lỏng (MECHANICS.md 10). DROP: lượng mất mỗi ô lan ngang trên thang 8 (nước 1 → 7 ô, dung nham 2 → 3 ô). */
export const LIQUIDS = {
  WATER: { drop: 1, delay: 5, search: 4, infinite: true }, // 5 tick mỗi bước (~4 ô/giây), tìm chỗ trũng trong 4 ô
  LAVA: { drop: 2, delay: 30, search: 2, infinite: false }, // 30 tick mỗi bước (1.5 giây)
  MAX_UPDATES_PER_TICK: 4000, // giới hạn ô chất lỏng xử lý mỗi tick (phần còn lại dời sang tick sau)
  ITEM_FLOW_ACCEL: 6, // vật phẩm bị dòng chảy đẩy (block/giây²)
  ITEM_FLOW_MAX: 2.5, // tốc độ trôi tối đa (block/giây)
  ITEM_FLOAT_SPEED: 1, // vật phẩm nổi lên trong nước (block/giây)
} as const;

export const CONTAINERS = {
  CHEST_SLOTS: 27,
  FURNACE_SLOTS: 3, // nguyên liệu, nhiên liệu, thành phẩm
  LOOT_SALT: 99, // muối số ngẫu nhiên đồ rương hầm mỏ (seed + vị trí)
} as const;

/** (8b2) Mía: mọc tự nhiên cạnh nước (mép bờ: ô đất / cát / cỏ có nước ngay cạnh), cao 1–4; tự mọc (random tick, đủ 15 tuổi thêm
 *  một khúc) tới 3 khúc. Cụm theo ô lưới CELL × CELL, CHANCE mỗi ô. */
export const SUGAR_CANE = { GROW_AGE: 15, HEIGHT_MAX: 3, CELL: 4, CHANCE: 0.6, NATURAL: [1, 4] as readonly [number, number] };
/** (8b2) Lưu ly: cụm 4–7 viên, 3 lần mỗi chunk, y 1–40 (đá sâu: bản đá sâu); 4–9 viên mỗi quặng. */
export const LAPIS = { CLUSTER: [4, 7] as readonly [number, number], ATTEMPTS: 3, MAX_Y: 40, DROPS: [4, 9] as readonly [number, number] };
