// Hang động: "sợi mì" (giao của hai mặt noise 3D gần 0) + "phô mai" (hốc rộng)
// + cửa hang đào từ mặt đất xuống. Dưới LAVA_MAX_Y thì đục thành dung nham.
import { CAVES } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_HEIGHT } from "../chunk.js";
import { SimplexNoise3D } from "../noise3d.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { MAP_SIZE, World } from "../world.js";

const G = CAVES.NOISE_GRID;
const GX = MAP_SIZE / G + 1;
const GY = CHUNK_HEIGHT / G + 1;

/** Lưới noise thô, nội suy tuyến tính ba chiều khi đọc. */
class NoiseGrid {
  readonly v = new Float32Array(GX * GY * GX);

  constructor(fill: (x: number, y: number, z: number) => number) {
    let i = 0;
    for (let gy = 0; gy < GY; gy++)
      for (let gz = 0; gz < GX; gz++)
        for (let gx = 0; gx < GX; gx++) this.v[i++] = fill(gx * G, gy * G, gz * G);
  }

  /** Nội suy song tuyến theo x,z cho cả cột lưới; out[gy] = giá trị tại y = gy*G. */
  column(x: number, z: number, out: Float32Array): void {
    const fx = x / G, fz = z / G;
    const x0 = Math.floor(fx), z0 = Math.floor(fz);
    const tx = fx - x0, tz = fz - z0;
    const x1 = Math.min(x0 + 1, GX - 1), z1 = Math.min(z0 + 1, GX - 1);
    const v = this.v;
    for (let gy = 0; gy < GY; gy++) {
      const base = gy * GX * GX;
      const a = v[base + z0 * GX + x0]!, b = v[base + z0 * GX + x1]!;
      const c = v[base + z1 * GX + x0]!, d = v[base + z1 * GX + x1]!;
      const ab = a + (b - a) * tx, cd = c + (d - c) * tx;
      out[gy] = ab + (cd - ab) * tz;
    }
  }
}

/** Nội suy theo y trong cột đã tính sẵn. */
function colAt(col: Float32Array, y: number): number {
  const fy = y / G;
  const y0 = Math.floor(fy);
  const t = fy - y0;
  const a = col[y0]!;
  return a + (col[Math.min(y0 + 1, GY - 1)]! - a) * t;
}

function carveCell(world: World, x: number, y: number, z: number): void {
  if (y < 1) return;
  const id = world.getBlock(x, y, z);
  if (id === B.AIR || id === B.BEDROCK) return;
  world.setBlock(x, y, z, y <= CAVES.LAVA_MAX_Y ? B.LAVA : B.AIR);
}

export function carveNoiseCaves(world: World, seed: number): void {
  const nf = CAVES.NOODLE_FREQ;
  const ys = CAVES.NOODLE_Y_STRETCH;
  const cf = CAVES.CHEESE_FREQ;
  const a = new SimplexNoise3D(mulberry32(hashInts(seed, 31)));
  const b = new SimplexNoise3D(mulberry32(hashInts(seed, 32)));
  const c = new SimplexNoise3D(mulberry32(hashInts(seed, 33)));
  const gridA = new NoiseGrid((x, y, z) => a.fbm2(x * nf, y * nf * ys, z * nf));
  const gridB = new NoiseGrid((x, y, z) => b.fbm2(x * nf, y * nf * ys, z * nf));
  const gridC = new NoiseGrid((x, y, z) => c.fbm2(x * cf, y * cf * 1.4, z * cf));
  const r0 = CAVES.NOODLE_RADIUS;
  const t0 = CAVES.CHEESE_THRESHOLD;
  const colA = new Float32Array(GY);
  const colB = new Float32Array(GY);
  const colC = new Float32Array(GY);

  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const top = world.heightAt(x, z) - CAVES.SURFACE_MARGIN;
      gridA.column(x, z, colA);
      gridB.column(x, z, colB);
      gridC.column(x, z, colC);
      for (let y = 1; y <= top; y++) {
        // thu hẹp dần khi gần mặt đất để không có trần phẳng
        const k = Math.min(1, (top - y) / CAVES.FADE_BAND);
        const na = colAt(colA, y);
        const nb = colAt(colB, y);
        const r = r0 * k;
        let carve = na * na + nb * nb < r * r;
        if (!carve && y <= CAVES.CHEESE_MAX_Y) {
          const kc = Math.min(k, (CAVES.CHEESE_MAX_Y - y) / CAVES.FADE_BAND, 1);
          carve = colAt(colC, y) > t0 + (1 - kc) * (1 - t0);
        }
        if (carve) carveCell(world, x, y, z);
      }
    }
  }
}

/** Đào một đường hầm từ mặt đất đi chéo xuống cho tới khi gặp hang có sẵn. */
function digEntrance(world: World, rng: Rng, sx: number, sz: number): void {
  const surface = world.heightAt(sx, sz);
  let px = sx + 0.5, py = surface + 1, pz = sz + 0.5;
  let yaw = rng() * Math.PI * 2;
  let pitch = -(0.55 + rng() * 0.3);
  const radius = 1.6 + rng() * 0.7;
  let found = -1;

  for (let step = 0; step < CAVES.ENTRANCE_MAX_LENGTH; step++) {
    const dx = Math.cos(yaw) * Math.cos(pitch);
    const dz = Math.sin(yaw) * Math.cos(pitch);
    const dy = Math.sin(pitch);
    const depth = world.heightAt(Math.floor(px), Math.floor(pz)) - py;

    // đã xuống đủ sâu: nhìn phía trước, nếu là hang có sẵn thì nối vào rồi dừng
    if (found < 0 && depth > CAVES.SURFACE_MARGIN + 2) {
      const ax = Math.floor(px + dx * (radius + 1.5));
      const ay = Math.floor(py + dy * (radius + 1.5));
      const az = Math.floor(pz + dz * (radius + 1.5));
      const ahead = world.getBlock(ax, ay, az);
      if (ahead === B.AIR || ahead === B.LAVA) found = step;
    }
    if (found >= 0 && step - found > 2) return;

    // miệng hang loe rộng ở vài bước đầu để dễ thấy từ mặt đất
    const rad = radius * (1 + 0.6 * Math.max(0, 1 - step / 8));
    const r = Math.ceil(rad);
    for (let ox = -r; ox <= r; ox++)
      for (let oy = -r; oy <= r; oy++)
        for (let oz = -r; oz <= r; oz++) {
          if (ox * ox + oy * oy * 1.3 + oz * oz > rad * rad) continue;
          carveCell(world, Math.floor(px) + ox, Math.floor(py) + oy, Math.floor(pz) + oz);
        }

    px += dx;
    py += dy;
    pz += dz;
    yaw += (rng() - 0.5) * 0.35;
    // càng sâu càng thoải dần
    const target = depth > 14 ? -0.12 : -0.6;
    pitch += (target - pitch) * 0.08 + (rng() - 0.5) * 0.05;
    if (px < 3 || pz < 3 || px > MAP_SIZE - 3 || pz > MAP_SIZE - 3) return;
    if (py < CAVES.LAVA_MAX_Y + 4) return;
  }
}

export function carveEntrances(world: World, seed: number): void {
  const rng = mulberry32(hashInts(seed, 34));
  const s = CAVES.ENTRANCE_SPACING;
  const cells = Math.ceil(MAP_SIZE / s);
  const margin = 8;
  for (let gz = 0; gz < cells; gz++) {
    for (let gx = 0; gx < cells; gx++) {
      const x0 = Math.max(margin, gx * s);
      const z0 = Math.max(margin, gz * s);
      const x1 = Math.min(MAP_SIZE - margin, (gx + 1) * s);
      const z1 = Math.min(MAP_SIZE - margin, (gz + 1) * s);
      const roll = rng();
      // ô ở mép bản đồ nhỏ hơn thì ít cơ hội hơn, giữ mật độ ~1 / (60x60)
      if (x1 <= x0 || z1 <= z0 || roll > ((x1 - x0) * (z1 - z0)) / (s * s)) continue;
      const x = randInt(rng, x0, x1 - 1);
      const z = randInt(rng, z0, z1 - 1);
      digEntrance(world, rng, x, z);
    }
  }
}
