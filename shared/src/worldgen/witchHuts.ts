// Nhà phù thủy (Giai đoạn 7b, người dùng yêu cầu 2026-11-14: phù thủy chỉ sinh ở nhà phù thủy), trong đầm lầy như Minecraft.
// Nhà sàn gỗ thông trên cột gỗ sồi (cột cắm xuống tận đáy nước nếu đứng trên vũng), hiên trước có rào, mái ván thông, bàn chế
// tạo và một rương bên trong (người dùng yêu cầu). Mỗi vùng HUT.REGION × HUT.REGION có thể có một nhà (theo seed + tọa độ vùng) — chunk nào cũng tính ra cùng
// kết quả nên nhà vắt qua ranh giới chunk vẫn liền.
import { B } from "../blocks.js";
import { blockIndex } from "../chunk.js";
import { hashInts, mulberry32, randInt } from "../rng.js";
import { BIOME, type TerrainSampler } from "./terrainSampler.js";

export const HUT = {
  REGION: 256, // khoảng 1 nhà mỗi vùng 256 × 256 có đầm lầy
  CHANCE: 0.7,
  TRIES: 6,
  W: 7, // x 0..6
  D: 10, // z 0..9 (hiên z 0..2, nhà z 3..8, mái tới z 9)
  STILT: 3, // sàn cao hơn đất 3 block
  MAX_SLOPE: 4,
} as const;

export interface Hut {
  x: number; // góc nhỏ nhất
  z: number;
  floor: number; // y của sàn
}

const cache = new Map<string, Hut | null>();

/** Nhà phù thủy của vùng (rx, rz), hoặc null. */
export function hutOfRegion(sampler: TerrainSampler, rx: number, rz: number): Hut | null {
  const key = `${sampler.seed},${rx},${rz}`;
  if (cache.has(key)) return cache.get(key)!;
  let hut: Hut | null = null;
  const rng = mulberry32(hashInts(sampler.seed, rx, rz, 61));
  if (rng() < HUT.CHANCE)
    for (let t = 0; t < HUT.TRIES && !hut; t++) {
      const x = rx * HUT.REGION + randInt(rng, 16, HUT.REGION - 32), z = rz * HUT.REGION + randInt(rng, 16, HUT.REGION - 32);
      const cols = [[1, 0], [5, 0], [1, 8], [5, 8], [3, 5]].map(([dx, dz]) => sampler.column(x + dx!, z + dz!));
      // trong đầm lầy, không trên hồ lớn, nước dưới cột sâu tối đa 2
      if (cols.some((c) => c.biome !== BIOME.SWAMP || c.lake || c.waterTop - c.height > 2)) continue;
      const hs = cols.map((c) => Math.max(c.height, c.waterTop)); // trên vũng: tính từ mặt nước
      if (Math.max(...hs) - Math.min(...hs) > HUT.MAX_SLOPE || Math.max(...hs) + HUT.STILT > 118) continue;
      hut = { x, z, floor: Math.max(...hs) + HUT.STILT };
    }
  if (cache.size > 4096) cache.clear();
  cache.set(key, hut);
  return hut;
}

/** Các nhà phù thủy có phần nằm trong hình chữ nhật [x0..x1] × [z0..z1]. */
export function hutsIn(sampler: TerrainSampler, x0: number, z0: number, x1: number, z1: number): Hut[] {
  const out: Hut[] = [];
  for (let rx = Math.floor((x0 - HUT.W) / HUT.REGION); rx <= Math.floor(x1 / HUT.REGION); rx++)
    for (let rz = Math.floor((z0 - HUT.D) / HUT.REGION); rz <= Math.floor(z1 / HUT.REGION); rz++) {
      const h = hutOfRegion(sampler, rx, rz);
      if (h && h.x + HUT.W > x0 && h.x <= x1 && h.z + HUT.D > z0 && h.z <= z1) out.push(h);
    }
  return out;
}

/** Ô trong nhà (chỗ phù thủy sinh): x 2..4, z 4..7, chân ở sàn + 1. */
export const hutInside = (h: Hut): { x0: number; x1: number; z0: number; z1: number; y: number } =>
  ({ x0: h.x + 2, x1: h.x + 4, z0: h.z + 4, z1: h.z + 7, y: h.floor + 1 });

/** Đặt phần nhà phù thủy thuộc chunk (cx, cz) (sau cây: dọn lá / thân chắn trong lòng nhà). */
export function placeWitchHuts(sampler: TerrainSampler, data: Uint8Array, meta: Uint8Array, cx: number, cz: number): void {
  const X0 = cx * 16, Z0 = cz * 16;
  for (const h of hutsIn(sampler, X0, Z0, X0 + 15, Z0 + 15)) {
    const put = (dx: number, y: number, dz: number, id: number, m = 0): void => {
      const lx = h.x + dx - X0, lz = h.z + dz - Z0;
      if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y < 1 || y > 127) return;
      const i = blockIndex(lx, y, lz);
      data[i] = id;
      meta[i] = m;
    };
    const F = h.floor;
    // cột gỗ sồi từ mặt đất lên tới sàn (dưới hiên và bốn góc nhà)
    for (const [dx, dz] of [[1, 0], [5, 0], [1, 3], [5, 3], [1, 8], [5, 8]] as const) {
      const ground = sampler.column(h.x + dx, h.z + dz).height;
      for (let y = ground + 1; y < F; y++) put(dx, y, dz, B.LOG);
    }
    for (let dx = 1; dx <= 5; dx++) for (let dz = 0; dz <= 8; dz++) put(dx, F, dz, B.SPRUCE_PLANKS); // sàn + hiên
    for (let y = F + 1; y <= F + 3; y++)
      for (let dx = 1; dx <= 5; dx++)
        for (let dz = 3; dz <= 8; dz++) {
          const edgeX = dx === 1 || dx === 5, edgeZ = dz === 3 || dz === 8;
          if (!edgeX && !edgeZ) put(dx, y, dz, B.AIR); // lòng nhà
          else if (edgeX && edgeZ) put(dx, y, dz, B.LOG); // góc
          else put(dx, y, dz, B.SPRUCE_PLANKS);
        }
    put(3, F + 1, 3, B.AIR); // cửa ra hiên
    put(3, F + 2, 3, B.AIR);
    for (const dz of [5, 6]) {
      put(1, F + 2, dz, B.SPRUCE_FENCE); // cửa sổ
      put(5, F + 2, dz, B.SPRUCE_FENCE);
    }
    put(1, F + 1, 0, B.SPRUCE_FENCE); // lan can hiên
    put(5, F + 1, 0, B.SPRUCE_FENCE);
    for (let y = F + 1; y <= F + 3; y++) for (let dz = 0; dz <= 2; dz++) for (let dx = 2; dx <= 4; dx++) put(dx, y, dz, B.AIR);
    for (let dx = 0; dx <= 6; dx++) for (let dz = 2; dz <= 9; dz++) put(dx, F + 4, dz, B.SPRUCE_PLANKS); // mái
    put(2, F + 1, 7, B.WORKBENCH);
    put(4, F + 1, 7, B.CHEST, 2); // rương quay ra cửa (đồ: WITCH_HUT_LOOT)
  }
}
