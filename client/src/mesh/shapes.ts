// Hình dạng không phải khối đầy: chữ X, #, hộp nhỏ (rào, đuốc, cửa, giường, đất cày),
// tấm sát sàn (ray), tấm sát tường (thang). Ánh sáng lấy từ chính ô đó.
import { rotXZ } from "../../../shared/src/index.js";
import type { TileUV } from "../atlas.js";
import type { GeomBuilder } from "./geomBuilder.js";

const pos = new Float32Array(12);
const uvb = new Float32Array(8);
const rgb = new Float32Array(12);
const lit = new Float32Array(8);

/** light = [trời, block] (0..1) của ô. */
function setLight(light: readonly number[], shade: number): void {
  for (let k = 0; k < 4; k++) {
    rgb[k * 3] = rgb[k * 3 + 1] = rgb[k * 3 + 2] = shade;
    lit[k * 2] = light[0]!;
    lit[k * 2 + 1] = light[1]!;
  }
}

/** Mặt 4 đỉnh p (12 số) với UV góc (u0,v0)-(u1,v1); rot xoay góc UV (0..3). */
function face(b: GeomBuilder, p: readonly number[], u0: number, v0: number, u1: number, v1: number, rot = 0): void {
  for (let i = 0; i < 12; i++) pos[i] = p[i]!;
  const c = [u0, v0, u1, v0, u1, v1, u0, v1];
  for (let k = 0; k < 4; k++) {
    const j = (k + rot) & 3;
    uvb[k * 2] = c[j * 2]!;
    uvb[k * 2 + 1] = c[j * 2 + 1]!;
  }
  b.quad(pos, uvb, rgb, lit);
}

/** Phần con của tile theo điểm ảnh (0..16), v tính từ dưới lên. */
function sub(uv: TileUV, a0: number, b0: number, a1: number, b1: number): [number, number, number, number] {
  const du = (uv.u1 - uv.u0) / 16, dv = (uv.v1 - uv.v0) / 16;
  return [uv.u0 + du * a0, uv.v0 + dv * b0, uv.u0 + du * a1, uv.v0 + dv * b1];
}

/** Hai mặt phẳng chéo, mỗi mặt vẽ cả hai chiều. */
export function addCross(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[]): void {
  setLight(light, 0.95);
  const lo = 0.15, hi = 0.85;
  const { u0, v0, u1, v1 } = uv;
  face(b, [x + lo, y, z + lo, x + hi, y, z + hi, x + hi, y + 1, z + hi, x + lo, y + 1, z + lo], u0, v0, u1, v1);
  face(b, [x + hi, y, z + hi, x + lo, y, z + lo, x + lo, y + 1, z + lo, x + hi, y + 1, z + hi], u0, v0, u1, v1);
  face(b, [x + hi, y, z + lo, x + lo, y, z + hi, x + lo, y + 1, z + hi, x + hi, y + 1, z + lo], u0, v0, u1, v1);
  face(b, [x + lo, y, z + hi, x + hi, y, z + lo, x + hi, y + 1, z + lo, x + lo, y + 1, z + hi], u0, v0, u1, v1);
}

/** Dạng # (cây trồng): 4 mặt phẳng, mỗi mặt hai chiều. */
export function addCrop(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[]): void {
  setLight(light, 0.95);
  const { u0, v0, u1, v1 } = uv;
  for (const o of [4 / 16, 12 / 16]) {
    face(b, [x + o, y, z, x + o, y, z + 1, x + o, y + 1, z + 1, x + o, y + 1, z], u0, v0, u1, v1);
    face(b, [x + o, y, z + 1, x + o, y, z, x + o, y + 1, z, x + o, y + 1, z + 1], u0, v0, u1, v1);
    face(b, [x, y, z + o, x + 1, y, z + o, x + 1, y + 1, z + o, x, y + 1, z + o], u0, v0, u1, v1);
    face(b, [x + 1, y, z + o, x, y, z + o, x, y + 1, z + o, x + 1, y + 1, z + o], u0, v0, u1, v1);
  }
}

export interface BoxTex {
  side: TileUV;
  top: TileUV;
  bottom: TileUV;
}

/**
 * Hộp trong ô, kích thước theo điểm ảnh (0..16). faces: bit 1 trên, 2 dưới,
 * 4 +X, 8 -X, 16 +Z, 32 -Z. Texture cắt đúng vị trí điểm ảnh.
 */
export function addBox(
  b: GeomBuilder, x: number, y: number, z: number,
  x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
  tex: BoxTex, light: readonly number[], faces = 63,
): void {
  const X0 = x + x0 / 16, X1 = x + x1 / 16, Y0 = y + y0 / 16, Y1 = y + y1 / 16, Z0 = z + z0 / 16, Z1 = z + z1 / 16;
  if (faces & 1) {
    setLight(light, 1);
    const [a, c, d, e] = sub(tex.top, x0, 16 - z1, x1, 16 - z0);
    face(b, [X0, Y1, Z1, X1, Y1, Z1, X1, Y1, Z0, X0, Y1, Z0], a, c, d, e);
  }
  if (faces & 2) {
    setLight(light, 0.5);
    const [a, c, d, e] = sub(tex.bottom, x0, z0, x1, z1);
    face(b, [X0, Y0, Z0, X1, Y0, Z0, X1, Y0, Z1, X0, Y0, Z1], a, c, d, e);
  }
  if (faces & 4) {
    setLight(light, 0.6);
    const [a, c, d, e] = sub(tex.side, 16 - z1, y0, 16 - z0, y1);
    face(b, [X1, Y0, Z1, X1, Y0, Z0, X1, Y1, Z0, X1, Y1, Z1], a, c, d, e);
  }
  if (faces & 8) {
    setLight(light, 0.6);
    const [a, c, d, e] = sub(tex.side, z0, y0, z1, y1);
    face(b, [X0, Y0, Z0, X0, Y0, Z1, X0, Y1, Z1, X0, Y1, Z0], a, c, d, e);
  }
  if (faces & 16) {
    setLight(light, 0.8);
    const [a, c, d, e] = sub(tex.side, x0, y0, x1, y1);
    face(b, [X0, Y0, Z1, X1, Y0, Z1, X1, Y1, Z1, X0, Y1, Z1], a, c, d, e);
  }
  if (faces & 32) {
    setLight(light, 0.8);
    const [a, c, d, e] = sub(tex.side, 16 - x1, y0, 16 - x0, y1);
    face(b, [X1, Y0, Z0, X0, Y0, Z0, X0, Y1, Z0, X1, Y1, Z0], a, c, d, e);
  }
}

/** Hàng rào: cột giữa + 2 thanh nối tới mỗi hướng có rào/khối đặc. conn: bit 1 +X, 2 -X, 4 +Z, 8 -Z. */
export function addFence(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[], conn: number): void {
  const t: BoxTex = { side: uv, top: uv, bottom: uv };
  addBox(b, x, y, z, 6, 10, 0, 16, 6, 10, t, light);
  for (const [y0, y1] of [[6, 9], [12, 15]] as const) {
    if (conn & 1) addBox(b, x, y, z, 10, 16, y0, y1, 7, 9, t, light, 1 | 2 | 16 | 32);
    if (conn & 2) addBox(b, x, y, z, 0, 6, y0, y1, 7, 9, t, light, 1 | 2 | 16 | 32);
    if (conn & 4) addBox(b, x, y, z, 7, 9, y0, y1, 10, 16, t, light, 1 | 2 | 4 | 8);
    if (conn & 8) addBox(b, x, y, z, 7, 9, y0, y1, 0, 6, t, light, 1 | 2 | 4 | 8);
  }
}

/** Que đuốc 2x10 điểm ảnh; texture đuốc ở cột 7–8, hàng 6–15 (từ trên xuống). */
export function addTorch(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[]): void {
  const tip = sub(uv, 7, 8, 9, 10);
  const top: TileUV = { u0: tip[0], v0: tip[1], u1: tip[2], v1: tip[3] };
  addBox(b, x, y, z, 7, 9, 0, 10, 7, 9, { side: uv, top, bottom: uv }, [light[0]!, 1], 1 | 4 | 8 | 16 | 32);
}

/** Đường ray: tấm sát sàn; rot xoay texture (0..3) theo chiều kim đồng hồ nhìn từ trên. */
export function addRail(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[], rot: number): void {
  setLight(light, 1);
  const h = y + 1 / 16;
  face(b, [x, h, z + 1, x + 1, h, z + 1, x + 1, h, z, x, h, z], uv.u0, uv.v0, uv.u1, uv.v1, rot);
  face(b, [x, h, z, x + 1, h, z, x + 1, h, z + 1, x, h, z + 1], uv.u0, uv.v1, uv.u1, uv.v0, (4 - rot) & 3);
}

/** Thang: tấm sát tường phía side (0 +X, 1 -X, 2 +Z, 3 -Z), vẽ cả hai mặt. */
export function addLadder(b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[], side: number): void {
  setLight(light, 0.8);
  const d = 1 / 16;
  const { u0, v0, u1, v1 } = uv;
  let p: number[];
  if (side === 0) p = [x + 1 - d, y, z + 1, x + 1 - d, y, z, x + 1 - d, y + 1, z, x + 1 - d, y + 1, z + 1];
  else if (side === 1) p = [x + d, y, z, x + d, y, z + 1, x + d, y + 1, z + 1, x + d, y + 1, z];
  else if (side === 2) p = [x, y, z + 1 - d, x + 1, y, z + 1 - d, x + 1, y + 1, z + 1 - d, x, y + 1, z + 1 - d];
  else p = [x + 1, y, z + d, x, y, z + d, x, y + 1, z + d, x + 1, y + 1, z + d];
  face(b, p, u0, v0, u1, v1);
  // mặt sau (đảo thứ tự đỉnh)
  face(b, [p[3]!, p[4]!, p[5]!, p[0]!, p[1]!, p[2]!, p[9]!, p[10]!, p[11]!, p[6]!, p[7]!, p[8]!], u1, v0, u0, v1);
}

/**
 * Đuốc gắn tường ở hướng wall (0 Nam +Z, 1 Tây −X, 2 Bắc −Z, 3 Đông +X): chân sát tường,
 * cao hơn sàn 3 điểm ảnh, nghiêng ra ngoài ~22°. Dựng cho tường phía +Z rồi xoay theo hướng.
 */
export function addTorchWall(
  b: GeomBuilder, x: number, y: number, z: number, uv: TileUV, light: readonly number[], wall: number,
): void {
  const th = 0.38, c = Math.cos(th), s = Math.sin(th);
  const bx = 0.5, by = 3 / 16, bz = 1 - 1.2 / 16;
  // (u ngang, h dọc thân đuốc, w dày) → tọa độ thế giới
  const P = (u: number, h: number, w: number): number[] => {
    const [rx, rz] = rotXZ(bx + u, bz - h * s + w * c, wall);
    return [x + rx, y + by + h * c + w * s, z + rz];
  };
  const a = 1 / 16, H = 10 / 16;
  const [su0, sv0, su1, sv1] = sub(uv, 7, 0, 9, 10);
  const [tu0, tv0, tu1, tv1] = sub(uv, 7, 8, 9, 10);
  setLight([light[0]!, 1], 0.9);
  face(b, [...P(-a, H, a), ...P(a, H, a), ...P(a, H, -a), ...P(-a, H, -a)], tu0, tv0, tu1, tv1);
  face(b, [...P(a, 0, a), ...P(a, 0, -a), ...P(a, H, -a), ...P(a, H, a)], su0, sv0, su1, sv1);
  face(b, [...P(-a, 0, -a), ...P(-a, 0, a), ...P(-a, H, a), ...P(-a, H, -a)], su0, sv0, su1, sv1);
  face(b, [...P(-a, 0, a), ...P(a, 0, a), ...P(a, H, a), ...P(-a, H, a)], su0, sv0, su1, sv1);
  face(b, [...P(a, 0, -a), ...P(-a, 0, -a), ...P(-a, H, -a), ...P(a, H, -a)], su0, sv0, su1, sv1);
}
