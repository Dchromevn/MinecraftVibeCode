// Mọi con số gameplay đặt ở đây. Nguồn sự thật là DESIGN.md (mục 2).
// Không viết cứng các số này ở nơi khác.

export const NET = {
  DEFAULT_PORT: 8080,
  SERVER_TICK_RATE: 20,
} as const;

// 2.1 Thế giới
export const WORLD = {
  CHUNK_SIZE: 16,
  CHUNK_HEIGHT: 128,
  SECTION_HEIGHT: 16, // client chia chunk thành đoạn 16x16x32 để vẽ và ẩn hang khuất
  MAP_CHUNKS: 16, // 16x16 chunk
  MAP_SIZE: 256, // block
  NOISE_OCTAVES: 3,
  GROUND_MIN_Y: 70,
  GROUND_MAX_Y: 90,
  DIRT_LAYERS: 3,
  SAND_BELOW_Y: 74,
  TREE_TRUNK_MIN: 4,
  TREE_TRUNK_MAX: 6,
  TREE_CANOPY_SIZE: 5,
  SURFACE_BLOCKS_PER_TREE: 60,
  // attempts: số cụm thử đặt mỗi chunk (chỉ đặt vào ô đá)
  ORE: {
    coal: { maxY: 100, cluster: 8, attempts: 16 },
    iron: { maxY: 70, cluster: 5, attempts: 12 },
    diamond: { maxY: 24, cluster: 3, attempts: 4 },
  },
  GRAVEL: { maxY: 100, cluster: 24, attempts: 3 },
  TALLGRASS_CHANCE: 0.12, // tỷ lệ mặt cỏ có cỏ cao
  NOISE_SCALE: 1 / 64, // tần số cơ bản của noise địa hình
} as const;

// Hang động (Giai đoạn 1b)
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
  ENTRANCE_SPACING: 60, // khoảng 1 cửa hang mỗi 60x60 block
  ENTRANCE_MAX_LENGTH: 160,
  LAVA_MAX_Y: 11, // ô bị đục có y <= 11 thành dung nham
} as const;

// Hầm mỏ bỏ hoang (Giai đoạn 1b)
export const MINESHAFT = {
  COUNT_MIN: 2,
  COUNT_MAX: 4,
  MIN_SPACING: 80,
  ROOM_Y_MIN: 24,
  ROOM_Y_MAX: 44,
  Y_MIN: 20, // hành lang không xuống dưới / lên trên khoảng này
  Y_MAX: 50,
  MAX_PIECES: 40,
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

// Ánh sáng theo block (Giai đoạn 1b), 16 mức 0..15
export const LIGHT = {
  MAX: 15,
  TORCH: 14,
  LAVA: 15,
} as const;

// Di chuyển trong block đặc biệt (dùng từ Giai đoạn 2)
export const MOVE = {
  COBWEB_FACTOR: 0.25,
} as const;

// 2.3 Cấp công cụ
export const TOOL_TIERS = {
  wood: { durability: 60, speed: 2, swordDamage: 4 },
  stone: { durability: 130, speed: 4, swordDamage: 5 },
  iron: { durability: 250, speed: 6, swordDamage: 6 },
  diamond: { durability: 1500, speed: 8, swordDamage: 7 },
} as const;
export type ToolTier = keyof typeof TOOL_TIERS;

export const ARMOR = {
  iron: { helmet: 2, chestplate: 6, leggings: 5, boots: 2, durability: 200 },
  diamond: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durability: 450 },
} as const;
export type ArmorTier = keyof typeof ARMOR;

export const STACK = {
  BLOCK: 64,
  MATERIAL: 64,
  ARROW: 16,
  TOOL: 1,
} as const;

export const BOW_DURABILITY = 384;

// 2.5 Người chơi
export const PLAYER = {
  WIDTH: 0.6,
  HEIGHT: 1.8,
  EYE_HEIGHT: 1.62,
  PHYSICS_HZ: 60,
  WALK_SPEED: 4.3,
  SPRINT_SPEED: 5.6,
  SNEAK_SPEED: 1.3,
  JUMP_HEIGHT: 1.25,
  GRAVITY: 32,
  REACH: 4.5,
  MAX_HEALTH: 20,
  MAX_HUNGER: 20,
  FALL_SAFE_BLOCKS: 3, // 1 máu cho mỗi block vượt quá
  REGEN_HUNGER_MIN: 18, // đói >= 18 thì hồi máu
  REGEN_INTERVAL_S: 4,
  STARVE_INTERVAL_S: 4, // đói = 0 thì mất máu
  SPRINT_HUNGER_MIN: 7, // đói <= 6 không chạy nhanh được
  EAT_TIME_S: 1.6,
  FOOD: { apple: 4, bread: 5 },
} as const;

// 2.6 Chiến đấu
export const COMBAT = {
  HAND_DAMAGE: 1,
  AXE_DAMAGE_PENALTY: 1, // rìu = kiếm cùng cấp trừ 1
  MELEE_RANGE: 3,
  MELEE_RANGE_SERVER: 3.5, // có dung sai
  MELEE_COOLDOWN_S: 0.6,
  MIN_COOLDOWN_DAMAGE_RATIO: 0.2,
  CRIT_MULTIPLIER: 1.5,
  KNOCKBACK_H: 0.4, // block/tick
  KNOCKBACK_V: 0.36,
  SPRINT_KNOCKBACK_MULT: 2,
  INVULN_S: 0.5,
  BOW_MAX_DRAW_S: 1,
  BOW_MIN_DAMAGE: 2,
  BOW_MAX_DAMAGE: 9,
  ARROW_MAX_SPEED: 60, // block/giây
  ARMOR_POINT_REDUCTION: 0.04,
  POSITION_HISTORY_S: 1,
  LAG_COMP_MAX_MS: 250,
} as const;

// 2.7 Luật trận đấu
export const MATCH = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 16,
  ROOM_CODE_LENGTH: 5,
  LOBBY_COUNTDOWN_S: 30,
  LOBBY_FAST_PLAYERS: 8,
  LOBBY_FAST_COUNTDOWN_S: 10,
  SPAWN_MIN_DISTANCE: 30,
  GRACE_PERIOD_S: 60,
  ZONE_INTERVAL_S: 120,
  ZONE_SHRINK_S: 30,
  ZONE_SIZES: [256, 180, 120, 70, 30, 10],
  ZONE_DAMAGE_PER_S: 1,
  ZONE_DAMAGE_FINAL_PER_S: 2,
  ZONE_FINAL_ROUNDS: 2,
  CHEST_COUNT: 40,
  EPIC_CHEST_COUNT: 5,
  RESULTS_SCREEN_S: 15,
  EMPTY_ROOM_TIMEOUT_S: 60,
  DROPPED_ITEM_LIFETIME_S: 300,
  PICKUP_RADIUS: 1.5,
} as const;
