// Thông số ngày đêm, sinh vật, giường (Giai đoạn 7a; DESIGN.md 2.7, MECHANICS.md 7 và 8). Xuất lại qua constants.ts.

/** Ngày đêm (MECHANICS.md 7): 1 ngày = 24000 tick = 20 phút; server tick 20 lần / giây nên 1 tick đồng hồ = 1 tick server. */
export const DAY = {
  TICKS: 24000,
  TICKS_PER_S: 20,
  START: 1000, // thế giới mới: sáng hẳn
  SET_DAY: 1000, // /time set day
  SET_NOON: 6000,
  SET_NIGHT: 13000,
  SET_MIDNIGHT: 18000,
  UNDEAD_SAFE_FROM: 12542, // từ đây tới UNDEAD_BURN_FROM quái xác sống / bộ xương không cháy
  UNDEAD_BURN_FROM: 23460,
  SLEEP_FROM: 12542, // ngủ được trong khoảng này
  SLEEP_TO: 23460,
  SKY_DARKEN_MAX: 11, // ánh sáng trời bị trừ tối đa 11 mức lúc nửa đêm (còn 4)
  NIGHT_BRIGHTNESS: 0.2, // độ sáng trời thấp nhất khi vẽ (client)
  SYNC_S: 5, // server gửi giờ cho client mỗi 5 giây
} as const;

/** Giường (MECHANICS.md 7). */
export const BED = {
  MONSTER_H: 8, // không ngủ được khi có quái thù địch trong 8 block ngang
  MONSTER_V: 5, // và 5 block dọc
  SLEEP_PERCENT: 50, // tua sáng khi ≥ 50% người online đang ngủ (cấu hình server sleepPercent)
  SKIP_DELAY_S: 5, // nằm đủ 5 giây mới tua sáng
  USE_RANGE: 3, // phải đứng trong 3 block quanh giường
} as const;

/** Sinh quái, gỡ quái (MECHANICS.md 8.1). */
export const SPAWN_RULES = {
  MIN_DIST: 24,
  MAX_DIST: 128,
  CAP: 30, // quái thù địch quanh mỗi người chơi
  CAP_RADIUS: 128, // đếm trong cả vùng sinh (đếm trong 64 block thì quái ở 64–128 block tích dần không giới hạn)
  DESPAWN_FAR: 128, // xa mọi người chơi hơn mức này: gỡ ngay
  DESPAWN_NEAR: 32, // từ đây trở ra, không bị đánh 30 giây: mỗi giây 1/800 bị gỡ
  DESPAWN_IDLE_S: 30,
  DESPAWN_CHANCE: 1 / 800,
  GROUP_MAX: 4, // sinh theo đàn tối đa 4 con quanh một điểm
  GROUP_SPREAD: 6,
  TRIES_PER_TICK: 2, // số lần thử sinh mỗi tick mỗi người chơi
  SKY_RANDOM_MAX: 7, // ánh sáng trời (đã trừ theo giờ) ≤ số ngẫu nhiên 0..7
  BABY_ZOMBIE_CHANCE: 0.05,
  // động vật sinh lúc tạo chunk (MECHANICS.md 8.1): một đàn 2–4 con với xác suất này mỗi chunk
  ANIMAL_CHUNK_CHANCE: 0.1,
  ANIMAL_HERD_MIN: 2,
  ANIMAL_HERD_MAX: 4,
  ANIMAL_MIN_LIGHT: 9,
  // trọng số chọn loài động vật (như Minecraft đồng cỏ)
  ANIMAL_WEIGHTS: { sheep: 12, pig: 10, chicken: 10, cow: 8 } as Readonly<Record<string, number>>,
  // (7c) bảng động vật theo biome (sinh lúc tạo chunk). "plains_warm" = đồng cỏ khô có keo, "mountains_snow" = núi trên đường tuyết
  ANIMAL_BIOMES: {
    plains: { sheep: 12, pig: 10, chicken: 10, cow: 8, horse: 5, donkey: 1 }, // (7d) ngựa, lừa
    plains_warm: { sheep: 6, pig: 5, chicken: 5, cow: 4, llama: 8, armadillo: 8, wolf: 2, horse: 3, donkey: 1 },
    forest: { sheep: 12, pig: 10, chicken: 10, cow: 8, wolf: 5, rabbit: 4 },
    desert: { rabbit: 4 },
    snowy: { rabbit: 10, fox: 8, wolf: 3, polar_bear: 2, sheep: 4 },
    mountains: { sheep: 10, llama: 5, rabbit: 4, fox: 3, wolf: 3, cow: 4 },
    mountains_snow: { goat: 10 },
    swamp: { sheep: 12, pig: 10, chicken: 10, cow: 8 },
  } as Readonly<Record<string, Readonly<Record<string, number>>>>,
  WOLF_PACK: 4, // sói đi đàn tới 4 con
  POLAR_CUB_CHANCE: 0.5, // gấu trắng thứ hai trong đàn là gấu con
  // (7c) dơi, sinh vật dưới nước: sinh lại liên tục quanh người chơi (MECHANICS.md 8.1)
  AMBIENT_MIN_DIST: 16,
  AMBIENT_MAX_DIST: 64,
  AMBIENT_TRIES: 2, // mỗi tick mỗi người chơi
  AMBIENT_DESPAWN_CHANCE: 1 / 40, // ngoài AMBIENT_MAX_DIST: mỗi giây 1/40 bị gỡ (như Minecraft 1/800 mỗi tick)
  AMBIENT_CAPS: { bat: 8, water: 5, fish: 10, glow: 3 } as Readonly<Record<string, number>>,
  SQUID_Y: [50, 62] as readonly number[],
  // cá theo nhiệt độ đại dương (temp < SNOWY_TEMP lạnh, > DESERT_TEMP ấm); sông / hồ: cá hồi + mực
  OCEAN_FISH: {
    cold: { cod: 15, salmon: 15 },
    mild: { cod: 15 },
    warm: { tropical_fish: 25, pufferfish: 15 },
  } as Readonly<Record<string, Readonly<Record<string, number>>>>,
  RIVER_FISH: { salmon: 5 } as Readonly<Record<string, number>>,
  FISH_SCHOOL: { cod: [3, 6], salmon: [1, 5], tropical_fish: [4, 8], pufferfish: [1, 3] } as Readonly<Record<string, readonly number[]>>,
  DOLPHIN_CHANCE: 0.15, // đại dương không lạnh: mỗi lần chọn "nước" có 15% là đàn cá heo 1–3 con
  SQUID_CHANCE: 0.5,
  GLOW_SQUID_MAX_Y: 30,
  BAT_MAX_Y: 63,
  BAT_MAX_LIGHT: 3,
  // trọng số chọn quái trên cạn (MECHANICS.md 8.2); sa mạc / vùng tuyết thay một phần (spawner.ts)
  // (người dùng chọn 2026-11-14: phù thủy chỉ sinh ở nhà phù thủy; kẻ hư không chỉ sinh nơi thấy trời — ban đêm trên mặt đất)
  MONSTER_WEIGHTS: { spider: 100, zombie: 95, skeleton: 100, creeper: 100, slime: 100, enderman: 10, zombie_villager: 5 } as Readonly<Record<string, number>>,
  HUT_WITCH_MAX: 2, // tối đa 2 phù thủy quanh mỗi nhà
  HUT_TRY_S: 5, // mỗi nhà gần người chơi thử sinh phù thủy khoảng 5 giây một lần
  HUT_RANGE: 96, // nhà trong khoảng này quanh người chơi mới sinh
  DROWNED_RIVER: 100, // trọng số xác đuối khi điểm sinh ở dưới nước (sông / hồ)
  DROWNED_OCEAN: 5, // ở đại dương
  SLIME_CHUNK_CHANCE: 0.1, // 1/10 số chunk là "chunk nhầy"
  SLIME_MAX_Y: 40,
  SWAMP_SLIME_Y: [51, 69] as readonly number[], // (7b) khối nhầy cũng sinh trên mặt đầm lầy ở độ cao này khi đủ tối
  SLIME_SIZES: [1, 2, 4] as readonly number[],
  // bóng ma đêm: người chơi thức ≥ 3 ngày (72000 tick = 3600 giây), ban đêm, thấy trời, y ≥ 62; mỗi 60–119 giây thử 1 lần
  PHANTOM_AWAKE_S: 3600,
  PHANTOM_MIN_Y: 62,
  PHANTOM_TRY_MIN_S: 60,
  PHANTOM_TRY_MAX_S: 119,
  PHANTOM_GROUP_MAX: 3,
} as const;

/** AI và vật lý sinh vật. Tốc độ: block / giây. */
export const MOB_AI = {
  STEP_HEIGHT: 0.6,
  GRAVITY: 32,
  TERMINAL_VELOCITY: 78.4,
  ACCEL_GROUND: 12, // độ bám vận tốc mong muốn (1/giây)
  ACCEL_AIR: 3,
  JUMP_VELOCITY: 8.95, // nhảy cao ~1.25 block (như người chơi)
  SWIM_UP: 2.5, // trong nước: nổi lên
  WATER_SPEED_FACTOR: 0.5,
  FALL_SAFE: 3,
  WANDER_RANGE: 10,
  WANDER_IDLE_MIN_S: 4, // đứng chờ 4–10 giây giữa các lần đi lang thang
  WANDER_IDLE_MAX_S: 10,
  PANIC_S: 5, // bị đánh thì chạy loạn 5 giây
  TEMPT_RANGE: 10, // cầm món ưa thích trong 10 block thì đi theo
  TEMPT_STOP: 2.5,
  LOOK_RANGE: 8, // động vật nhìn người chơi gần
  // tìm đường A* (PLAN Giai đoạn 7)
  PATH_MAX_NODES: 600, // số nút tối đa mỗi lần tìm
  PATH_BUDGET_PER_TICK: 3000, // tổng số nút mọi lần tìm trong một tick
  PATH_MAX_DROP: 3, // nhảy xuống tối đa 3 block
  REPATH_S: 1, // tìm lại đường mỗi giây khi đuổi theo
  STUCK_S: 3, // đứng yên quá lâu khi đang đi: bỏ đường, thử lại
  HURT_INVULN_S: 0.5,
  KNOCKBACK_H: 8, // đẩy lùi sinh vật khi bị đánh (block/giây)
  KNOCKBACK_V: 7.2,
  DEATH_ANIM_S: 1, // xác nằm lại 1 giây rồi biến mất
  SUN_BURN_S: 8, // bốc cháy 8 giây mỗi lần (MECHANICS.md 5.5)
  FIRE_DAMAGE: 1, // mỗi giây khi cháy
  DROWN_AIR_S: 15,
  ATTACK_REACH_PAD: 0.8, // đánh trúng khi khoảng cách ngang tâm ≤ nửa bề rộng hai bên + mức này
  POS_HISTORY_S: 1, // nhớ vị trí 1 giây (bù trễ khi người chơi đánh)
  VIEW: 96, // gửi sinh vật trong bán kính này
} as const;

/** Phối giống (người dùng chọn có, 2026-11-14; MECHANICS.md 8.4). */
/** Lồng sinh quái (7b; sửa 2026-11-14 theo Minecraft: lượt đầu 1 giây, sinh ở chỗ trống rồi rơi xuống). */
export const CAGE = {
  RANGE: 16, // có người chơi trong 16 block mới chạy
  FIRST_DELAY_S: 1,
  DELAY_MIN_S: 10,
  DELAY_MAX_S: 40,
  SPREAD: 4, // ±4 block ngang, ±1 dọc
  PER_SPAWN: 4, // số chỗ thử mỗi lượt
  MAX_NEAR: 6, // quanh lồng đã có 6 con cùng loài thì thôi
  MAX_LIGHT: 11,
  MAX_DROP: 3, // chỗ sinh lơ lửng: nền phải trong 3 block bên dưới
} as const;

/** (7d) Cưỡi thú (MECHANICS.md 8.3, 8.4). */
export const RIDE = {
  HORSE_SPEED: [4.7, 14.2] as readonly number[], // block / giây, ngẫu nhiên lúc sinh
  HORSE_JUMP: [1.1, 5.3] as readonly number[], // độ cao nhảy tối đa (block)
  DONKEY_SPEED: 7.4, DONKEY_JUMP: 1.6, // lừa / la
  LLAMA_SPEED: 2, LLAMA_JUMP: 1.2, // lạc đà không bướu: cưỡi được, không điều khiển
  /** Chân người cưỡi cao hơn chân thú (block) — mắt người cưỡi ngựa cao ~2.7 như Minecraft, đầu ngựa không che tầm nhìn. */
  SEAT: { horse: 1.1, donkey: 0.95, mule: 1.0, llama: 1.25, trader_llama: 1.25, camel: 1.9, strider: 1.6 } as Readonly<Record<string, number>>,
  SIT_DROP: 0.55, // vẽ người đang cưỡi thấp xuống chừng này (ngồi: hông chạm lưng thú)
  CHARGE_S: 1, // giữ phím nhảy 1 giây: nhảy cao nhất
  JUMP_MIN: 0.4, // nhả phím ngay: 40% độ cao
  STEP: 1, // bước lên 1 block
  FALL_SAFE: 3, // thú cưỡi không mất máu khi rơi dưới 3 block
  STRAFE: 0.5, BACK: 0.25, // đi ngang / lùi chậm hơn
  TEMPER_BUCK: 5, // mỗi lần bị hất xuống: +5 độ thuần (0..100)
  BUCK_MIN_S: 1, BUCK_MAX_S: 3, // ngựa chưa thuần hất người xuống sau chừng này giây
  FEED: { wheat: [2, 3], apple: [3, 3], golden_apple: [10, 10], hay_block: [20, 0] } as Readonly<Record<string, readonly number[]>>, // [hồi máu, độ thuần]
  CHEST_SLOTS: 15, // lừa, la
  LLAMA_STRENGTH: [1, 5] as readonly number[], // lạc đà: 3 ô mỗi mức sức khỏe
  LEASH_PULL: 4, // dây dắt: xa hơn thì thú đi theo
  LEASH_BREAK: 10, // xa hơn thì đứt (rơi dây)
  CARAVAN_R: 8, CARAVAN_GAP: 2.5, CARAVAN_MAX: 10, // lạc đà đi đoàn sau con bị dắt
  MULE_CHANCE: 1, // ngựa + lừa → la
} as const;

/** (7c) Thuần sói (MECHANICS.md 8.4). */
export const TAME = {
  WOLF_CHANCE: 1 / 3, // mỗi khúc xương
  WOLF_HEALTH: 40, // sói thuần
  LOVE_S: 30,
  WOLF_ARMOR_DUR: 64,
  FOLLOW_TELEPORT: 12, // cách chủ hơn 12 block (chủ đứng trên đất) thì dịch chuyển về
  FOLLOW_STOP: 4,
  TELEPORT_R: 3, // dịch chuyển tới chỗ trong 3 block quanh chủ
  RALLY_RANGE: 16,
} as const;

export const BREED = {
  LOVE_S: 30, // cho ăn xong: muốn phối giống trong 30 giây
  PARTNER_RANGE: 8,
  COOLDOWN_S: 300, // mỗi con chờ 5 phút mới phối tiếp
  GROW_S: 1200, // con non lớn sau 20 phút
  FEED_GROW_FRACTION: 0.1, // cho con non ăn: lớn nhanh thêm 10% thời gian còn lại
  BABY_SCALE: 0.5,
} as const;

/** Gà đẻ trứng, ném trứng, cừu, bò (MECHANICS.md 8.4). */
export const ANIMALS = {
  EGG_MIN_S: 300,
  EGG_MAX_S: 600,
  EGG_HATCH_CHANCE: 1 / 8,
  EGG_FOUR_CHANCE: 1 / 32, // trong các lần nở: 1/32 nở 4 con (tổng 1/256)
  EGG_SPEED: 30, // block/giây khi ném
  SHEAR_MIN: 1,
  SHEAR_MAX: 3,
  REGROW_CHANCE: 1 / 50, // mỗi giây cừu đã tỉa thử ăn cỏ (cỏ → đất) rồi mọc lông
  CHICKEN_FALL_SPEED: 3, // gà rơi chậm (vận tốc rơi tối đa)
  // màu len tự nhiên: [chỉ số màu, xác suất] (trắng 0, xám nhạt 8, xám 7, đen 15, nâu 12, hồng 6)
  WOOL_COLORS: [[15, 0.05], [7, 0.05], [8, 0.05], [12, 0.03], [6, 0.00164]] as readonly (readonly [number, number])[],
} as const;
