// Đổi mức sáng (0..15, có thể lẻ do lấy trung bình) thành hệ số màu đỉnh.
// Ánh sáng block hơi ngả vàng cam (đuốc, dung nham).

const STEPS = 10;
const CURVE = new Float32Array(15 * STEPS + 1);
for (let i = 0; i < CURVE.length; i++) {
  const f = i / STEPS / 15;
  // đường cong kiểu "gamma": giữa tối nhanh để hang thật sự tối
  CURVE[i] = Math.max(0.004, Math.pow(f / (3 - 2 * f), 1.6));
}

const BLOCK_TINT = [1.0, 0.86, 0.66] as const;

export function brightness(level: number): number {
  return CURVE[Math.round(level * STEPS)]!;
}

/** Ghi màu (r, g, b) vào out[o..o+2]. mul = hướng mặt × AO. */
export function writeColor(out: Float32Array | number[], o: number, sky: number, block: number, mul: number): void {
  const s = brightness(sky);
  const b = brightness(block);
  out[o] = mul * Math.max(s, b * BLOCK_TINT[0]);
  out[o + 1] = mul * Math.max(s, b * BLOCK_TINT[1]);
  out[o + 2] = mul * Math.max(s, b * BLOCK_TINT[2]);
}
