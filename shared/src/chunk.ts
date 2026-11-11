// Chunk 16x16x64, mỗi block 1 byte.
import { WORLD } from "./constants.js";
import type { BlockId } from "./blocks.js";

export const CHUNK_SIZE = WORLD.CHUNK_SIZE;
export const CHUNK_HEIGHT = WORLD.CHUNK_HEIGHT;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

/** Chỉ số trong mảng: x nhanh nhất, rồi z, rồi y. */
export function blockIndex(x: number, y: number, z: number): number {
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
}

export class Chunk {
  readonly data = new Uint8Array(CHUNK_VOLUME);

  constructor(
    readonly cx: number,
    readonly cz: number,
  ) {}

  /** Tọa độ cục bộ 0..15, 0..63. Không kiểm tra biên. */
  get(x: number, y: number, z: number): BlockId {
    return this.data[blockIndex(x, y, z)] as BlockId;
  }

  set(x: number, y: number, z: number, id: BlockId): void {
    this.data[blockIndex(x, y, z)] = id;
  }

  /** Khóa duy nhất cho map. */
  static key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }
}
