// Mọi con số gameplay đặt ở đây. Nguồn sự thật là DESIGN.md (mục 2).
// Không viết cứng các số này ở nơi khác.

export const NET = {
  DEFAULT_PORT: 8080,
  SERVER_TICK_RATE: 20,
} as const;

// 2.1 Thế giới
export const WORLD = {
  CHUNK_SIZE: 16,
  CHUNK_HEIGHT: 64,
  MAP_CHUNKS: 16, // 16x16 chunk
  MAP_SIZE: 256, // block
  NOISE_OCTAVES: 3,
  GROUND_MIN_Y: 20,
  GROUND_MAX_Y: 40,
  DIRT_LAYERS: 3,
  SAND_BELOW_Y: 24,
  TREE_TRUNK_MIN: 4,
  TREE_TRUNK_MAX: 6,
  TREE_CANOPY_SIZE: 5,
  SURFACE_BLOCKS_PER_TREE: 60,
  // attempts: số cụm thử đặt mỗi chunk (chỉ đặt vào ô đá)
  ORE: {
    coal: { maxY: 50, cluster: 8, attempts: 8 },
    iron: { maxY: 35, cluster: 5, attempts: 6 },
    diamond: { maxY: 12, cluster: 3, attempts: 2 },
  },
  TALLGRASS_CHANCE: 0.12, // tỷ lệ mặt cỏ có cỏ cao
  NOISE_SCALE: 1 / 64, // tần số cơ bản của noise địa hình
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
