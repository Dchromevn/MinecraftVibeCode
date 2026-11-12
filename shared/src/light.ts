// Ánh sáng 16 mức cho một vùng 3x3 chunk (48 x 128 x 48): tính trong worker (client) và ở server (random tick).
// Ánh sáng lan tối đa 14 ô nên chunk giữa của vùng luôn đúng tuyệt đối — không cần
// lưu ánh sáng xuyên chunk. Mỗi byte: 4 bit cao = trời, 4 bit thấp = block.
import { B, BLOCKS } from "./blocks.js";
import { lightEmitOf } from "./blockMeta.js";
import { CHUNK_HEIGHT, type ChunkData } from "./chunk.js";

export const RW = 48; // bề rộng vùng (3 chunk)
export const RH = CHUNK_HEIGHT;
const LAYER = RW * RW;

const OPACITY = new Uint8Array(256);
const EMIT = new Uint8Array(256);
for (const b of BLOCKS) {
  OPACITY[b.id] = b.lightOpacity;
  EMIT[b.id] = b.lightEmit;
}

export function regionIndex(x: number, y: number, z: number): number {
  return (y * RW + z) * RW + x;
}

/** Hàng đợi số nguyên tự giãn. */
class IntQueue {
  private buf = new Int32Array(1 << 15);
  head = 0;
  tail = 0;
  push(v: number): void {
    if (this.tail === this.buf.length) {
      const next = new Int32Array(this.buf.length * 2);
      next.set(this.buf);
      this.buf = next;
    }
    this.buf[this.tail++] = v;
  }
  pop(): number {
    return this.buf[this.head++]!;
  }
  get empty(): boolean {
    return this.head >= this.tail;
  }
}

/** Vùng 3x3 chunk: id block và dữ liệu phụ theo regionIndex. */
export interface Region {
  blocks: Uint8Array;
  meta: Uint8Array;
}

/** Trả về ánh sáng cùng chỉ số với vùng. */
export function computeRegionLight({ blocks, meta }: Region): Uint8Array {
  const light = new Uint8Array(blocks.length);
  const skyQ = new IntQueue();
  const blockQ = new IntQueue();

  // 1. trời chiếu thẳng xuống theo cột; nguồn sáng block
  for (let z = 0; z < RW; z++)
    for (let x = 0; x < RW; x++) {
      let level = 15;
      for (let y = RH - 1; y >= 0; y--) {
        const i = regionIndex(x, y, z);
        const id = blocks[i]!;
        const op = OPACITY[id]!;
        level = op >= 15 ? 0 : Math.max(0, level - op);
        const emit = id === B.FURNACE ? lightEmitOf(id, meta[i]!) : EMIT[id]!; // lò chỉ sáng khi cháy
        light[i] = (level << 4) | emit;
        if (emit > 1) blockQ.push(i);
      }
    }

  // 2. hạt giống lan trời: ô sáng có hàng xóm ngang tối hơn (và không chặn sáng)
  for (let y = 0; y < RH; y++)
    for (let z = 0; z < RW; z++)
      for (let x = 0; x < RW; x++) {
        const i = regionIndex(x, y, z);
        const lv = light[i]! >> 4;
        if (lv < 2) continue;
        const t = lv - 1;
        if (
          (x + 1 < RW && light[i + 1]! >> 4 < t && OPACITY[blocks[i + 1]!]! < 15) ||
          (x > 0 && light[i - 1]! >> 4 < t && OPACITY[blocks[i - 1]!]! < 15) ||
          (z + 1 < RW && light[i + RW]! >> 4 < t && OPACITY[blocks[i + RW]!]! < 15) ||
          (z > 0 && light[i - RW]! >> 4 < t && OPACITY[blocks[i - RW]!]! < 15)
        )
          skyQ.push(i);
      }

  flood(blocks, light, skyQ, 4);
  flood(blocks, light, blockQ, 0);
  return light;
}

function flood(blocks: Uint8Array, light: Uint8Array, q: IntQueue, shift: number): void {
  const mask = 15 << shift;
  const keep = ~mask & 255;
  const tryN = (n: number, level: number): void => {
    const op = OPACITY[blocks[n]!]!;
    if (op >= 15) return;
    const nl = level - 1 - op;
    if (nl <= 0 || nl <= (light[n]! & mask) >> shift) return;
    light[n] = (light[n]! & keep) | (nl << shift);
    q.push(n);
  };
  while (!q.empty) {
    const i = q.pop();
    const level = (light[i]! & mask) >> shift;
    if (level <= 1) continue;
    const x = i % RW;
    const z = ((i - x) / RW) % RW;
    const y = Math.floor(i / LAYER);
    if (x + 1 < RW) tryN(i + 1, level);
    if (x > 0) tryN(i - 1, level);
    if (z + 1 < RW) tryN(i + RW, level);
    if (z > 0) tryN(i - RW, level);
    if (y + 1 < RH) tryN(i + LAYER, level);
    if (y > 0) tryN(i - LAYER, level);
  }
}

/** Cắt ánh sáng của chunk giữa (chỉ số như trong chunk: (y*16+z)*16+x). */
export function centerLight(light: Uint8Array): Uint8Array {
  const out = new Uint8Array(16 * RH * 16);
  for (let y = 0; y < RH; y++)
    for (let z = 0; z < 16; z++) {
      const src = regionIndex(16, y, 16 + z);
      out.set(light.subarray(src, src + 16), (y * 16 + z) * 16);
    }
  return out;
}

/** Ghép 3x3 chunk (thứ tự dz rồi dx, từ -1 tới 1) thành một vùng. Thiếu chunk = không khí. */
export function buildRegion(chunks: (ChunkData | null)[]): Region {
  const blocks = new Uint8Array(RW * RW * RH);
  const meta = new Uint8Array(RW * RW * RH);
  for (let dz = 0; dz < 3; dz++)
    for (let dx = 0; dx < 3; dx++) {
      const c = chunks[dz * 3 + dx];
      if (!c) continue;
      for (let y = 0; y < RH; y++)
        for (let lz = 0; lz < 16; lz++) {
          const src = (y * 16 + lz) * 16;
          const dst = regionIndex(dx * 16, y, dz * 16 + lz);
          blocks.set(c.data.subarray(src, src + 16), dst);
          meta.set(c.meta.subarray(src, src + 16), dst);
        }
    }
  return { blocks, meta };
}
