// Sinh chunk Vực Lửa (Giai đoạn 10a — hoang mạc Vực Lửa), độc lập từng chunk từ seed + (cx, cz): hang khổng lồ bằng noise 3D
// (lấy mẫu lưới 4 × 8 × 4, nội suy), sàn / trần đặc dần, biển dung nham y ≤ 31, đá nền đáy và trần lởm chởm; bãi cát linh hồn / sỏi
// quanh mực dung nham; quặng thạch anh, quặng vàng Vực Lửa, khối magma; chùm đá phát sáng treo trần (lưới ô — vắt qua chunk vẫn liền);
// dòng dung nham chảy ra từ vách. (10b) 5 biome (netherBiomes.ts): khối mặt theo biome, nấm khổng lồ / cỏ / dây leo (netherFeatures.ts),
// cột bazan, hóa thạch, lửa linh hồn, vũng dung nham (netherSurface.ts).
import { B, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex, emptyChunkData, type ChunkData } from "../chunk.js";
import { NETHER } from "../netherConstants.js";
import { SimplexNoise2D } from "../noise.js";
import { SimplexNoise3D } from "../noise3d.js";
import { NB, NETHER_FEATURES, type NetherBiome } from "../netherBiomeConstants.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { NetherBiomes, netherSeed } from "./netherBiomes.js";
import { hugeFungi, netherVegetation, netherVines, type FeatureHost } from "./netherFeatures.js";
import { basaltFeatures, biomeSurface, soulValleyFeatures } from "./netherSurface.js";
import { FortressLocator } from "./fortressPlan.js";
import { paintFortresses } from "./fortressPaint.js";
import { BastionLocator, paintBastions } from "./bastionPlan.js";

const GX = 4, GY = 8;
const NX = 16 / GX + 1, NY = CHUNK_HEIGHT / GY + 1;
const smooth = (a: number, b: number, v: number): number => Math.max(0, Math.min(1, (v - a) / (b - a)));

export class NetherGenerator {
  readonly seed: number;
  private readonly n1: SimplexNoise3D;
  private readonly n2: SimplexNoise3D;
  private readonly patch: SimplexNoise2D;
  private readonly patch2: SimplexNoise2D;
  readonly biomes: NetherBiomes;
  /** (10c) Pháo đài Vực Lửa (theo seed + ô lưới). */
  readonly fortresses: FortressLocator;
  readonly bastions: BastionLocator; // (10d2)
  /** Mật độ ở điểm lưới đã tính (xóa mỗi lần sinh chunk) — dò nấm khổng lồ / đá phát sáng ở chunk bên cạnh không tính lại noise. */
  private readonly lattice = new Map<number, number>();
  private readonly host: FeatureHost;

  constructor(worldSeed: number) {
    this.seed = netherSeed(worldSeed);
    this.biomes = new NetherBiomes(this.seed);
    this.fortresses = new FortressLocator(this.seed);
    this.bastions = new BastionLocator(this.seed, (x, z) => this.biomes.at(x, z));
    this.host = { seed: this.seed, solidAt: (x, y, z) => this.solidAt(x, y, z), biome: (x, z) => this.biomes.at(x, z) };
    this.n1 = new SimplexNoise3D(mulberry32(hashInts(this.seed, 1)));
    this.n2 = new SimplexNoise3D(mulberry32(hashInts(this.seed, 2)));
    this.patch = new SimplexNoise2D(mulberry32(hashInts(this.seed, 3)));
    this.patch2 = new SimplexNoise2D(mulberry32(hashInts(this.seed, 4)));
  }

  /** Mật độ ở điểm lưới (thế giới): > 0 là đặc. */
  private density(x: number, y: number, z: number): number {
    const N = NETHER, f = N.NOISE_XZ, g = N.NOISE_Y;
    let d = this.n1.noise(x * f, y * g, z * f) * 0.75 + this.n2.noise(x * f * 3, y * g * 3, z * f * 3) * 0.25 + N.SOLID_BIAS;
    d += (1 - smooth(N.FLOOR_FADE[0], N.FLOOR_FADE[1], y)) ** 2 * 1.4; // sàn
    d += smooth(N.CEIL_FADE[0], N.CEIL_FADE[1], y) ** 2 * 1.4; // trần
    return d;
  }

  /** Mật độ ở điểm lưới (ix, iy, iz) có nhớ đệm. */
  private latticeAt(ix: number, iy: number, iz: number): number {
    const k = ((ix + 32768) * 65536 + (iz + 32768)) * 32 + iy;
    let v = this.lattice.get(k);
    if (v === undefined) this.lattice.set(k, (v = this.density(ix * GX, iy * GY, iz * GX)));
    return v;
  }

  /** Đặc / trống ở ô bất kỳ (nội suy từ 8 điểm lưới — khớp với generate). */
  solidAt(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return true;
    const ix = Math.floor(x / GX), iy = Math.floor(y / GY), iz = Math.floor(z / GX);
    const tx = (x - ix * GX) / GX, ty = (y - iy * GY) / GY, tz = (z - iz * GX) / GX;
    let v = 0;
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++)
        for (let c = 0; c < 2; c++)
          v += this.latticeAt(ix + a, iy + b, iz + c) * (a ? tx : 1 - tx) * (b ? ty : 1 - ty) * (c ? tz : 1 - tz);
    return v > 0;
  }

  /** Biome ở cột (x, z). */
  biomeAt(x: number, z: number): NetherBiome {
    return this.biomes.at(x, z);
  }

  generate(cx: number, cz: number): ChunkData {
    const out = emptyChunkData(), data = out.data, x0 = cx * 16, z0 = cz * 16, N = NETHER;
    if (this.lattice.size > 200000) this.lattice.clear();
    const lat = new Float32Array(NX * NY * NX), bio = new Uint8Array(256);
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NY; j++)
        for (let k = 0; k < NX; k++) lat[(i * NY + j) * NX + k] = this.latticeAt(cx * 4 + i, j, cz * 4 + k);
    const L = (i: number, j: number, k: number): number => lat[(i * NY + j) * NX + k]!;
    for (let lx = 0; lx < 16; lx++)
      for (let lz = 0; lz < 16; lz++) {
        const i = lx >> 2, k = lz >> 2, tx = (lx & 3) / GX, tz = (lz & 3) / GX, wx = x0 + lx, wz = z0 + lz;
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const j = y >> 3, ty = (y & 7) / GY;
          const v =
            (L(i, j, k) * (1 - tx) + L(i + 1, j, k) * tx) * (1 - tz) * (1 - ty) + (L(i, j, k + 1) * (1 - tx) + L(i + 1, j, k + 1) * tx) * tz * (1 - ty) +
            (L(i, j + 1, k) * (1 - tx) + L(i + 1, j + 1, k) * tx) * (1 - tz) * ty + (L(i, j + 1, k + 1) * (1 - tx) + L(i + 1, j + 1, k + 1) * tx) * tz * ty;
          let id: BlockId = v > 0 ? B.NETHERRACK : y <= N.LAVA_LEVEL ? B.LAVA : B.AIR;
          const h = hashInts(this.seed, wx, y, wz) / 4294967296;
          if (y === 0 || y === CHUNK_HEIGHT - 1 || (y <= N.BEDROCK_FLOOR && h < (N.BEDROCK_FLOOR + 1 - y) / (N.BEDROCK_FLOOR + 1)) ||
            (y >= N.BEDROCK_ROOF && h < (y - N.BEDROCK_ROOF + 1) / (CHUNK_HEIGHT - N.BEDROCK_ROOF))) id = B.BEDROCK;
          data[blockIndex(lx, y, lz)] = id;
        }
        const b = (bio[lx * 16 + lz] = this.biomes.at(wx, wz));
        if (b === NB.WASTES) this.surface(data, lx, lz, wx, wz);
        else biomeSurface(data, lx, lz, b, this.patch.noise(wx * 0.06, wz * 0.06), this.patch2.noise(wx * 0.09, wz * 0.09));
      }
    const rng = mulberry32(hashInts(this.seed, cx, cz, 5));
    this.veins(data, rng, B.NETHER_QUARTZ_ORE, N.QUARTZ);
    this.veins(data, rng, B.NETHER_GOLD_ORE, N.GOLD);
    this.veins(data, rng, B.MAGMA_BLOCK, N.MAGMA);
    this.springs(data, rng);
    this.glowstone(data, cx, cz);
    // (10b) đặc điểm theo biome (rng riêng: thêm đặc điểm không làm đổi quặng / dòng dung nham ở trên)
    const frng = mulberry32(hashInts(this.seed, cx, cz, 7));
    basaltFeatures(data, bio, frng, (id, tries, size) => this.veins(data, frng, id, { TRIES: tries, SIZE: size, Y: [N.BEDROCK_FLOOR + 1, N.BEDROCK_ROOF - 1] }));
    soulValleyFeatures(data, bio, frng);
    hugeFungi(data, cx, cz, this.host);
    netherVines(data, bio, frng);
    netherVegetation(data, bio, frng);
    this.debris(data, mulberry32(hashInts(this.seed, cx, cz, 11))); // (10d2) phế tích cổ (rng riêng)
    paintFortresses(data, out.meta, cx, cz, this.fortresses.near(x0, z0, x0 + 15, z0 + 15)); // (10c) pháo đài sau cùng
    paintBastions(data, out.meta, cx, cz, this.bastions.near(x0, z0, x0 + 15, z0 + 15)); // (10d2) tàn tích pháo đài lợn
    return out;
  }

  /** Bãi cát linh hồn / sỏi: mặt sàn (đá lửa ngục có khoảng trống / dung nham ở trên) quanh mực dung nham, dày 1–2. */
  private surface(data: Uint8Array, lx: number, lz: number, wx: number, wz: number): void {
    const soul = this.patch.noise(wx * 0.05, wz * 0.05) > 0.3, gravel = !soul && this.patch2.noise(wx * 0.07, wz * 0.07) > 0.45;
    if (!soul && !gravel) return;
    for (let y = NETHER.SURFACE_Y[1]; y >= NETHER.SURFACE_Y[0]; y--) {
      const i = blockIndex(lx, y, lz), above = data[blockIndex(lx, y + 1, lz)];
      if (data[i] !== B.NETHERRACK || (above !== B.AIR && above !== B.LAVA)) continue;
      data[i] = soul ? B.SOUL_SAND : B.GRAVEL;
      const j = blockIndex(lx, y - 1, lz);
      if (data[j] === B.NETHERRACK) data[j] = soul ? B.SOUL_SAND : B.GRAVEL;
    }
  }

  /** Cụm quặng / magma trong đá lửa ngục (gọn trong chunk). */
  private veins(data: Uint8Array, rng: Rng, id: BlockId, s: { TRIES: number; SIZE: number; Y: readonly [number, number] }): void {
    for (let a = 0; a < s.TRIES; a++) {
      let x = randInt(rng, 1, 14), y = randInt(rng, s.Y[0], s.Y[1]), z = randInt(rng, 1, 14);
      const n = randInt(rng, Math.ceil(s.SIZE / 3), s.SIZE);
      for (let k = 0; k < n; k++) {
        const i = blockIndex(x, y, z);
        if (data[i] === B.NETHERRACK) data[i] = id;
        const ax = randInt(rng, 0, 2), d = rng() < 0.5 ? -1 : 1;
        if (ax === 0) x = Math.max(0, Math.min(15, x + d));
        else if (ax === 1) y = Math.max(s.Y[0], Math.min(s.Y[1], y + d));
        else z = Math.max(0, Math.min(15, z + d));
      }
    }
  }

  /** (10d2) Phế tích cổ: mỗi chunk một cụm to + một cụm nhỏ trong đá lửa ngục / bazan / đá đen, ô nào kề không khí thì bỏ. */
  private debris(data: Uint8Array, rng: Rng): void {
    const base = (i: number): boolean => data[i] === B.NETHERRACK || data[i] === B.BASALT || data[i] === B.BLACKSTONE;
    for (const d of NETHER.DEBRIS) {
      const y0 = d.TRIANGLE ? Math.round((randInt(rng, d.Y[0], d.Y[1]) + randInt(rng, d.Y[0], d.Y[1])) / 2) : randInt(rng, d.Y[0], d.Y[1]);
      let x = randInt(rng, 1, 14), y = y0, z = randInt(rng, 1, 14);
      for (let k = randInt(rng, 1, d.SIZE); k > 0; k--) {
        const i = blockIndex(x, y, z);
        const open = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => data[blockIndex(x + a!, y + b!, z + c!)] === B.AIR);
        if (base(i) && !open) data[i] = B.ANCIENT_DEBRIS;
        const ax = randInt(rng, 0, 2), s = rng() < 0.5 ? -1 : 1;
        if (ax === 0) x = Math.max(1, Math.min(14, x + s));
        else if (ax === 1) y = Math.max(2, Math.min(120, y + s));
        else z = Math.max(1, Math.min(14, z + s));
      }
    }
  }

  /** Dòng dung nham: ô đá lửa ngục trên vách (trên đặc, bên cạnh trống) thành nguồn dung nham — server cho chảy. */
  private springs(data: Uint8Array, rng: Rng): void {
    for (let a = 0; a < NETHER.LAVA_SPRINGS; a++) {
      const x = randInt(rng, 1, 14), y = randInt(rng, NETHER.LAVA_LEVEL + 4, 115), z = randInt(rng, 1, 14);
      if (data[blockIndex(x, y, z)] !== B.NETHERRACK || data[blockIndex(x, y + 1, z)] !== B.NETHERRACK) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => data[blockIndex(x + dx!, y, z + dz!)] === B.AIR).length;
      if (open === 1) data[blockIndex(x, y, z)] = B.LAVA;
    }
  }

  /** Chùm đá phát sáng treo dưới trần: mỗi ô lưới GLOWSTONE.CELL có thể có một chùm; chunk nào cũng tính ra như nhau. */
  private glowstone(data: Uint8Array, cx: number, cz: number): void {
    const G = NETHER.GLOWSTONE, x0 = cx * 16, z0 = cz * 16;
    for (let gx = Math.floor((x0 - G.R) / G.CELL); gx <= Math.floor((x0 + 15 + G.R) / G.CELL); gx++)
      for (let gz = Math.floor((z0 - G.R) / G.CELL); gz <= Math.floor((z0 + 15 + G.R) / G.CELL); gz++) {
        const rng = mulberry32(hashInts(this.seed, gx, gz, 6));
        if (rng() >= G.CHANCE) continue;
        const x = gx * G.CELL + randInt(rng, 0, G.CELL - 1), z = gz * G.CELL + randInt(rng, 0, G.CELL - 1);
        if (this.biomes.at(x, z) === NB.SOUL_VALLEY && hashInts(this.seed, gx, gz, 8) / 4294967296 >= NETHER_FEATURES.GLOWSTONE_SOUL) continue;
        let top = -1; // trần: ô trống cao nhất ngay dưới khối đặc, trên mực dung nham
        for (let y = NETHER.BEDROCK_ROOF - 1; y > NETHER.LAVA_LEVEL + 6; y--)
          if (!this.solidAt(x, y, z) && this.solidAt(x, y + 1, z)) {
            top = y;
            break;
          }
        if (top < 0) continue;
        for (let dx = -G.R; dx <= G.R; dx++)
          for (let dz = -G.R; dz <= G.R; dz++)
            for (let dy = 0; dy < G.DROP; dy++) {
              const wx = x + dx, wz = z + dz, y = top - dy, lx = wx - x0, lz = wz - z0;
              if (lx < 0 || lz < 0 || lx > 15 || lz > 15) continue;
              const r = Math.hypot(dx, dz) + dy * 0.8, h = hashInts(this.seed, wx, y, wz, 9) / 4294967296;
              if (h > 1 - r / (G.R + 1.5)) continue;
              const i = blockIndex(lx, y, lz);
              if (data[i] === B.AIR) data[i] = B.GLOWSTONE;
            }
      }
  }
}
