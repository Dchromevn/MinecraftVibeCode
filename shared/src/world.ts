// World vô hạn: bảng băm chunk theo (cx, cz). Chunk chưa tải coi như không khí.
import { B, type BlockId } from "./blocks.js";
import { Chunk, CHUNK_HEIGHT, chunkKey } from "./chunk.js";

export interface ChunkCoord {
  cx: number;
  cz: number;
}

export class World {
  readonly chunks = new Map<number, Chunk>();

  constructor(readonly seed: number) {}

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz));
  }

  addChunk(chunk: Chunk): void {
    this.chunks.set(chunk.key, chunk);
  }

  removeChunk(cx: number, cz: number): Chunk | undefined {
    const key = chunkKey(cx, cz);
    const c = this.chunks.get(key);
    this.chunks.delete(key);
    return c;
  }

  /** Ngoài chiều cao hoặc chunk chưa tải: trả về không khí. */
  getBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= CHUNK_HEIGHT) return B.AIR;
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    return c ? c.get(x & 15, y, z & 15) : B.AIR;
  }

  isLoaded(x: number, z: number): boolean {
    return this.chunks.has(chunkKey(x >> 4, z >> 4));
  }

  /** Trả về false nếu ngoài chiều cao hoặc chunk chưa tải. Đánh dấu chunk đã sửa. */
  setBlock(x: number, y: number, z: number, id: BlockId): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    if (!c) return false;
    c.set(x & 15, y, z & 15, id);
    c.modified = true;
    return true;
  }

  /** Chunk chứa block và các chunk kề (cả chéo) nếu block nằm ở biên — để dựng lại mesh. */
  static affectedChunks(x: number, z: number): ChunkCoord[] {
    const cx = x >> 4, cz = z >> 4;
    const lx = x & 15, lz = z & 15;
    const dxs = [0, ...(lx === 0 ? [-1] : lx === 15 ? [1] : [])];
    const dzs = [0, ...(lz === 0 ? [-1] : lz === 15 ? [1] : [])];
    const out: ChunkCoord[] = [];
    for (const dx of dxs) for (const dz of dzs) out.push({ cx: cx + dx, cz: cz + dz });
    return out;
  }
}
