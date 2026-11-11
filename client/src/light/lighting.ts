// Tính ánh sáng: trời chiếu thẳng xuống theo cột rồi lan ngang (flood fill),
// đuốc/dung nham lan theo flood fill. Có thể tính lại một vùng khi block đổi.
import { type World } from "../../../shared/src/index.js";
import { EMIT, H, IntQueue, LightMap, MAP_CHUNKS, OPACITY, S, SECTION_H, lightIndex, sectionKey } from "./lightMap.js";

const SS = S * S;
/** Bán kính vùng tính lại quanh block vừa đổi (ánh sáng lan tối đa 14 ô). */
export const RELIGHT_RADIUS = 15;

function idGetter(world: World): (x: number, y: number, z: number) => number {
  const chunks = world.chunks;
  return (x, y, z) => chunks[(z >> 4) * MAP_CHUNKS + (x >> 4)]!.data[(y * 16 + (z & 15)) * 16 + (x & 15)]!;
}

/** Tính ánh sáng cho toàn bản đồ. */
export function computeAllLight(world: World, light: LightMap): void {
  relightBox(world, light, 0, 0, S - 1, S - 1, null);
}

/**
 * Tính lại ánh sáng của block (x, y, z) vừa đổi.
 * Trả về các khóa đoạn có ánh sáng thay đổi (để dựng lại mesh).
 */
export function relightAround(world: World, light: LightMap, x: number, z: number): Set<number> {
  const changed = new Set<number>();
  const r = RELIGHT_RADIUS;
  relightBox(world, light, Math.max(0, x - r), Math.max(0, z - r), Math.min(S - 1, x + r), Math.min(S - 1, z + r), changed);
  return changed;
}

function markSections(changed: Set<number>, x: number, y: number, z: number): void {
  // ô này ảnh hưởng tới mặt của các block kề nó, nên đánh dấu cả đoạn kề nếu ở biên
  const cx0 = Math.max(0, (x - 1) >> 4), cx1 = Math.min(MAP_CHUNKS - 1, (x + 1) >> 4);
  const cz0 = Math.max(0, (z - 1) >> 4), cz1 = Math.min(MAP_CHUNKS - 1, (z + 1) >> 4);
  const sy0 = Math.max(0, Math.floor((y - 1) / SECTION_H)), sy1 = Math.min(H / SECTION_H - 1, Math.floor((y + 1) / SECTION_H));
  for (let sy = sy0; sy <= sy1; sy++)
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) changed.add(sectionKey(cx, sy, cz));
}

export function relightBox(
  world: World,
  light: LightMap,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  changed: Set<number> | null,
): void {
  const data = light.data;
  const idAt = idGetter(world);
  const bw = x1 - x0 + 1;
  const bl = z1 - z0 + 1;
  const old = changed ? new Uint8Array(bw * bl * H) : null;
  const skyQ = new IntQueue();
  const blockQ = new IntQueue();

  // 1. cột trời + nguồn sáng
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      let level = 15;
      for (let y = H - 1; y >= 0; y--) {
        const i = lightIndex(x, y, z);
        if (old) old[((y * bl) + (z - z0)) * bw + (x - x0)] = data[i]!;
        const id = idAt(x, y, z);
        const op = OPACITY[id]!;
        level = op >= 15 ? 0 : Math.max(0, level - op);
        const emit = EMIT[id]!;
        data[i] = (level << 4) | emit;
        if (emit > 1) blockQ.push(i);
      }
    }
  }

  // 2. hạt giống lan trời: ô sáng có hàng xóm ngang tối hơn
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      for (let y = H - 1; y >= 0; y--) {
        const i = lightIndex(x, y, z);
        const level = data[i]! >> 4;
        if (level < 2) continue;
        if (
          (x + 1 < S && (data[i + 1]! >> 4) < level - 1 && OPACITY[idAt(x + 1, y, z)]! < 15) ||
          (x > 0 && (data[i - 1]! >> 4) < level - 1 && OPACITY[idAt(x - 1, y, z)]! < 15) ||
          (z + 1 < S && (data[i + S]! >> 4) < level - 1 && OPACITY[idAt(x, y, z + 1)]! < 15) ||
          (z > 0 && (data[i - S]! >> 4) < level - 1 && OPACITY[idAt(x, y, z - 1)]! < 15)
        ) {
          skyQ.push(i);
        }
      }
    }
  }

  // 3. viền ngoài vùng (nếu không phải cả bản đồ): ánh sáng có sẵn lan vào
  if (x0 > 0 || z0 > 0 || x1 < S - 1 || z1 < S - 1) {
    const pushOutside = (x: number, z: number): void => {
      if (x < 0 || z < 0 || x >= S || z >= S) return;
      for (let y = 0; y < H; y++) {
        const i = lightIndex(x, y, z);
        if ((data[i]! >> 4) > 1) skyQ.push(i);
        if ((data[i]! & 15) > 1) blockQ.push(i);
      }
    };
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      pushOutside(x, z0 - 1);
      pushOutside(x, z1 + 1);
    }
    for (let z = z0; z <= z1; z++) {
      pushOutside(x0 - 1, z);
      pushOutside(x1 + 1, z);
    }
  }

  flood(world, data, skyQ, 4, changed, x0, z0, x1, z1);
  flood(world, data, blockQ, 0, changed, x0, z0, x1, z1);

  // 4. so sánh với giá trị cũ trong vùng
  if (old && changed) {
    for (let y = 0; y < H; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          if (old[((y * bl) + (z - z0)) * bw + (x - x0)] !== data[lightIndex(x, y, z)]) markSections(changed, x, y, z);
        }
  }
}

/** Lan sáng theo BFS. shift = 4 cho kênh trời, 0 cho kênh block. */
function flood(
  world: World,
  data: Uint8Array,
  q: IntQueue,
  shift: number,
  changed: Set<number> | null,
  bx0: number,
  bz0: number,
  bx1: number,
  bz1: number,
): void {
  const idAt = idGetter(world);
  const mask = 15 << shift;
  const keep = ~mask & 255;
  const tryN = (n: number, x: number, y: number, z: number, level: number): void => {
    const op = OPACITY[idAt(x, y, z)]!;
    if (op >= 15) return;
    const nl = level - 1 - op;
    if (nl <= 0 || nl <= ((data[n]! & mask) >> shift)) return;
    data[n] = (data[n]! & keep) | (nl << shift);
    q.push(n);
    // ô ngoài vùng tính lại cũng có thể sáng lên
    if (changed && (x < bx0 || x > bx1 || z < bz0 || z > bz1)) markSections(changed, x, y, z);
  };
  while (!q.empty) {
    const i = q.pop();
    const level = (data[i]! & mask) >> shift;
    if (level <= 1) continue;
    const x = i % S;
    const z = ((i - x) / S) % S;
    const y = Math.floor(i / SS);
    if (x + 1 < S) tryN(i + 1, x + 1, y, z, level);
    if (x > 0) tryN(i - 1, x - 1, y, z, level);
    if (z + 1 < S) tryN(i + S, x, y, z + 1, level);
    if (z > 0) tryN(i - S, x, y, z - 1, level);
    if (y + 1 < H) tryN(i + SS, x, y + 1, z, level);
    if (y > 0) tryN(i - SS, x, y - 1, z, level);
  }
}
