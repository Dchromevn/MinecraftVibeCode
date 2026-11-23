// Đặc điểm rừng đỏ thẫm / cong vênh (Giai đoạn 10b): nấm khổng lồ (lưới ô theo seed, cây vắt qua chunk vẫn liền — chỗ mọc và độ cao
// tính bằng hình địa hình solidAt chứ không đọc chunk bên cạnh), cỏ Vực Lửa trên nylium (rễ, nấm nhỏ, mầm), cụm dây leo rủ dưới
// trần (đỏ thẫm, kèm mảng khối mụn) / dây xoắn mọc từ sàn (cong vênh).
import { B } from "../blocks.js";
import { blockIndex } from "../chunk.js";
import { NB, NETHER_FEATURES, type NetherBiome } from "../netherBiomeConstants.js";
import { NETHER } from "../netherConstants.js";
import { nyliumPlant } from "../netherPlants.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { fungusCells, fungusReplaces, fungusStem } from "./hugeFungus.js";

export interface FeatureHost {
  seed: number;
  /** Hình địa hình (chưa có khối mặt / đặc điểm) ở ô bất kỳ. */
  solidAt(x: number, y: number, z: number): boolean;
  biome(x: number, z: number): NetherBiome;
}

const HAT_R = 4; // bán kính mũ lớn nhất (thân 3 × 3: 3 + 1)
const TOP = NETHER.BEDROCK_ROOF - 2;

/** Nấm khổng lồ có gốc trong ô lưới (gx, gz) — tính giống nhau ở mọi chunk. */
function fungusAt(h: FeatureHost, gx: number, gz: number): { x: number; y: number; z: number; cells: ReturnType<typeof fungusCells> } | null {
  const F = NETHER_FEATURES.FUNGUS, rng = mulberry32(hashInts(h.seed, gx, gz, 21));
  if (rng() >= F.CHANCE) return null;
  const x = gx * F.CELL + randInt(rng, 0, F.CELL - 1), z = gz * F.CELL + randInt(rng, 0, F.CELL - 1);
  const b = h.biome(x, z);
  if (b !== NB.CRIMSON && b !== NB.WARPED) return null;
  // mặt sàn: dò xuống từ độ cao ngẫu nhiên, không thấy (độ cao rơi vào đá / dưới sàn) thì dò lên
  const t0 = randInt(rng, NETHER.LAVA_LEVEL + 3, 112), floor = (t: number): boolean => !h.solidAt(x, t, z) && h.solidAt(x, t - 1, z);
  let y = -1;
  for (let t = t0; t > NETHER.LAVA_LEVEL + 1 && y < 0; t--) if (floor(t)) y = t;
  for (let t = t0 + 1; t <= 112 && y < 0; t++) if (floor(t)) y = t;
  let stem = fungusStem(rng);
  const thick = rng() < F.THICK_CHANCE;
  if (y < 0) return null;
  let room = 0;
  while (room <= stem && y + room < TOP && !h.solidAt(x, y + room, z)) room++;
  stem = Math.min(stem, room - 1);
  if (stem < F.STEM[0]) return null;
  return { x, y, z, cells: fungusCells(b === NB.CRIMSON ? "crimson" : "warped", stem, thick, rng) };
}

/** Mọi nấm khổng lồ chạm chunk (cx, cz): chỉ đặt ô trong chunk, vào ô trống / cây nhỏ. */
export function hugeFungi(data: Uint8Array, cx: number, cz: number, h: FeatureHost): void {
  const C = NETHER_FEATURES.FUNGUS.CELL, x0 = cx * 16, z0 = cz * 16;
  for (let gx = Math.floor((x0 - HAT_R) / C); gx <= Math.floor((x0 + 15 + HAT_R) / C); gx++)
    for (let gz = Math.floor((z0 - HAT_R) / C); gz <= Math.floor((z0 + 15 + HAT_R) / C); gz++) {
      const f = fungusAt(h, gx, gz);
      if (!f) continue;
      for (const [dx, dy, dz, id] of f.cells) {
        const lx = f.x + dx - x0, lz = f.z + dz - z0, y = f.y + dy;
        if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y < 1 || y > TOP) continue;
        const i = blockIndex(lx, y, lz);
        if (fungusReplaces(data[i]!)) data[i] = id;
      }
    }
}

/** Cỏ Vực Lửa trên mặt nylium (mọi tầng sàn) của các cột rừng đỏ thẫm / cong vênh. */
export function netherVegetation(data: Uint8Array, bio: Uint8Array, rng: Rng): void {
  const V = NETHER_FEATURES.VEGETATION;
  for (let lx = 0; lx < 16; lx++)
    for (let lz = 0; lz < 16; lz++) {
      const b = bio[lx * 16 + lz];
      if (b !== NB.CRIMSON && b !== NB.WARPED) continue;
      for (let y = TOP; y > NETHER.LAVA_LEVEL; y--) {
        const s = data[blockIndex(lx, y, lz)]!;
        if ((s !== B.CRIMSON_NYLIUM && s !== B.WARPED_NYLIUM) || data[blockIndex(lx, y + 1, lz)] !== B.AIR) continue;
        if (rng() < (b === NB.CRIMSON ? V.CRIMSON : V.WARPED)) data[blockIndex(lx, y + 1, lz)] = nyliumPlant(s, rng);
      }
    }
}

/** Cụm dây leo: rủ dưới trần (đỏ thẫm, trần quanh gốc thành khối mụn) / xoắn mọc từ sàn (cong vênh). Gọn trong chunk. */
export function netherVines(data: Uint8Array, bio: Uint8Array, rng: Rng): void {
  const V = NETHER_FEATURES.VINES;
  for (let t = 0; t < V.TRIES * 2; t++) {
    const x = randInt(rng, V.SPREAD, 15 - V.SPREAD), z = randInt(rng, V.SPREAD, 15 - V.SPREAD), b = bio[x * 16 + z];
    const weeping = b === NB.CRIMSON;
    if ((!weeping && b !== NB.WARPED) || (t >= V.TRIES) === weeping) continue; // nửa đầu: dây rủ, nửa sau: dây xoắn
    const y0 = randInt(rng, NETHER.LAVA_LEVEL + 4, TOP - 2);
    const anchor = (lx: number, lz: number, from: number): number => { // ô trống sát trần / sàn gần from
      for (let d = 0; d < 12; d++)
        for (const y of [from + d, from - d]) {
          if (y <= NETHER.LAVA_LEVEL || y >= TOP) continue;
          const here = data[blockIndex(lx, y, lz)], next = data[blockIndex(lx, y + (weeping ? 1 : -1), lz)]!;
          if (here === B.AIR && next !== B.AIR && next !== B.LAVA && next !== B.WEEPING_VINES && next !== B.TWISTING_VINES) return y;
        }
      return -1;
    };
    const y = anchor(x, z, y0);
    if (y < 0) continue;
    for (let k = 0; k < V.PER; k++) {
      const px = x + randInt(rng, -V.SPREAD, V.SPREAD), pz = z + randInt(rng, -V.SPREAD, V.SPREAD), py = anchor(px, pz, y);
      if (py < 0 || Math.abs(py - y) > 4) continue;
      const base = blockIndex(px, py + (weeping ? 1 : -1), pz);
      if (weeping && data[base] === B.NETHERRACK && rng() < 0.6) data[base] = B.NETHER_WART_BLOCK;
      const id = weeping ? B.WEEPING_VINES : B.TWISTING_VINES, dy = weeping ? -1 : 1;
      for (let n = randInt(rng, V.LEN[0], V.LEN[1]), yy = py; n > 0 && yy > NETHER.LAVA_LEVEL && yy < TOP; n--, yy += dy) {
        const i = blockIndex(px, yy, pz);
        if (data[i] !== B.AIR) break;
        data[i] = id;
      }
    }
  }
}
