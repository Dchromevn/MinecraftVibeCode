// Raycast kiểu DDA (Amanatides & Woo) trên lưới block; trong mỗi ô nhắm được thì
// kiểm tra tia với các hộp nhắm thật của block (đuốc, ray, rào...) theo dữ liệu phụ.
import { cellId } from "./blockMeta.js";
import { selectionBoxes, type Box } from "./blockShapes.js";

export interface RayHit {
  x: number;
  y: number;
  z: number;
  /** Pháp tuyến mặt bị trúng (ô đặt block mới = ô trúng + pháp tuyến). */
  nx: number;
  ny: number;
  nz: number;
  dist: number;
  /** id | dữ liệu phụ << 8 của ô bị trúng. */
  cell: number;
}

/** Tia (o + t·d) cắt hộp (tọa độ thế giới): trả t vào và trục/chiều mặt vào, hoặc null. */
function hitBox(
  b: Box, bx: number, by: number, bz: number,
  ox: number, oy: number, oz: number, dx: number, dy: number, dz: number,
): { t: number; axis: number; sign: number } | null {
  let tmin = -Infinity, tmax = Infinity, axis = 0, sign = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [bx + b[0], by + b[1], bz + b[2]], hi = [bx + b[3], by + b[4], bz + b[5]];
  for (let a = 0; a < 3; a++) {
    if (d[a] === 0) {
      if (o[a]! < lo[a]! || o[a]! > hi[a]!) return null;
      continue;
    }
    let t1 = (lo[a]! - o[a]!) / d[a]!, t2 = (hi[a]! - o[a]!) / d[a]!;
    let s = -1; // vào qua mặt thấp → pháp tuyến âm
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = a;
      sign = s;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return { t: Math.max(0, tmin), axis, sign };
}

/** getCell: id | dữ liệu phụ << 8 (âm = chưa tải, coi như không khí). */
export function raycast(
  getCell: (x: number, y: number, z: number) => number,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): RayHit | null {
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return null;
  dx /= len; dy /= len; dz /= len;
  const idAt = (x: number, y: number, z: number): number => Math.max(0, cellId(getCell(x, y, z)));

  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = sx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tdy = sy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tdz = sz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = sx > 0 ? (x + 1 - ox) * tdx : sx < 0 ? (ox - x) * tdx : Infinity;
  let tmy = sy > 0 ? (y + 1 - oy) * tdy : sy < 0 ? (oy - y) * tdy : Infinity;
  let tmz = sz > 0 ? (z + 1 - oz) * tdz : sz < 0 ? (oz - z) * tdz : Infinity;
  let t = 0;

  while (t <= maxDist) {
    const cell = getCell(x, y, z);
    if (cell > 0) {
      let best: { t: number; axis: number; sign: number } | null = null;
      for (const b of selectionBoxes(cell, x, y, z, idAt)) {
        const h = hitBox(b, x, y, z, ox, oy, oz, dx, dy, dz);
        if (h && (!best || h.t < best.t)) best = h;
      }
      if (best && best.t <= maxDist) {
        const n = [0, 0, 0];
        n[best.axis] = best.sign;
        return { x, y, z, nx: n[0]!, ny: n[1]!, nz: n[2]!, dist: best.t, cell };
      }
    }
    if (tmx < tmy && tmx < tmz) {
      x += sx; t = tmx; tmx += tdx;
    } else if (tmy < tmz) {
      y += sy; t = tmy; tmy += tdy;
    } else {
      z += sz; t = tmz; tmz += tdz;
    }
  }
  return null;
}
