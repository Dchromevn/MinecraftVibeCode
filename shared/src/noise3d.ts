// Simplex noise 3D có seed (theo Stefan Gustavson), dùng cho hang động.
import type { Rng } from "./rng.js";

const F3 = 1 / 3;
const G3 = 1 / 6;

const GRAD3: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

export class SimplexNoise3D {
  private readonly perm = new Uint8Array(512);
  private readonly permMod12 = new Uint8Array(512);

  constructor(rng: Rng) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i]!;
      p[i] = p[j]!;
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]!;
      this.permMod12[i] = this.perm[i]! % 12;
    }
  }

  /** Trả về khoảng xấp xỉ [-1, 1]. */
  noise(xin: number, yin: number, zin: number): number {
    const perm = this.perm;
    const pm = this.permMod12;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);

    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    const corner = (gi: number, x: number, y: number, z: number): number => {
      let tt = 0.6 - x * x - y * y - z * z;
      if (tt < 0) return 0;
      const g = GRAD3[gi]!;
      tt *= tt;
      return tt * tt * (g[0] * x + g[1] * y + g[2] * z);
    };

    const n0 = corner(pm[ii + perm[jj + perm[kk]!]!]!, x0, y0, z0);
    const n1 = corner(pm[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]!, x1, y1, z1);
    const n2 = corner(pm[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]!, x2, y2, z2);
    const n3 = corner(pm[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]!, x3, y3, z3);
    return 32 * (n0 + n1 + n2 + n3);
  }

  /** Hai octave, chuẩn hóa về khoảng [-1, 1]. */
  fbm2(x: number, y: number, z: number): number {
    return (this.noise(x, y, z) + 0.5 * this.noise(x * 2, y * 2, z * 2)) / 1.5;
  }
}
