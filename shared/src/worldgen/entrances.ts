// Cửa hang: mỗi vùng 64x64 có thể có một đường hầm đào chéo từ mặt đất xuống tới
// khi gặp hang noise. Kế hoạch (chuỗi khối cầu) chỉ phụ thuộc seed + tọa độ vùng;
// mỗi chunk đục phần khối cầu nằm trong nó.
import { CAVES } from "../constants.js";
import { hashInts, mulberry32 } from "../rng.js";
import { CaveField, type CaveSample } from "./caveField.js";
import type { TerrainSampler } from "./terrainSampler.js";

export interface Sphere {
  x: number;
  y: number;
  z: number;
  r: number;
}

const ER = CAVES.ENTRANCE_REGION;

export class EntrancePlanner {
  private readonly cache = new Map<string, Sphere[]>();
  private readonly s: CaveSample = { a: 0, b: 0, c: 0 };

  constructor(
    private readonly sampler: TerrainSampler,
    private readonly field: CaveField,
  ) {}

  /** Mọi khối cầu có thể chạm chunk (cx, cz). */
  spheresNear(cx: number, cz: number): Sphere[] {
    const out: Sphere[] = [];
    const reach = CAVES.ENTRANCE_MAX_REACH + 4;
    const x0 = cx * 16, z0 = cz * 16;
    for (let rz = Math.floor((z0 - reach) / ER); rz <= Math.floor((z0 + 16 + reach) / ER); rz++)
      for (let rx = Math.floor((x0 - reach) / ER); rx <= Math.floor((x0 + 16 + reach) / ER); rx++)
        for (const s of this.plan(rx, rz)) {
          if (s.x + s.r + 1 < x0 || s.x - s.r - 1 > x0 + 16 || s.z + s.r + 1 < z0 || s.z - s.r - 1 > z0 + 16) continue;
          out.push(s);
        }
    return out;
  }

  /** Có miệng hang gần (x, z) ở sát mặt đất không (để không trồng cây lên miệng hang). */
  mouthNear(x: number, z: number, surfaceY: number, radius: number): boolean {
    for (const s of this.spheresNear(x >> 4, z >> 4)) {
      if (s.y < surfaceY - 4) continue;
      if (Math.hypot(s.x - x - 0.5, s.z - z - 0.5) <= s.r + radius) return true;
    }
    return false;
  }

  plan(rx: number, rz: number): Sphere[] {
    const key = `${rx},${rz}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const spheres = this.dig(rx, rz);
    if (this.cache.size > 2048) this.cache.clear();
    this.cache.set(key, spheres);
    return spheres;
  }

  private dig(rx: number, rz: number): Sphere[] {
    const rng = mulberry32(hashInts(this.sampler.seed, rx, rz, 34));
    if (rng() >= CAVES.ENTRANCE_CHANCE) return [];
    const sx = rx * ER + 4 + Math.floor(rng() * (ER - 8));
    const sz = rz * ER + 4 + Math.floor(rng() * (ER - 8));
    const start = this.sampler.column(sx, sz);
    if (start.height <= start.waterTop + 1 || start.river) return []; // chỉ bắt đầu trên đất khô

    const out: Sphere[] = [];
    let px = sx + 0.5, py = start.height + 1, pz = sz + 0.5;
    let yaw = rng() * Math.PI * 2;
    let pitch = -(0.55 + rng() * 0.3);
    const radius = 1.6 + rng() * 0.7;
    let found = -1;
    for (let step = 0; step < CAVES.ENTRANCE_MAX_STEPS; step++) {
      const dx = Math.cos(yaw) * Math.cos(pitch);
      const dz = Math.sin(yaw) * Math.cos(pitch);
      const dy = Math.sin(pitch);
      const depth = this.sampler.column(Math.floor(px), Math.floor(pz)).height - py;
      // đã xuống đủ sâu: nhìn phía trước, nếu là hang noise thì nối vào rồi dừng
      if (found < 0 && depth > CAVES.SURFACE_MARGIN + 2) {
        const ax = Math.floor(px + dx * (radius + 1.5));
        const ay = Math.floor(py + dy * (radius + 1.5));
        const az = Math.floor(pz + dz * (radius + 1.5));
        this.field.sample(ax, ay, az, this.s);
        if (CaveField.carves(this.s, ay, this.sampler.column(ax, az).height - CAVES.SURFACE_MARGIN)) found = step;
      }
      if (found >= 0 && step - found > 2) break;
      // miệng hang loe rộng ở vài bước đầu để dễ thấy từ mặt đất
      out.push({ x: px, y: py, z: pz, r: radius * (1 + 0.6 * Math.max(0, 1 - step / 8)) });
      px += dx;
      py += dy;
      pz += dz;
      yaw += (rng() - 0.5) * 0.35;
      const target = depth > 14 ? -0.12 : -0.6; // càng sâu càng thoải
      pitch += (target - pitch) * 0.08 + (rng() - 0.5) * 0.05;
      if (Math.hypot(px - sx, pz - sz) > CAVES.ENTRANCE_MAX_REACH) break;
      if (py < CAVES.LAVA_MAX_Y + 4) break;
    }
    return out;
  }
}

/** Ô (x, y, z) có nằm trong khối cầu không (cùng công thức với lúc đục). */
export function inSphere(s: Sphere, x: number, y: number, z: number): boolean {
  const ox = x - Math.floor(s.x), oy = y - Math.floor(s.y), oz = z - Math.floor(s.z);
  return ox * ox + oy * oy * 1.3 + oz * oz <= s.r * s.r;
}
