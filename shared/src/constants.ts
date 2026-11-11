// Mọi con số gameplay đặt ở đây. Nguồn sự thật là DESIGN.md (mục 2, bản sinh tồn thế giới mở).
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

// 2.3 Công cụ, vũ khí, giáp
export const TOOL_TIERS = {
  wood: { durability: 60, speed: 2, swordDamage: 4 },
  stone: { durability: 130, speed: 4, swordDamage: 5 },
  iron: { durability: 250, speed: 6, swordDamage: 6 },
  diamond: { durability: 1500, speed: 8, swordDamage: 7 },
} as const;
export type ToolTier = keyof typeof TOOL_TIERS;

export const ARMOR = {
  leather: { helmet: 1, chestplate: 3, leggings: 2, boots: 1, durability: 80 },
  iron: { helmet: 2, chestplate: 6, leggings: 5, boots: 2, durability: 200 },
  diamond: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durability: 450 },
} as const;
export type ArmorTier = keyof typeof ARMOR;

export const STACK = {
  DEFAULT: 64, // block, nguyên liệu, mũi tên
  SINGLE: 1, // công cụ, vũ khí, giáp, giường, cửa
} as const;

export const BOW_DURABILITY = 384;

// 2.4–2.5 Chế tạo và lò nung
export const CRAFTING = {
  WORKBENCH_RANGE: 4, // đứng trong 4 block quanh bàn chế tạo
} as const;

export const FURNACE = {
  SMELT_TIME_S: 10,
  // số món nung được với 1 đơn vị nhiên liệu
  FUEL: { coal: 8, log: 1.5, planks: 1.5, stick: 0.5 },
  LIGHT_WHEN_LIT: 13,
} as const;

// 2.6 Người chơi và sinh tồn
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
  FALL_SAFE_BLOCKS: 3, // 1 máu cho mỗi block vượt quá (rơi vào nước thì không)
  REGEN_HUNGER_MIN: 18, // đói >= 18 thì hồi máu
  REGEN_INTERVAL_S: 4,
  STARVE_INTERVAL_S: 4, // đói = 0 thì mất máu
  STARVE_MIN_HEALTH: 1, // không chết vì đói
  SPRINT_HUNGER_MIN: 7, // đói <= 6 không chạy nhanh được
  EAT_TIME_S: 1.6,
  AIR_BUBBLES: 10,
  DROWN_DAMAGE_PER_S: 2,
  LAVA_DAMAGE_PER_S: 4,
  LAVA_BURN_AFTER_S: 4,
  DROPPED_ON_DEATH_LIFETIME_S: 300,
} as const;

/** Điểm đói hồi lại. Thịt sống 2–3, thịt chín 6–8 (Giai đoạn 4 chốt từng loại). */
export const FOOD = {
  apple: 4,
  bread: 5,
  RAW_MEAT_MIN: 2,
  RAW_MEAT_MAX: 3,
  COOKED_MEAT_MIN: 6,
  COOKED_MEAT_MAX: 8,
} as const;

export const ITEMS = {
  DROPPED_LIFETIME_S: 300,
  PICKUP_RADIUS: 1.5,
} as const;

// 2.7 Ngày đêm, sinh vật, giường
export const DAY_CYCLE = {
  LENGTH_S: 1200,
  DAY_S: 600,
  NIGHT_S: 420,
  DAWN_S: 90,
  DUSK_S: 90,
} as const;

export const MOBS = {
  SPAWN_LIGHT_MAX: 7,
  SPAWN_MIN_DIST: 24,
  SPAWN_MAX_DIST: 64,
  CAP_PER_PLAYER: 30, // trong bán kính CAP_RADIUS
  CAP_RADIUS: 64,
  DESPAWN_DIST: 128,
  ANIMAL_HERD_MIN: 2,
  ANIMAL_HERD_MAX: 4,
  zombie: { health: 20, damage: 3, chaseRange: 32 },
  skeleton: { health: 20, arrowDamageMin: 2, arrowDamageMax: 4 },
  spider: { health: 16, damage: 2 },
  pig: { health: 10 },
  cow: { health: 10 },
  chicken: { health: 4 },
  sheep: { health: 8 },
  villager: { health: 20 },
} as const;

export const BED = {
  NO_MOBS_RADIUS: 8, // ngủ được khi không có quái trong 8 block
  SKIP_NIGHT_FRACTION: 0.5, // hơn một nửa người online cùng ngủ thì tua sáng
} as const;

// 2.8 Chiến đấu
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
  PVP_DEFAULT: true, // cấu hình server PVP=on|off
  SAFE_ZONE_RADIUS: 16, // quanh điểm hồi sinh thế giới: không PvP, không phá/đặt
} as const;

// 2.10 Chất lỏng
export const LIQUID = {
  WATER_SPREAD: 7,
  LAVA_SPREAD: 3,
} as const;

// Trồng trọt (2.2, Giai đoạn 4)
export const FARMING = {
  WHEAT_STAGES: 8,
  SAPLING_GROW_MIN_S: 300,
  SAPLING_GROW_MAX_S: 600,
  FARMLAND_WATER_RADIUS: 4,
} as const;
