// Thông số lối chơi (DESIGN.md mục 2.3–2.10). Xuất lại qua constants.ts.

// 2.3 Công cụ, vũ khí, giáp
// level: cấp đào. Đào được block có minTier khi level của công cụ >= level của minTier.
// Vàng đào rất nhanh, mau hỏng, nhưng chỉ đào được như gỗ (level 0).
export const TOOL_TIERS = {
  wood: { durability: 59, speed: 2, swordDamage: 4, level: 0 },
  stone: { durability: 131, speed: 4, swordDamage: 5, level: 1 },
  iron: { durability: 250, speed: 6, swordDamage: 6, level: 2 },
  gold: { durability: 32, speed: 12, swordDamage: 4, level: 0 },
  diamond: { durability: 1561, speed: 8, swordDamage: 7, level: 3 },
} as const;

// Đào block (MECHANICS.md mục 4): tiến độ mỗi tick = tốc_độ / độ_cứng / (30 nếu ra đồ, ngược lại 100)
export const DIGGING = {
  TICKS_PER_S: 20,
  HAND_SPEED: 1,
  SWORD_COBWEB_SPEED: 15,
  HARVEST_DIVISOR: 30,
  NO_HARVEST_DIVISOR: 100,
  INSTANT_RATIO: 30, // tốc_độ / độ_cứng từ mức này: phá ngay
  UNDERWATER_DIVISOR: 5, // đầu chìm trong nước
  AIRBORNE_DIVISOR: 5, // không đứng trên đất
  COOLDOWN_S: 0.25, // 5 tick chờ sau khi phá xong (trừ block phá ngay)
  CRACK_STAGES: 5,
  PLACE_REPEAT_S: 0.25, // giữ chuột phải: đặt lặp lại
} as const;
export type ToolTier = keyof typeof TOOL_TIERS;

export const ARMOR = {
  leather: { helmet: 1, chestplate: 3, leggings: 2, boots: 1, durability: 80 },
  iron: { helmet: 2, chestplate: 6, leggings: 5, boots: 2, durability: 200 },
  gold: { helmet: 2, chestplate: 5, leggings: 3, boots: 1, durability: 110 },
  diamond: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durability: 450 },
} as const;
export type ArmorTier = keyof typeof ARMOR;

export const STACK = {
  DEFAULT: 64, // block, nguyên liệu, mũi tên
  SINGLE: 1, // công cụ, vũ khí, giáp, giường, cửa, xô có nước / dung nham
  BUCKET: 16, // xô rỗng
} as const;

export const BOW_DURABILITY = 384;

// 2.4–2.5 Chế tạo và lò nung
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
  WALK_SPEED: 4.317,
  SPRINT_SPEED: 5.612,
  SNEAK_SPEED: 1.295,
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
  AIR_BUBBLES: 10, // hiển thị (Giai đoạn 4); dưỡng khí thật tính bằng giây
  AIR_S: 15, // dưỡng khí khi đầu chìm
  AIR_REFILL_S: 3.75, // ngoi lên: hồi đầy trong thời gian này
  DROWN_DAMAGE: 2, // mỗi giây khi hết dưỡng khí
  LAVA_DAMAGE: 4, // mỗi lần chạm (miễn sát thương 0.5 giây giữa các lần)
  LAVA_BURN_S: 15, // cháy, đếm lại mỗi tick còn trong dung nham
  RESPAWN_INVULN_S: 3,
  DROPPED_ON_DEATH_LIFETIME_S: 300,
  // Thông số di chuyển bổ sung (DESIGN.md 2.6, Giai đoạn 3)
  STEP_HEIGHT: 0.6, // tự bước lên bậc thấp hơn mức này
  TERMINAL_VELOCITY: 78.4, // block/giây
  SNEAK_HEIGHT: 1.5, // hộp va chạm khi ngồi
  SNEAK_EYE_HEIGHT: 1.27,
  SNEAK_EDGE: 0.625, // ngồi: không bước khỏi mép cao từ 5/8 block
  SPRINT_JUMP_BOOST: 2.8, // nhảy lúc chạy nhanh: đẩy thêm về phía trước (block/giây) → chạy+nhảy ≈ 7.1
  AIR_DRAG: 2, // trên không mà nhanh hơn vận tốc mong muốn: giảm dần theo hệ số này (1/giây)
  AIR_SPEED_FACTOR: 0.85, // vận tốc mong muốn khi ở trên không so với trên đất
  FLY_SPEED: 10.9, // bay debug; giữ Shift nhanh gấp 3
  SPRINT_DOUBLE_TAP_S: 0.3, // nhấn đúp W trong khoảng này thì chạy nhanh (đến khi nhả W)
  LADDER_UP: 2.4,
  LADDER_DOWN: 3,
  SWIM_UP: 3,
  SWIM_SINK: 2,
  WATER_SPEED_FACTOR: 0.5, // đi ngang trong nước
  LAVA_SPEED_FACTOR: 0.3, // đi ngang trong dung nham
  LAVA_VERTICAL_FACTOR: 0.5, // nổi/chìm trong dung nham so với nước
  FIRE_DAMAGE: 1, // mỗi giây khi đang cháy
  // độ "bám" vận tốc ngang về vận tốc mong muốn (1/giây): trên đất, trên không, trong chất lỏng
  ACCEL_GROUND: 20,
  ACCEL_AIR: 5,
  ACCEL_LIQUID: 8,
  SWIM_ACCEL: 6, // tốc độ đổi vận tốc dọc khi bơi (1/giây)
  FOV: 70, // độ, góc nhìn dọc
  SPRINT_FOV_FACTOR: 1.1, // chạy nhanh: FOV rộng thêm 10%
  VIEW_BOB: 0.06, // biên độ lắc camera khi đi (block)
} as const;

// Thức ăn, đói, giáp, vật phẩm rơi: xem survivalConstants.ts

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

// 2.9 Rương hầm mỏ (Giai đoạn 4 điền khi chunk được sinh).
// Mỗi rương rút ROLLS lượt; mỗi lượt chọn một món theo weight, số lượng min–max.
export const MINESHAFT_LOOT = {
  ROLLS_MIN: 3,
  ROLLS_MAX: 6,
  ENTRIES: [
    { item: "bread", weight: 15, min: 1, max: 3 },
    { item: "coal", weight: 10, min: 3, max: 8 },
    { item: "raw_iron", weight: 10, min: 1, max: 5 },
    { item: "rail", weight: 10, min: 4, max: 8 },
    { item: "seeds", weight: 10, min: 2, max: 4 },
    { item: "beetroot_seeds", weight: 5, min: 2, max: 4 },
    { item: "melon_seeds", weight: 4, min: 2, max: 4 },
    { item: "pumpkin_seeds", weight: 4, min: 2, max: 4 },
    { item: "carrot", weight: 4, min: 1, max: 3 },
    { item: "potato", weight: 4, min: 1, max: 3 },
    { item: "raw_gold", weight: 6, min: 1, max: 3 },
    { item: "gold_ingot", weight: 4, min: 1, max: 3 },
    { item: "emerald", weight: 4, min: 1, max: 2 },
    { item: "diamond", weight: 2, min: 1, max: 2 },
  ],
} as const;


