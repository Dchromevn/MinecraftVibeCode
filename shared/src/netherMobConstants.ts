// Thông số sinh vật Vực Lửa Giai đoạn 10b (Minecraft Wiki, Java, mức Thường): ma bay, người lợn xác sống, khối nhầy dung nham,
// kẻ lội dung nham, lợn rừng lửa. Tốc độ: block / giây.

export const GHAST = {
  ACQUIRE_DY: 4, // chỉ nhắm người chơi lệch độ cao ≤ 4 (Minecraft); đã nhắm thì bám tới FOLLOW
  RANGE: 64, // bắn khi thấy mục tiêu trong 64 block
  CHARGE_S: 1, // há miệng (ảnh ghast_shooting) 0.5 giây cuối rồi bắn
  FIRE_S: 3, // mỗi 3 giây một quả
  WANDER: 16, // bay lang thang tới điểm ngẫu nhiên ±16 block
  FIREBALL_SPEED: 16, // cầu lửa bay thẳng (không rơi)
  FIREBALL_DAMAGE: 6, // trúng thẳng
  FIREBALL_POWER: 1, // rồi nổ (sức nổ 1, có lửa)
  FIREBALL_LIFE_S: 10,
  DEFLECT_RANGE: 4, // người chơi vung tay trúng cầu lửa trong 4 block thì đánh bật lại
  DEFLECT_KILL: 1000, // cầu lửa bị đánh bật trúng ma bay: chết ngay
  FIRE_CHANCE: 1 / 3, // ô trống quanh vụ nổ có lửa
} as const;

export const ZPIGLIN = {
  ANGER_S: [20, 39] as const, // bị đánh: tức 20–39 giây
  ALERT_H: 35, ALERT_V: 10, // cả bầy trong vùng này tức theo
  BABY_CHANCE: 0.05,
} as const;

export const MAGMA = {
  ARMOR_PER_SIZE: 3,
  DAMAGE: { 1: 3, 2: 4, 4: 6 } as Readonly<Record<number, number>>,
  JUMP_V: 11, // nhảy cao hơn khối nhầy
} as const;

export const STRIDER = {
  LAVA_SPEED: 2.2, LAND_SPEED: 1.2, COLD_FACTOR: 0.55, // đi lang thang (ngoài dung nham: lạnh, chậm, run)
  RIDE_LAVA: 4.2, RIDE_LAND: 1.8, // cưỡi (cầm cần câu nấm cong vênh): tự đi theo hướng nhìn
  BOOST_S: [7, 49] as const, BOOST_PEAK: 1.15, // chuột phải bằng cần câu: tăng tốc 7–49 giây, nhanh nhất +115% (mất 1 độ bền)
  STICK_DURABILITY: 100,
  WATER_DAMAGE: 1, // trong nước / mưa: mất máu
  SEAT: 1.6,
  CHUNK_CHANCE: 0.25, // chunk mới có dung nham lộ thiên: một đàn 1–2 con
  GROUP: [1, 2] as const,
  BABY_CHANCE: 0.1,
} as const;

export const HOGLIN = {
  DAMAGE: [3, 8] as const, // mức Thường
  TOSS_V: 6, // húc hất lên
  KB_RESIST: 0.6,
  AVOID_R: 7, // tránh nấm cong vênh (và cổng Vực Lửa) trong 7 block
  AVOID_SCAN_S: 1,
} as const;
