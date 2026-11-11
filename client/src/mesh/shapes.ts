// Hình dạng không phải khối: chữ X (cỏ cao, mạng nhện), cột hàng rào, đuốc, đường ray.
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";

const rgbBuf = new Float32Array(12);
const posBuf = new Float32Array(12);
const uvBuf = new Float32Array(8);

function fill(rgb: readonly number[], k = 1): Float32Array {
  for (let i = 0; i < 4; i++) {
    rgbBuf[i * 3] = rgb[0]! * k;
    rgbBuf[i * 3 + 1] = rgb[1]! * k;
    rgbBuf[i * 3 + 2] = rgb[2]! * k;
  }
  return rgbBuf;
}

/** UV con trong tile: (a0,b0)-(a1,b1) tính theo phần 0..1 của tile. */
function sub(uv: TileUV, a0: number, b0: number, a1: number, b1: number): [number, number, number, number] {
  const du = uv.u1 - uv.u0, dv = uv.v1 - uv.v0;
  return [uv.u0 + du * a0, uv.v0 + dv * b0, uv.u0 + du * a1, uv.v0 + dv * b1];
}

function quadUV(b: GeomBuilder, p: readonly number[], u0: number, v0: number, u1: number, v1: number, rgb: Float32Array): void {
  for (let i = 0; i < 12; i++) posBuf[i] = p[i]!;
  uvBuf[0] = u0; uvBuf[1] = v0; uvBuf[2] = u1; uvBuf[3] = v0;
  uvBuf[4] = u1; uvBuf[5] = v1; uvBuf[6] = u0; uvBuf[7] = v1;
  b.quad(posBuf, uvBuf, rgb);
}

/** Hai mặt phẳng chéo, mỗi mặt vẽ cả hai chiều (vật liệu một mặt). */
export function addCross(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, rgb: readonly number[]): void {
  const c = fill(rgb, 0.95);
  const lo = 0.15, hi = 0.85;
  const { u0, v0, u1, v1 } = uv;
  quadUV(b, [x + lo, y, z + lo, x + hi, y, z + hi, x + hi, y + 1, z + hi, x + lo, y + 1, z + lo], u0, v0, u1, v1, c);
  quadUV(b, [x + hi, y, z + hi, x + lo, y, z + lo, x + lo, y + 1, z + lo, x + hi, y + 1, z + hi], u1, v0, u0, v1, c);
  quadUV(b, [x + hi, y, z + lo, x + lo, y, z + hi, x + lo, y + 1, z + hi, x + hi, y + 1, z + lo], u0, v0, u1, v1, c);
  quadUV(b, [x + lo, y, z + hi, x + hi, y, z + lo, x + hi, y + 1, z + lo, x + lo, y + 1, z + hi], u1, v0, u0, v1, c);
}

/**
 * Hộp nhỏ trong block (đơn vị 1/16), dán texture theo đúng vị trí điểm ảnh.
 * top/bottom = có vẽ mặt trên/dưới không.
 */
function addBox(
  b: GeomBuilder,
  x: number, y: number, z: number,
  a0: number, a1: number, h0: number, h1: number,
  uv: TileUV, rgb: readonly number[], top: boolean, bottom: boolean, topUV?: [number, number, number, number],
): void {
  const X0 = x + a0 / 16, X1 = x + a1 / 16, Z0 = z + a0 / 16, Z1 = z + a1 / 16;
  const Y0 = y + h0 / 16, Y1 = y + h1 / 16;
  const [su0, sv0, su1, sv1] = sub(uv, a0 / 16, h0 / 16, a1 / 16, h1 / 16);
  // 4 mặt bên với độ sáng theo hướng như khối thường
  quadUV(b, [X0, Y0, Z1, X1, Y0, Z1, X1, Y1, Z1, X0, Y1, Z1], su0, sv0, su1, sv1, fill(rgb, 0.8));
  quadUV(b, [X1, Y0, Z0, X0, Y0, Z0, X0, Y1, Z0, X1, Y1, Z0], su0, sv0, su1, sv1, fill(rgb, 0.8));
  quadUV(b, [X1, Y0, Z1, X1, Y0, Z0, X1, Y1, Z0, X1, Y1, Z1], su0, sv0, su1, sv1, fill(rgb, 0.6));
  quadUV(b, [X0, Y0, Z0, X0, Y0, Z1, X0, Y1, Z1, X0, Y1, Z0], su0, sv0, su1, sv1, fill(rgb, 0.6));
  const t = topUV ?? sub(uv, a0 / 16, a0 / 16, a1 / 16, a1 / 16);
  if (top) quadUV(b, [X0, Y1, Z1, X1, Y1, Z1, X1, Y1, Z0, X0, Y1, Z0], t[0], t[1], t[2], t[3], fill(rgb, 1));
  if (bottom) quadUV(b, [X0, Y0, Z0, X1, Y0, Z0, X1, Y0, Z1, X0, Y0, Z1], t[0], t[1], t[2], t[3], fill(rgb, 0.5));
}

/** Cột hàng rào 4x4 điểm ảnh, cao cả block. */
export function addPost(
  b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, rgb: readonly number[], top: boolean, bottom: boolean,
): void {
  addBox(b, x, y, z, 6, 10, 0, 16, uv, rgb, top, bottom);
}

/** Que đuốc 2x10 điểm ảnh; texture đuốc nằm ở cột 7–8, hàng 6–15 (tính từ trên). */
export function addTorch(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV): void {
  const full = [1, 1, 1];
  addBox(b, x, y, z, 7, 9, 0, 10, uv, full, true, false, sub(uv, 7 / 16, 8 / 16, 9 / 16, 10 / 16));
}

/** Đường ray: mặt phẳng sát sàn. alongX = ray chạy theo trục X. */
export function addRail(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, rgb: readonly number[], alongX: boolean): void {
  const c = fill(rgb, 1);
  const h = y + 1 / 16;
  const { u0, v0, u1, v1 } = uv;
  // texture: thanh ray chạy theo chiều dọc ảnh (v)
  if (alongX) quadUV(b, [x, h, z, x, h, z + 1, x + 1, h, z + 1, x + 1, h, z], u0, v0, u1, v1, c);
  else quadUV(b, [x, h, z + 1, x + 1, h, z + 1, x + 1, h, z, x, h, z], u0, v0, u1, v1, c);
}
