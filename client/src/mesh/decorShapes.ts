// Hình vẽ đồ trang trí Giai đoạn 4f cần lấy texture theo vùng ảnh riêng (không theo vị trí hộp trong ô):
// lồng đèn (ảnh gồm cả mặt bên, mặt trên, nắp). Vùng ảnh ghi theo kiểu ảnh gốc: (u0, v0) góc trên trái, điểm ảnh 0..16.
import type { BlockBox } from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";

type Rect = readonly [number, number, number, number];

const pos = new Float32Array(12);
const uvb = new Float32Array(8);
const rgb = new Float32Array(12);
const lit = new Float32Array(8);

function quad(b: GeomBuilder, p: readonly number[], t: TileUV, r: Rect, light: readonly number[], shade: number): void {
  for (let i = 0; i < 12; i++) pos[i] = p[i]!;
  const du = (t.u1 - t.u0) / 16, dv = (t.v1 - t.v0) / 16;
  // ảnh gốc: v tính từ trên xuống; atlas: v0 ở dưới
  const u0 = t.u0 + du * r[0], u1 = t.u0 + du * r[2], vb = t.v0 + dv * (16 - r[3]), vt = t.v0 + dv * (16 - r[1]);
  const c = [u0, vb, u1, vb, u1, vt, u0, vt];
  for (let k = 0; k < 8; k++) uvb[k] = c[k]!;
  for (let k = 0; k < 4; k++) {
    rgb[k * 3] = rgb[k * 3 + 1] = rgb[k * 3 + 2] = shade;
    lit[k * 2] = light[0]!;
    lit[k * 2 + 1] = light[1]!;
  }
  b.quad(pos, uvb, rgb, lit);
}

/** Hộp (0..1 trong ô) với vùng ảnh riêng cho 4 mặt bên và mặt trên / dưới. */
export function addBoxRegion(
  b: GeomBuilder, x: number, y: number, z: number, box: BlockBox, t: TileUV, side: Rect, top: Rect, light: readonly number[],
): void {
  const X0 = x + box[0], Y0 = y + box[1], Z0 = z + box[2], X1 = x + box[3], Y1 = y + box[4], Z1 = z + box[5];
  quad(b, [X0, Y1, Z1, X1, Y1, Z1, X1, Y1, Z0, X0, Y1, Z0], t, top, light, 1);
  quad(b, [X0, Y0, Z0, X1, Y0, Z0, X1, Y0, Z1, X0, Y0, Z1], t, top, light, 0.5);
  quad(b, [X1, Y0, Z1, X1, Y0, Z0, X1, Y1, Z0, X1, Y1, Z1], t, side, light, 0.6);
  quad(b, [X0, Y0, Z0, X0, Y0, Z1, X0, Y1, Z1, X0, Y1, Z0], t, side, light, 0.6);
  quad(b, [X0, Y0, Z1, X1, Y0, Z1, X1, Y1, Z1, X0, Y1, Z1], t, side, light, 0.8);
  quad(b, [X1, Y0, Z0, X0, Y0, Z0, X0, Y1, Z0, X1, Y1, Z0], t, side, light, 0.8);
}

/** Vùng ảnh lồng đèn (theo mô hình gốc): thân [mặt bên, mặt trên], nắp [mặt bên, mặt trên]. */
export const LANTERN_UV = {
  body: { side: [0, 2, 6, 9] as Rect, top: [0, 9, 6, 15] as Rect },
  cap: { side: [1, 0, 5, 2] as Rect, top: [1, 10, 5, 14] as Rect },
};
