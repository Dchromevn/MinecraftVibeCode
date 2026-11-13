// Đồ sắt, lửa, nút / cần gạt (DESIGN.md 2.13, Giai đoạn 4f). Mọi con số lối chơi của 4f ở đây.

export const SHEARS = {
  DURABILITY: 238,
  LEAVES_SPEED: 15, // lá, mạng nhện: đào nhanh gấp 15 tay không
  WOOL_SPEED: 5, // len: nhanh gấp 5
} as const;

export const FIRE = {
  FLINT_AND_STEEL_DURABILITY: 64,
  MIN_S: 2, // lửa tự tắt sau 2–6 giây (không lan, không đốt block)
  MAX_S: 6,
  DAMAGE: 1, // đi vào lửa: mất 1 máu và bị cháy
  BURN_S: 8,
  LIGHT: 15,
} as const;

export const LANTERN_LIGHT = 15;

export const SWITCHES = {
  STONE_BUTTON_S: 1, // nút đá bật 1 giây rồi tự tắt
  WOOD_BUTTON_S: 1.5,
  /** Cửa sắt mở khi có nút / cần gạt đang bật cách một nửa cửa tối đa từng này ô (cộng các trục). */
  POWER_RANGE: 2,
} as const;

/** Khối than đốt được bao nhiêu món (cùng bảng FURNACE.FUEL). */
export const COAL_BLOCK_FUEL = 80;
