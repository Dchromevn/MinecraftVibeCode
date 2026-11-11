// Trường hang: noise 3D lấy mẫu trên lưới 4 block rồi nội suy. Chunk lẫn truy vấn
// từng điểm (bộ lập kế hoạch hầm mỏ, cửa hang) dùng cùng một hàm nội suy nên kết
// quả trùng khớp tuyệt đối. Chỉ phụ thuộc seed + tọa độ.
import { CAVES } from "../constants.js";
import { SimplexNoise3D } from "../noise3d.js";
import { hashInts, mulberry32 } from "../rng.js";

const G = CAVES.NOISE_GRID;
const GY = 128 / G + 1;

function trilerp(c: Float64Array, o: number, sx: number, sy: number, tx: number, ty: number, tz: number): number {
  // c[o + dx + dy*sx + dz*sx*sy] với dx,dy,dz ∈ {0,1}
  const c000 = c[o]!, c100 = c[o + 1]!, c010 = c[o + sx]!, c110 = c[o + sx + 1]!;
  const o1 = o + sx * sy;
  const c001 = c[o1]!, c101 = c[o1 + 1]!, c011 = c[o1 + sx]!, c111 = c[o1 + sx + 1]!;
  const x00 = c000 + (c100 - c000) * tx, x10 = c010 + (c110 - c010) * tx;
  const x01 = c001 + (c101 - c001) * tx, x11 = c011 + (c111 - c011) * tx;
  const y0 = x00 + (x10 - x00) * ty, y1 = x01 + (x11 - x01) * ty;
  return y0 + (y1 - y0) * tz;
}

/** Ba giá trị noise tại một ô (sợi mì a, b; phô mai c). */
export interface CaveSample {
  a: number;
  b: number;
  c: number;
}

export class CaveField {
  private readonly na: SimplexNoise3D;
  private readonly nb: SimplexNoise3D;
  private readonly nc: SimplexNoise3D;

  constructor(readonly seed: number) {
    this.na = new SimplexNoise3D(mulberry32(hashInts(seed, 31)));
    this.nb = new SimplexNoise3D(mulberry32(hashInts(seed, 32)));
    this.nc = new SimplexNoise3D(mulberry32(hashInts(seed, 33)));
  }

  /** Giá trị tại điểm lưới (gx, gy, gz) — tọa độ block = điểm lưới × 4. */
  private corner(gx: number, gy: number, gz: number, out: Float64Array, o: number, stride: number): void {
    const x = gx * G, y = gy * G, z = gz * G;
    const f = CAVES.NOODLE_FREQ, s = CAVES.NOODLE_Y_STRETCH, cf = CAVES.CHEESE_FREQ;
    out[o] = this.na.fbm2(x * f, y * f * s, z * f);
    out[o + stride] = this.nb.fbm2(x * f, y * f * s, z * f);
    out[o + 2 * stride] = this.nc.fbm2(x * cf, y * cf * 1.4, z * cf);
  }

  /** Lưới noise cho cả một chunk: 5 x 33 x 5 điểm, 3 trường. */
  chunkGrid(cx: number, cz: number): Float64Array {
    const n = 5 * GY * 5;
    const grid = new Float64Array(n * 3);
    for (let gz = 0; gz < 5; gz++)
      for (let gy = 0; gy < GY; gy++)
        for (let gx = 0; gx < 5; gx++) this.corner(cx * 4 + gx, gy, cz * 4 + gz, grid, (gz * GY + gy) * 5 + gx, n);
    return grid;
  }

  /** Nội suy trong lưới của chunk; lx, lz là tọa độ trong chunk. */
  static fromGrid(grid: Float64Array, lx: number, y: number, lz: number, out: CaveSample): void {
    const n = 5 * GY * 5;
    const gx = lx >> 2, gy = y >> 2, gz = lz >> 2;
    const o = (gz * GY + gy) * 5 + gx;
    const tx = (lx & 3) / 4, ty = (y & 3) / 4, tz = (lz & 3) / 4;
    out.a = trilerp(grid, o, 5, GY, tx, ty, tz);
    out.b = trilerp(grid, o + n, 5, GY, tx, ty, tz);
    out.c = trilerp(grid, o + 2 * n, 5, GY, tx, ty, tz);
  }

  private pointCache = new Map<number, Float64Array>();

  /** Truy vấn một điểm bất kỳ (dùng lưới của chunk chứa nó, có cache nhỏ). */
  sample(x: number, y: number, z: number, out: CaveSample): void {
    const cx = x >> 4, cz = z >> 4;
    const key = (cx + 0x8000) * 0x10000 + (cz + 0x8000);
    let grid = this.pointCache.get(key);
    if (!grid) {
      if (this.pointCache.size > 256) this.pointCache.clear();
      grid = this.chunkGrid(cx, cz);
      this.pointCache.set(key, grid);
    }
    CaveField.fromGrid(grid, x & 15, Math.max(0, Math.min(127, y)), z & 15, out);
  }

  /** Ô có bị đục bởi hang noise không. top = mặt đất của cột − SURFACE_MARGIN. */
  static carves(s: CaveSample, y: number, top: number): boolean {
    if (y < 1 || y > top) return false;
    const k = Math.min(1, (top - y) / CAVES.FADE_BAND); // thu hẹp dần gần mặt đất
    const r = CAVES.NOODLE_RADIUS * k;
    if (s.a * s.a + s.b * s.b < r * r) return true;
    if (y > CAVES.CHEESE_MAX_Y) return false;
    const kc = Math.min(k, (CAVES.CHEESE_MAX_Y - y) / CAVES.FADE_BAND, 1);
    const t0 = CAVES.CHEESE_THRESHOLD;
    return s.c > t0 + (1 - kc) * (1 - t0);
  }
}
