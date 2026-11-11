// Bản đồ ánh sáng 16 mức: 4 bit cao = ánh sáng trời, 4 bit thấp = ánh sáng block.
// Chỉ client dùng (để vẽ); server không cần.
import { BLOCKS, CHUNK_HEIGHT, MAP_SIZE, WORLD } from "../../../shared/src/index.js";

export const S = MAP_SIZE;
export const H = CHUNK_HEIGHT;
export const SECTION_H = WORLD.SECTION_HEIGHT;
export const SECTIONS_Y = H / SECTION_H;
export const MAP_CHUNKS = WORLD.MAP_CHUNKS;

export const OPACITY = new Uint8Array(256);
export const EMIT = new Uint8Array(256);
for (const b of BLOCKS) {
  OPACITY[b.id] = b.lightOpacity;
  EMIT[b.id] = b.lightEmit;
}

export function lightIndex(x: number, y: number, z: number): number {
  return (y * S + z) * S + x;
}

/** Khóa đoạn (section) 16x16xSECTION_H. */
export function sectionKey(cx: number, sy: number, cz: number): number {
  return (sy * MAP_CHUNKS + cz) * MAP_CHUNKS + cx;
}

export class LightMap {
  readonly data = new Uint8Array(S * S * H);

  /** Ngoài bản đồ theo chiều ngang hoặc trên đỉnh: trời sáng hẳn. Dưới đáy: tối. */
  sky(x: number, y: number, z: number): number {
    if (y >= H) return 15;
    if (y < 0) return 0;
    if (x < 0 || z < 0 || x >= S || z >= S) return 15;
    return this.data[lightIndex(x, y, z)]! >> 4;
  }

  block(x: number, y: number, z: number): number {
    if (y >= H || y < 0 || x < 0 || z < 0 || x >= S || z >= S) return 0;
    return this.data[lightIndex(x, y, z)]! & 15;
  }
}

/** Hàng đợi số nguyên tự giãn (BFS lan sáng). */
export class IntQueue {
  private buf = new Int32Array(1 << 16);
  head = 0;
  tail = 0;

  push(v: number): void {
    if (this.tail === this.buf.length) {
      if (this.head > 0) {
        this.buf.copyWithin(0, this.head, this.tail);
        this.tail -= this.head;
        this.head = 0;
      }
      if (this.tail === this.buf.length) {
        const next = new Int32Array(this.buf.length * 2);
        next.set(this.buf);
        this.buf = next;
      }
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
