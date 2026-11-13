// Xử lý ảnh PNG cho script nhập texture từ client.jar (import-mc): cắt, nhân màu, lật, xoay, phóng
// (lân cận gần nhất), dán đè có độ trong suốt, ghép nhiều mảnh (rương từ ảnh thực thể, ray ngã ba / ngã tư).
import { PNG } from "pngjs";

/** Một mảnh: vùng [x, y, rộng, cao] của ảnh nguồn (mặc định ảnh chính), dán tại (dx, dy). */
export interface Part {
  from?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  dx?: number;
  dy?: number;
  flipV?: boolean; // lật dọc (ảnh thực thể rương vẽ ngược)
  rot?: number; // số lần xoay 90° theo chiều kim đồng hồ
}

export interface Compose {
  w: number;
  h: number;
  parts: Part[];
  size?: number; // phóng kết quả thành size x size
}

/** Nhân màu (#RRGGBB) tại chỗ: dùng cho ảnh xám (cỏ, lá, nước, thân dưa). */
export function tint(png: PNG, color: string): PNG {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = Math.round(png.data[i]! * r!);
    png.data[i + 1] = Math.round(png.data[i + 1]! * g!);
    png.data[i + 2] = Math.round(png.data[i + 2]! * b!);
  }
  return png;
}

export function cropPng(src: PNG, x: number, y: number, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return out;
}

function remap(src: PNG, w: number, h: number, pick: (x: number, y: number) => [number, number]): PNG {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [sx, sy] = pick(x, y);
      src.data.copy(out.data, (y * w + x) * 4, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
    }
  return out;
}

export const flipV = (p: PNG): PNG => remap(p, p.width, p.height, (x, y) => [x, p.height - 1 - y]);

/** Xoay n lần 90° theo chiều kim đồng hồ: mép trên sang mép phải. */
export function rotateCW(p: PNG, n: number): PNG {
  let r = p;
  for (let k = 0; k < (((n % 4) + 4) % 4); k++) {
    const s = r;
    r = remap(s, s.height, s.width, (x, y) => [y, s.height - 1 - x]);
  }
  return r;
}

export const resize = (p: PNG, w: number, h: number): PNG =>
  remap(p, w, h, (x, y) => [Math.floor((x * p.width) / w), Math.floor((y * p.height) / h)]);

/** Dán top đè lên base tại (dx, dy), trộn theo độ trong suốt. */
export function blitOver(base: PNG, top: PNG, dx: number, dy: number): void {
  for (let y = 0; y < top.height; y++)
    for (let x = 0; x < top.width; x++) {
      const bx = dx + x, by = dy + y;
      if (bx < 0 || by < 0 || bx >= base.width || by >= base.height) continue;
      const i = (y * top.width + x) * 4, j = (by * base.width + bx) * 4;
      const a = top.data[i + 3]! / 255;
      if (a === 0) continue;
      for (let c = 0; c < 3; c++) base.data[j + c] = Math.round(top.data[i + c]! * a + base.data[j + c]! * (1 - a));
      base.data[j + 3] = Math.max(base.data[j + 3]!, top.data[i + 3]!);
    }
}

export function compose(c: Compose, main: PNG, load: (path: string) => PNG | null): PNG | null {
  let out = new PNG({ width: c.w, height: c.h });
  out.data.fill(0);
  for (const p of c.parts) {
    const src = p.from ? load(p.from) : main;
    if (!src) return null;
    let piece = cropPng(src, p.x ?? 0, p.y ?? 0, p.w ?? src.width, p.h ?? src.height);
    if (p.flipV) piece = flipV(piece);
    if (p.rot) piece = rotateCW(piece, p.rot);
    blitOver(out, piece, p.dx ?? 0, p.dy ?? 0);
  }
  if (c.size) out = resize(out, c.size, c.size);
  return out;
}
