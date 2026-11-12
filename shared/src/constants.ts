// Mọi con số gameplay đặt ở đây. Nguồn sự thật là DESIGN.md (mục 2, bản sinh tồn thế giới mở).
// Không viết cứng các số này ở nơi khác.

export const NET = {
  DEFAULT_PORT: 8080,
  SERVER_TICK_RATE: 20,
} as const;

// 2.1 Thế giới (vô hạn theo chiều ngang)
export const WORLD = {
  CHUNK_SIZE: 16,
  CHUNK_HEIGHT: 128,
  SECTION_HEIGHT: 16,
  SOFT_LIMIT: 100_000, // giới hạn mềm theo chiều ngang (block)
  SEA_LEVEL: 62,
  DIRT_LAYERS: 3,
  DEEPSLATE_BELOW_Y: 8, // đá sâu thay đá ở y < 8
  VIEW_DISTANCE_DEFAULT: 8, // bán kính tầm nhìn (chunk)
  VIEW_DISTANCE_MIN: 2,
  VIEW_DISTANCE_MAX: 16,
  UNLOAD_MARGIN: 2, // gỡ chunk ra ngoài bán kính + 2
  TREE_TRUNK_MIN: 4,
  TREE_TRUNK_MAX: 6,
  TREE_CANOPY_SIZE: 5,
  TREE_CELL: 5, // mỗi ô lưới 5x5 có tối đa 1 cây
  // attempts: số cụm thử đặt mỗi chunk; cluster: [ít nhất, nhiều nhất] ô mỗi cụm.
  // Quặng chỉ thay ô đá thường (vàng thay cả đá sâu bằng bản đá sâu).
  ORE: {
    coal: { maxY: 100, cluster: [13, 13], attempts: 20 },
    iron: { maxY: 64, cluster: [9, 9], attempts: 15 },
    gold: { maxY: 32, cluster: [4, 8], attempts: 2 },
    diamond: { maxY: 16, cluster: [3, 3], attempts: 3 },
  },
  // ngọc lục bảo: từng khối lẻ, chỉ ở cột biome núi
  EMERALD: { maxY: 100, attemptsMin: 3, attemptsMax: 8 },
  GRAVEL: { maxY: 100, radius: 2, attempts: 3 },
} as const;

// Địa hình: chiều cao là hàm liên tục của các trường noise (không phụ thuộc biome)
// nên ranh giới biome không có vách dựng đứng.
export const TERRAIN = {
  CONTINENT_FREQ: 1 / 700, // biển hay đất liền
  CONTINENT_OCTAVES: 4,
  LAND_FROM: -0.3, // continent < LAND_FROM: biển; > LAND_TO: đất liền
  LAND_TO: 0.0,
  DETAIL_FREQ: 1 / 64,
  HILLS_FREQ: 1 / 180,
  MOUNTAIN_FREQ: 1 / 320,
  MOUNTAIN_FROM: 0.15, // trường núi bắt đầu nâng địa hình
  MOUNTAIN_TO: 0.6,
  RIDGE_FREQ: 1 / 90,
  OCEAN_FLOOR: 52, // ± 3
  LAND_BASE: 66, // ± 8
  MOUNTAIN_LIFT: 20, // + tối đa 18 theo đỉnh núi
  MOUNTAIN_RIDGE: 18,
  MAX_HEIGHT: 115,
  TEMP_FREQ: 1 / 800,
  HUMID_FREQ: 1 / 700,
  MOUNTAIN_FROM_Y: 88, // cao hơn: luôn coi là núi (không có sườn cát/cỏ dựng đứng)
  STONE_PEAK_Y: 92, // núi cao hơn: đá lộ ra
  SNOW_LINE_Y: 90, // núi từ đây trở lên: tuyết phủ mọi mặt trên (đá và cỏ)
  SNOW_LINE_JITTER: 2, // đường tuyết lượn ±2 block cho tự nhiên
} as const;

// Nước tự nhiên trên mặt đất (2.1). Nước sinh sẵn phải "tĩnh": không ô nước nào
// có không khí bên cạnh/bên dưới, trừ mạch nước (nguồn chảy ở Giai đoạn 4).
export const RIVERS = {
  FREQ: 1 / 420, // trường noise sông; nơi |noise| gần 0 là lòng sông
  WIDTH_FREQ: 1 / 260, // độ rộng thay đổi dọc theo sông
  CORE: 0.022, // nửa bề rộng lòng sông (đơn vị noise), nhân hệ số 0.75–1.25
  BANK: 0.075, // bờ thoải tới đây
  DEPTH_MIN: 3,
  DEPTH_MAX: 5,
  MAX_TERRAIN_Y: 85, // không cắt qua núi cao hơn
} as const;

export const LAKES = {
  REGION: 128, // khoảng 1 hồ mỗi vùng 128x128
  CHANCE: 0.8, // xác suất vùng có hồ (nếu chỗ chọn đủ bằng phẳng)
  RADIUS_MIN: 4, // đường kính 8–20
  RADIUS_MAX: 10,
  MAX_RELIEF: 5, // chênh cao tối đa trên bờ để coi là đất bằng
  TRIES: 8, // số vị trí thử trong mỗi vùng
  DEPTH_MAX: 4,
} as const;

export const SPRINGS = {
  MOUNTAIN_CHANCE: 0.3, // xác suất mỗi chunk núi có một mạch nước trên vách
  MIN_SURFACE_Y: 85, // chỉ ở biome núi, mặt đất từ y = 85
  MIN_DROP: 4, // vách cao ít nhất 4 block
} as const;

// Biome: mật độ cây (xác suất mỗi ô lưới 5x5), cỏ cao và bí ngô (xác suất mỗi ô cỏ)
export const BIOMES = {
  plains: { treeChance: 0.12, grassChance: 0.2, pumpkinChance: 0.002 },
  forest: { treeChance: 0.85, grassChance: 0.1, pumpkinChance: 0.002 },
  desert: { treeChance: 0, grassChance: 0, pumpkinChance: 0 },
  snowy: { treeChance: 0.15, grassChance: 0, pumpkinChance: 0 },
  mountains: { treeChance: 0.12, grassChance: 0.05, pumpkinChance: 0 },
  ocean: { treeChance: 0, grassChance: 0, pumpkinChance: 0 },
  // ngưỡng chọn biome
  SNOWY_TEMP: -0.3,
  DESERT_TEMP: 0.3,
  DESERT_HUMID: 0.0,
  FOREST_HUMID: 0.1,
  MOUNTAIN_FACTOR: 0.55,
  MOUNTAIN_TREE_MAX_Y: 88,
} as const;

// Hang động (2.1, Giai đoạn 2b). Sinh theo từng chunk, liền mạch qua ranh giới.
export const CAVES = {
  NOISE_GRID: 4, // lấy mẫu noise 3D mỗi 4 block rồi nội suy tuyến tính
  NOODLE_FREQ: 1 / 56, // hang "sợi mì": giao của hai mặt noise gần 0
  NOODLE_Y_STRETCH: 1.6, // >1: đường hầm chạy ngang nhiều hơn dọc
  NOODLE_RADIUS: 0.085,
  CHEESE_FREQ: 1 / 72, // hang "phô mai": hốc rộng
  CHEESE_THRESHOLD: 0.56,
  CHEESE_MAX_Y: 64,
  SURFACE_MARGIN: 7, // không đục trong 7 block dưới mặt đất (trừ cửa hang)
  FADE_BAND: 8, // hang thu hẹp dần trong dải này thay vì bị cắt phẳng
  LAVA_MAX_Y: 11, // ô bị đục có y <= 11 thành dung nham
  // cửa hang: mỗi vùng 64x64 có thể có một đường hầm đào chéo từ mặt đất xuống
  ENTRANCE_REGION: 64,
  ENTRANCE_CHANCE: 0.85,
  ENTRANCE_MAX_STEPS: 160,
  ENTRANCE_MAX_REACH: 60, // không đi xa điểm xuất phát quá 60 block theo chiều ngang
  // hồ ngầm: mỗi vùng 64x64 có thể có mực nước riêng trong khoảng y = 20–50
  LAKE_REGION: 64,
  LAKE_CHANCE: 0.35,
  LAKE_MIN_Y: 20,
  LAKE_MAX_Y: 50,
  LAKE_DAM: 2, // gần biên vùng hồ không đục dưới mực nước (giữ nước không tràn)
  // mạch nước / dung nham trên trần hang
  SPRING_WATER_CHANCE: 0.7, // mỗi chunk có hang
  SPRING_LAVA_CHANCE: 0.25,
  SPRING_LAVA_MAX_Y: 30,
} as const;

// Hầm mỏ bỏ hoang (2.9). Lập kế hoạch theo vùng, mỗi chunk đặt phần thuộc về nó.
export const MINESHAFT = {
  REGION: 160, // khoảng 1 hệ thống mỗi vùng 160x160
  CHANCE: 0.9,
  CENTER_TRIES: 5, // tâm rơi vào biển / đất mỏng thì thử lại tối đa 4 chỗ khác
  CENTER_MARGIN: 16, // tâm cách biên vùng ít nhất 16 block
  ROOM_Y_MIN: 24,
  ROOM_Y_MAX: 44,
  Y_MIN: 20, // hành lang không xuống dưới / lên trên khoảng này
  Y_MAX: 50,
  MIN_COVER: 8, // luôn nằm dưới mặt đất khô ít nhất 8 block (không thủng đáy nước)
  MAX_PIECES: 70,
  MAX_RADIUS: 72,
  CORRIDOR_MIN: 8,
  CORRIDOR_MAX: 25,
  SUPPORT_SPACING_MIN: 4,
  SUPPORT_SPACING_MAX: 5,
  RAIL_CHANCE: 0.7, // 30% bị thiếu
  TORCH_CHANCE: 0.2, // mỗi khung chống
  WEB_CHANCE: 0.04,
  WEB_CHANCE_JUNCTION: 0.3,
  DEAD_END_CHEST_CHANCE: 0.5,
} as const;

// Ánh sáng theo block (Giai đoạn 2b), 16 mức 0..15
export const LIGHT = {
  MAX: 15,
  TORCH: 14,
  LAVA: 15,
} as const;

// Di chuyển trong block đặc biệt (dùng từ Giai đoạn 2)
export const MOVE = {
  COBWEB_FACTOR: 0.25,
} as const;

// Thông số lối chơi (mục 2.3–2.10) tách sang gameplay.ts cho file ngắn gọn.
export * from "./gameplay.js";
export * from "./survivalConstants.js";
export * from "./tickConstants.js";
