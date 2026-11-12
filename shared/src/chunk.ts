// Chunk 16 x 128 x 16: mỗi block 1 byte id + 1 byte dữ liệu phụ (hai mảng song song).
// Nhận diện bằng (cx, cz).
import { WORLD } from "./constants.js";
import type { BlockId } from "./blocks.js";

export const CHUNK_SIZE = WORLD.CHUNK_SIZE;
export const CHUNK_HEIGHT = WORLD.CHUNK_HEIGHT;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

/** Chỉ số trong mảng: x nhanh nhất, rồi z, rồi y. */
export function blockIndex(x: number, y: number, z: number): number {
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
}

/** Khóa số cho bảng băm chunk; hợp lệ với |cx|, |cz| < 32768 (±524.000 block). */
export function chunkKey(cx: number, cz: number): number {
  return (cx + 0x8000) * 0x10000 + (cz + 0x8000);
}

export function keyToCoord(key: number): { cx: number; cz: number } {
  return { cx: Math.floor(key / 0x10000) - 0x8000, cz: (key % 0x10000) - 0x8000 };
}

/** Dữ liệu thô của một chunk: id block và dữ liệu phụ cùng chỉ số. */
export interface ChunkData {
  data: Uint8Array;
  meta: Uint8Array;
}

export function emptyChunkData(): ChunkData {
  return { data: new Uint8Array(CHUNK_VOLUME), meta: new Uint8Array(CHUNK_VOLUME) };
}

export class Chunk implements ChunkData {
  /** Đã bị sửa so với bản sinh gốc (phải giữ lại khi gỡ khỏi bộ nhớ). */
  modified = false;
  /** Ánh sáng (4 bit trời | 4 bit block) worker trả về khi dựng mesh; null = chưa có. */
  light: Uint8Array | null = null;
  readonly data: Uint8Array;
  readonly meta: Uint8Array;

  constructor(readonly cx: number, readonly cz: number, src: ChunkData = emptyChunkData()) {
    this.data = src.data;
    this.meta = src.meta;
  }

  /** Tọa độ cục bộ 0..15, 0..127. Không kiểm tra biên. */
  get(x: number, y: number, z: number): BlockId {
    return this.data[blockIndex(x, y, z)] as BlockId;
  }

  getMeta(x: number, y: number, z: number): number {
    return this.meta[blockIndex(x, y, z)]!;
  }

  /** Ghi id + dữ liệu phụ (dữ liệu phụ đã được làm sạch ở World.setBlock). */
  set(x: number, y: number, z: number, id: BlockId, meta = 0): void {
    const i = blockIndex(x, y, z);
    this.data[i] = id;
    this.meta[i] = meta;
  }

  get key(): number {
    return chunkKey(this.cx, this.cz);
  }
}
