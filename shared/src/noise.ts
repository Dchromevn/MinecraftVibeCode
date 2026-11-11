// Simplex noise 2D có seed (theo Stefan Gustavson), dùng cho địa hình.
import type { Rng } from "./rng.js";

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export class SimplexNoise2D {
  private readonly perm = new Uint8Array(512);

  constructor(rng: Rng) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i]!;
      p[i] = p[j]!;
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]!;
  }

  /** Trả về khoảng [-1, 1]. */
  noise(xin: number, yin: number): number {
    const perm = this.perm;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const g0 = GRAD[perm[ii + perm[jj]!]! & 7]!;
    const g1 = GRAD[perm[ii + i1 + perm[jj + j1]!]! & 7]!;
    const g2 = GRAD[perm[ii + 1 + perm[jj + 1]!]! & 7]!;

    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2); }

    return 70 * (n0 + n1 + n2);
  }

  /** Fractal Brownian motion, chuẩn hóa về khoảng [-1, 1]. */
  fbm(x: number, y: number, octaves: number, lacunarity = 2, persistence = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += this.noise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}
