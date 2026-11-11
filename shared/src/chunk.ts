// Chunk 16 x 128 x 16, mỗi block 1 byte. Nhận diện bằng (cx, cz).
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

export class Chunk {
  /** Đã bị sửa so với bản sinh gốc (phải giữ lại khi gỡ khỏi bộ nhớ). */
  modified = false;

  constructor(
    readonly cx: number,
    readonly cz: number,
    readonly data: Uint8Array = new Uint8Array(CHUNK_VOLUME),
  ) {}

  /** Tọa độ cục bộ 0..15, 0..127. Không kiểm tra biên. */
  get(x: number, y: number, z: number): BlockId {
    return this.data[blockIndex(x, y, z)] as BlockId;
  }

  set(x: number, y: number, z: number, id: BlockId): void {
    this.data[blockIndex(x, y, z)] = id;
  }

  get key(): number {
    return chunkKey(this.cx, this.cz);
  }
}
