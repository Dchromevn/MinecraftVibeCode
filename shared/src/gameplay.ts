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
  netherite: { durability: 2031, speed: 9, swordDamage: 8, level: 4 }, // (10d2) chỉ nâng từ đồ kim cương ở bàn rèn
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
  netherite: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durability: 555 }, // (10d2) độ cứng 3, kháng đẩy lùi 10% mỗi món
} as const;
export type ArmorTier = keyof typeof ARMOR;

export const STACK = {
  DEFAULT: 64, // block, nguyên liệu, mũi tên
  SINGLE: 1, // công cụ, vũ khí, giáp, giường, cửa, xô có nước / dung nham
  BUCKET: 16, // xô rỗng
  EGG: 16, // trứng (7a), ngọc hư không (7b)
} as const;

export const BOW_DURABILITY = 384;

// Cung tên (Giai đoạn 6b; như Minecraft bản Java). Lực kéo, tốc độ tối đa, sát thương 2–9: xem COMBAT.
export const ARCHERY = {
  MIN_POWER: 0.1, // kéo chưa tới lực này thì thả ra không bắn
  STAGES: [0.65, 0.9], // hình cung: lực < 65% → mức 0, < 90% → mức 1, còn lại mức 2
  GRAVITY: 20, // block/giây² (0.05 block/tick²)
  DRAG: 0.99, // mỗi tick trong không khí
  WATER_DRAG: 0.6, // mỗi tick trong nước
  DAMAGE_PER_SPEED: 2, // sát thương = ⌈tốc độ (block/tick) × 2⌉ (tốc độ tối đa 3 block/tick → 6, chí mạng 9)
  HIT_PAD: 0.3, // nới hộp người chơi khi xét trúng tên
  OWNER_IMMUNE_S: 0.25, // vừa bắn: tên không trúng chính người bắn
  DRAW_SLACK_S: 0.1, // server cộng thêm vào thời gian kéo (gói tới lệch nhịp)
  MOVE_FACTOR: 0.2, // đang kéo cung: đi chậm, không chạy nhanh
  ZOOM: 0.15, // kéo đủ lực: góc nhìn hẹp lại 15%
  STUCK_DESPAWN_S: 60, // tên cắm vào block: mất sau 60 giây
  FLY_DESPAWN_S: 30,
  PICKUP_RANGE: 1.2, // đi lại gần tên đã cắm thì nhặt được
  MAX_ARROWS: 256, // nhiều hơn thì bỏ tên cũ nhất
  VIEW: 96, // gửi tên cho người chơi trong bán kính này
} as const;

// Khiên (Giai đoạn 6a, người dùng chọn 2026-11-14; như Minecraft bản Java)
export const SHIELD = {
  DURABILITY: 336,
  RAISE_S: 0.25, // giơ khiên 5 tick rồi mới đỡ được
  DISABLE_S: 5, // bị rìu đánh vào khiên: khiên khóa 5 giây
  MOVE_FACTOR: 0.2, // đang giơ khiên: đi chậm (không chạy nhanh được)
  WEAR_MIN_DAMAGE: 3, // đỡ đòn từ 3 máu trở lên thì khiên mất 1 + phần nguyên sát thương
  ATTACKER_KNOCKBACK: 0.5, // đánh vào khiên: người đánh bị đẩy lùi (block/tick, ×20 = block/giây)
} as const;

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
  FLY_DOUBLE_TAP_S: 0.3, // (6a) nhấn đúp Space trong khoảng này thì bật / tắt bay (quản trị viên); F để đổi tay
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

// 2.7 Ngày đêm, sinh vật, giường: xem mobConstants.ts (Giai đoạn 7a)

// 2.8 Chiến đấu (Giai đoạn 6a; MECHANICS.md mục 5)
export const COMBAT = {
  HAND_DAMAGE: 1,
  AXE_DAMAGE_PENALTY: 1, // rìu = kiếm cùng cấp trừ 1
  PICKAXE_DAMAGE_PENALTY: 2, // cuốc = kiếm − 2 (gỗ 2 · đá 3 · sắt 4 · kim cương 5)
  SHOVEL_DAMAGE_PENALTY: 1.5, // xẻng = kiếm − 1.5
  HOE_DAMAGE: 1,
  /** Tốc độ đánh (số đòn đầy lực / giây) — hồi đòn = 1 / tốc độ (người dùng chọn 2026-11-14: theo vũ khí). */
  ATTACK_SPEED: {
    hand: 4, sword: 1.6, pickaxe: 1.2, shovel: 1, hoe: 1,
    axe: { wood: 0.8, stone: 0.8, iron: 0.9, gold: 1, diamond: 1, netherite: 1 },
  },
  MELEE_RANGE: 3,
  MELEE_RANGE_SERVER: 3.5, // có dung sai
  HIT_BOX_PAD: 0.1, // server nới hộp người bị đánh mỗi phía (lệch vị trí đoán trước / làm tròn)
  ATTACK_TIMING_SLACK_S: 0.05, // server cộng thêm vào thời gian từ đòn trước (gói tới lệch nhịp)
  MIN_COOLDOWN_DAMAGE_RATIO: 0.2,
  CRIT_MULTIPLIER: 1.5,
  CRIT_MIN_STRENGTH: 0.848, // chí mạng / đẩy lùi mạnh khi chạy nhanh cần hồi đòn từ mức này
  KNOCKBACK_H: 0.4, // block/tick (×20 = block/giây)
  KNOCKBACK_V: 0.36,
  SPRINT_KNOCKBACK_MULT: 2,
  WEAPON_WEAR: 1, // kiếm mất 1 độ bền mỗi đòn trúng; công cụ khác mất 2
  TOOL_ATTACK_WEAR: 2,
  LAST_ATTACKER_S: 5, // chết trong 5 giây sau khi bị đánh: tính là người đó giết
  // quét kiếm: đòn kiếm đủ lực, đứng trên đất, không chạy nhanh, không chí mạng → trúng cả người đứng sát mục tiêu
  SWEEP_DAMAGE: 1,
  SWEEP_REACH_H: 1, // nới hộp mục tiêu 1 block ngang, 0.25 block dọc
  SWEEP_REACH_V: 0.25,
  SWEEP_KNOCKBACK: 0.4, // đẩy theo hướng người đánh nhìn (block/tick)
  INVULN_S: 0.5,
  BOW_MAX_DRAW_S: 1,
  BOW_MIN_DAMAGE: 2,
  BOW_MAX_DAMAGE: 9,
  ARROW_MAX_SPEED: 60, // block/giây
  ARMOR_POINT_REDUCTION: 0.04,
  POSITION_HISTORY_S: 1, // server nhớ vị trí người chơi 1 giây để tua lại khi kiểm tra đòn đánh
  LAG_COMP_MAX_MS: 250,
  PVP_DEFAULT: true, // cấu hình server PVP=on|off
  SAFE_ZONE_RADIUS: 0, // vùng an toàn quanh điểm hồi sinh (không PvP, không phá/đặt); 0 = tắt (người dùng bỏ 2026-11-23, cũ: 16)
} as const;

/** Bảng đồ rương: rút ROLLS_MIN..ROLLS_MAX lượt, mỗi lượt một món theo weight, số lượng min–max. */
export interface LootTable {
  ROLLS_MIN: number;
  ROLLS_MAX: number;
  ENTRIES: readonly { item: string; weight: number; min: number; max: number }[];
  /** (7e) Nhóm bốc thêm (mỗi nhóm bốc riêng như bảng nhiều "pool" của Minecraft); item "" = trúng ô trống. */
  MORE?: readonly LootTable[];
}

// (7b) Rương nhà phù thủy (người dùng yêu cầu) và hầm quái
export const WITCH_HUT_LOOT: LootTable = {
  ROLLS_MIN: 3, ROLLS_MAX: 6, ENTRIES: [
    { item: "spider_eye", weight: 15, min: 1, max: 3 }, { item: "gunpowder", weight: 12, min: 1, max: 3 },
    { item: "bone_meal", weight: 10, min: 2, max: 6 }, { item: "string", weight: 10, min: 1, max: 4 },
    { item: "slime_ball", weight: 8, min: 1, max: 3 }, { item: "rotten_flesh", weight: 8, min: 1, max: 4 },
    { item: "feather", weight: 6, min: 1, max: 3 }, { item: "milk_bucket", weight: 4, min: 1, max: 1 },
    { item: "ender_pearl", weight: 4, min: 1, max: 2 }, { item: "emerald", weight: 4, min: 1, max: 3 },
    { item: "golden_apple", weight: 1, min: 1, max: 1 },
  ],
};
export const DUNGEON_LOOT: LootTable = {
  ROLLS_MIN: 3, ROLLS_MAX: 7, ENTRIES: [
    { item: "bone", weight: 12, min: 1, max: 6 }, { item: "rotten_flesh", weight: 12, min: 1, max: 6 },
    { item: "gunpowder", weight: 10, min: 1, max: 6 }, { item: "string", weight: 10, min: 1, max: 6 },
    { item: "bread", weight: 10, min: 1, max: 3 }, { item: "wheat", weight: 10, min: 1, max: 4 },
    { item: "coal", weight: 8, min: 1, max: 4 }, { item: "iron_ingot", weight: 8, min: 1, max: 4 },
    { item: "bucket", weight: 6, min: 1, max: 1 }, { item: "gold_ingot", weight: 5, min: 1, max: 4 },
    { item: "golden_apple", weight: 3, min: 1, max: 1 },
    { item: "diamond", weight: 1, min: 1, max: 1 },
    { item: "saddle", weight: 6, min: 1, max: 1 }, // 7d
    { item: "enchanted_book", weight: 6, min: 1, max: 1 }, // 8b3: phù phép ngẫu nhiên
  ],
};

// 2.9 Rương hầm mỏ (Giai đoạn 4 điền khi chunk được sinh).
// Mỗi rương rút ROLLS lượt; mỗi lượt chọn một món theo weight, số lượng min–max.
export const MINESHAFT_LOOT: LootTable = {
  ROLLS_MIN: 3,
  ROLLS_MAX: 6,
  ENTRIES: [
    { item: "bread", weight: 15, min: 1, max: 3 },
    { item: "coal", weight: 10, min: 3, max: 8 },
    { item: "raw_iron", weight: 10, min: 1, max: 5 },
    { item: "rail", weight: 10, min: 4, max: 8 },
    { item: "saddle", weight: 3, min: 1, max: 1 }, // 7d (DESIGN: thêm vào rương hầm mỏ)
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
    { item: "enchanted_book", weight: 5, min: 1, max: 1 }, // 8b3
  ],
} as const;


