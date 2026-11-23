// Khối mặt theo biome Vực Lửa + đặc điểm thung lũng cát linh hồn / đồng bằng bazan (Giai đoạn 10b). Khối mặt: thung lũng — cát / đất
// linh hồn (sàn, mảng trần); rừng đỏ thẫm / cong vênh — nylium (sàn có không khí bên trên); đồng bằng bazan — bazan / đá đen (sàn),
// bazan (trần). Thung lũng: cột bazan trần → sàn, hóa thạch khối xương, lửa linh hồn. Đồng bằng bazan: cục bazan / đá đen trong đá
// lửa ngục, cột bazan đứng, vũng dung nham viền magma. Mọi thứ gọn trong chunk (không vắt qua ranh giới).
import { B, type BlockId } from "../blocks.js";
import { CHUNK_HEIGHT, blockIndex } from "../chunk.js";
import { NB, NETHER_FEATURES, type NetherBiome } from "../netherBiomeConstants.js";
import { NETHER } from "../netherConstants.js";
import { randInt, type Rng } from "../rng.js";

const TOP = NETHER.BEDROCK_ROOF - 2;
const at = (lx: number, y: number, lz: number): number => blockIndex(lx, y, lz);

/**
 * Khối mặt của một cột (sau khi đã có hình hang, trước quặng). noise: 2 giá trị noise mảng (−1..1) ở cột này.
 * Hoang mạc giữ cách cũ (bãi cát linh hồn / sỏi quanh mực dung nham — netherGen.ts).
 */
export function biomeSurface(data: Uint8Array, lx: number, lz: number, b: NetherBiome, n1: number, n2: number): void {
  if (b === NB.WASTES) return;
  for (let y = TOP; y > NETHER.BEDROCK_FLOOR; y--) {
    const i = at(lx, y, lz);
    if (data[i] !== B.NETHERRACK) continue;
    const up = data[at(lx, y + 1, lz)], down = data[at(lx, y - 1, lz)];
    const floor = up === B.AIR || up === B.LAVA, ceil = down === B.AIR;
    if (!floor && !ceil) continue;
    switch (b) {
      case NB.SOUL_VALLEY: {
        const id: BlockId = n1 > 0 ? B.SOUL_SAND : B.SOUL_SOIL;
        if (floor) for (let d = 0; d < 3 && data[at(lx, y - d, lz)] === B.NETHERRACK; d++) data[at(lx, y - d, lz)] = id;
        else if (n2 > 0.35) data[i] = B.SOUL_SOIL;
        break;
      }
      case NB.CRIMSON: case NB.WARPED:
        if (up === B.AIR && n2 > -0.55) data[i] = b === NB.CRIMSON ? B.CRIMSON_NYLIUM : B.WARPED_NYLIUM;
        break;
      case NB.BASALT:
        if (floor) {
          const id: BlockId = n1 > 0.1 ? B.BLACKSTONE : B.BASALT;
          for (let d = 0; d < 2 && data[at(lx, y - d, lz)] === B.NETHERRACK; d++) data[at(lx, y - d, lz)] = id;
        } else data[i] = n2 > 0.5 ? B.BLACKSTONE : B.BASALT;
        break;
    }
  }
}

/** Ô trống trên mặt sàn đầu tiên dò xuống từ y0 (trên mực dung nham), hoặc −1. */
function floorFrom(data: Uint8Array, lx: number, lz: number, y0: number): number {
  for (let y = Math.min(y0, TOP); y > NETHER.LAVA_LEVEL + 1; y--) {
    const below = data[at(lx, y - 1, lz)]!;
    if (data[at(lx, y, lz)] === B.AIR && below !== B.AIR && below !== B.LAVA) return y;
  }
  return -1;
}

/** Thung lũng cát linh hồn: cột bazan, hóa thạch, lửa linh hồn (bio: biome từng cột của chunk). */
export function soulValleyFeatures(data: Uint8Array, bio: Uint8Array, rng: Rng): void {
  const F = NETHER_FEATURES, isSV = (lx: number, lz: number): boolean => bio[lx * 16 + lz] === NB.SOUL_VALLEY;
  for (let t = 0; t < F.BASALT_PILLAR.TRIES; t++) { // cột bazan rủ từ trần xuống tới sàn
    const x = randInt(rng, 1, 14), z = randInt(rng, 1, 14);
    if (!isSV(x, z)) continue;
    let y = randInt(rng, NETHER.LAVA_LEVEL + 4, TOP - 2);
    while (y < TOP && !(data[at(x, y, z)] === B.AIR && data[at(x, y + 1, z)] !== B.AIR)) y++;
    if (y >= TOP) continue;
    for (let n = 0; n < F.BASALT_PILLAR.MAX && data[at(x, y, z)] === B.AIR; n++, y--) {
      data[at(x, y, z)] = B.BASALT;
      if (rng() < 0.15) { // bám thêm một ô bên cạnh
        const [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][randInt(rng, 0, 3)]!;
        if (data[at(x + dx!, y, z + dz!)] === B.AIR) data[at(x + dx!, y, z + dz!)] = B.BASALT;
      }
    }
  }
  if (rng() < F.FOSSIL_CHANCE) fossil(data, rng, isSV);
  for (let lx = 0; lx < 16; lx++)
    for (let lz = 0; lz < 16; lz++) {
      if (!isSV(lx, lz)) continue;
      for (let y = TOP; y > NETHER.LAVA_LEVEL; y--) {
        const s = data[at(lx, y, lz)];
        if ((s === B.SOUL_SAND || s === B.SOUL_SOIL) && data[at(lx, y + 1, lz)] === B.AIR && rng() < F.SOUL_FIRE) data[at(lx, y + 1, lz)] = B.SOUL_FIRE;
      }
    }
}

/** Hóa thạch: sống lưng khối xương nằm ngang, các cặp xương sườn cong xuống hai bên, vùi một phần trong sàn. */
function fossil(data: Uint8Array, rng: Rng, ok: (lx: number, lz: number) => boolean): void {
  const len = randInt(rng, 5, 9), alongX = rng() < 0.5, x = randInt(rng, 3, alongX ? 15 - len : 12), z = randInt(rng, 3, alongX ? 12 : 15 - len);
  if (!ok(x, z)) return;
  const fy = floorFrom(data, x, z, randInt(rng, NETHER.LAVA_LEVEL + 6, TOP - 6));
  if (fy < 0) return;
  const spineY = fy + randInt(rng, 1, 3), put = (a: number, y: number, side: number): void => {
    const lx = alongX ? x + a : x + side, lz = alongX ? z + side : z + a;
    if (lx < 0 || lz < 0 || lx > 15 || lz > 15 || y <= NETHER.LAVA_LEVEL || y >= TOP) return;
    const i = at(lx, y, lz);
    if (data[i] !== B.LAVA && data[i] !== B.BEDROCK) data[i] = B.BONE_BLOCK;
  };
  for (let a = 0; a < len; a++) {
    put(a, spineY, 0);
    if (a % 2 !== 0 || a === len - 1) continue;
    for (const s of [-1, 1]) { // xương sườn: ra 2 ô rồi cong xuống 3 ô
      put(a, spineY, s);
      put(a, spineY - 1, 2 * s);
      put(a, spineY - 2, 2 * s);
      put(a, spineY - 3, 2 * s);
    }
  }
  put(-1, spineY + 1, 0); // đầu
  put(-2, spineY + 1, 0);
}

/** Đồng bằng bazan: cục bazan / đá đen, cột bazan, vũng dung nham viền magma. */
export function basaltFeatures(data: Uint8Array, bio: Uint8Array, rng: Rng, veins: (id: BlockId, tries: number, size: number) => void): void {
  const F = NETHER_FEATURES, isB = (lx: number, lz: number): boolean => bio[lx * 16 + lz] === NB.BASALT;
  if (!isB(8, 8) && !isB(2, 2) && !isB(13, 13)) return;
  veins(B.BASALT, F.BLOBS.TRIES, F.BLOBS.SIZE);
  veins(B.BLACKSTONE, F.BLOBS.TRIES, F.BLOBS.SIZE);
  // vũng dung nham: ô sàn có 4 bên + dưới đặc thành nguồn dung nham, viền thành magma
  for (let t = 0; t < F.DELTA.TRIES; t++) {
    const x = randInt(rng, 2, 13), z = randInt(rng, 2, 13);
    if (!isB(x, z)) continue;
    const fy = floorFrom(data, x, z, randInt(rng, NETHER.LAVA_LEVEL + 3, TOP - 2)), y = fy - 1;
    if (fy < 0) continue;
    const r = randInt(rng, F.DELTA.R[0], F.DELTA.R[1]), pool: [number, number][] = [];
    const solid = (lx: number, yy: number, lz: number): boolean => {
      const v = data[at(lx, yy, lz)]!;
      return v !== B.AIR && v !== B.LAVA && v !== B.WEEPING_VINES && v !== B.TWISTING_VINES;
    };
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        const lx = x + dx, lz = z + dz;
        if (dx * dx + dz * dz > r * r + 1 || lx < 1 || lz < 1 || lx > 14 || lz > 14) continue;
        if (!solid(lx, y, lz) || data[at(lx, y + 1, lz)] !== B.AIR || !solid(lx, y - 1, lz)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, c]) => solid(lx + a!, y, lz + c!))) pool.push([lx, lz]);
      }
    for (const [lx, lz] of pool) data[at(lx, y, lz)] = B.LAVA;
    for (const [lx, lz] of pool) { // viền: ô sàn quanh vũng
      for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const j = at(lx + a, y, lz + c);
        if (data[j] !== B.LAVA && solid(lx + a, y, lz + c) && rng() < 0.8) data[j] = B.MAGMA_BLOCK;
      }
    }
  }
  // cột bazan đứng: nhỏ (1 × 1, cao 1–4), lớn (hình chữ thập, cao 4–10)
  const C = F.COLUMNS;
  for (let t = 0; t < C.SMALL + C.LARGE; t++) {
    const large = t >= C.SMALL, x = randInt(rng, 1, 14), z = randInt(rng, 1, 14);
    if (!isB(x, z)) continue;
    const fy = floorFrom(data, x, z, randInt(rng, NETHER.LAVA_LEVEL + 3, TOP - 2));
    if (fy < 0) continue;
    const H = large ? C.LARGE_H : C.SMALL_H;
    for (const [dx, dz] of large ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 0]]) {
      const h = randInt(rng, H[0], H[1]) - (dx || dz ? randInt(rng, 0, 3) : 0);
      for (let k = 0; k < h; k++) {
        const y = fy + k, i = at(x + dx!, y, z + dz!);
        if (y >= CHUNK_HEIGHT - 6 || data[i] !== B.AIR) break;
        data[i] = B.BASALT;
      }
    }
  }
}
