// 16 màu (DESIGN.md 2.13, Giai đoạn 4f): thứ tự = giá trị dữ liệu phụ của len, thảm, kính màu, tấm kính
// màu và bit 3–6 của giường. Tên dùng trong khóa vật phẩm / texture: "<màu>_wool", "<màu>_dye"...
export const COLORS = [
  "white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
  "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black",
] as const;
export type ColorName = (typeof COLORS)[number];

export const colorIndex = (c: ColorName): number => COLORS.indexOf(c);
/** Thay {c} trong mẫu bằng tên màu thứ i. */
export const withColor = (pattern: string, i: number): string => pattern.replace("{c}", COLORS[i & 15]!);

/** Giường: màu ở bit 3–6 của dữ liệu phụ (giường đỏ = 14). */
export const BED_COLOR_SHIFT = 3;
export const bedColor = (meta: number): number => (meta >> BED_COLOR_SHIFT) & 15;
export const RED = 14;
