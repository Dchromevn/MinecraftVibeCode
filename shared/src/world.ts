// World: lưới chunk cố định 16x16, truy cập block theo tọa độ thế giới.
import { WORLD } from "./constants.js";
import { B, type BlockId } from "./blocks.js";
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk.js";

export const MAP_CHUNKS = WORLD.MAP_CHUNKS;
export const MAP_SIZE = WORLD.MAP_SIZE;

export interface LootChest {
  x: number;
  y: number;
  z: number;
  tier: "common" | "rare" | "epic";
}

export interface ChunkCoord {
  cx: number;
  cz: number;
}

export class World {
  readonly chunks: Chunk[] = [];
  /** Độ cao mặt đất (block cao nhất của địa hình gốc, chưa tính cây). */
  readonly heightmap = new Uint8Array(MAP_SIZE * MAP_SIZE);
  /** Rương kho báu sinh cùng thế giới (hầm mỏ...), Giai đoạn 6 sẽ điền đồ. */
  readonly lootChests: LootChest[] = [];
  /** Tâm các hầm mỏ (để debug / kiểm tra). */
  readonly mineshafts: { x: number; z: number; pieces: number }[] = [];
  seed = 0;

  constructor() {
    for (let cz = 0; cz < MAP_CHUNKS; cz++) {
      for (let cx = 0; cx < MAP_CHUNKS; cx++) {
        this.chunks.push(new Chunk(cx, cz));
      }
    }
  }

  static inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < MAP_SIZE && z < MAP_SIZE && y >= 0 && y < CHUNK_HEIGHT;
  }

  chunkAt(cx: number, cz: number): Chunk | null {
    if (cx < 0 || cz < 0 || cx >= MAP_CHUNKS || cz >= MAP_CHUNKS) return null;
    return this.chunks[cz * MAP_CHUNKS + cx] ?? null;
  }

  /** Ngoài biên trả về không khí. */
  getBlock(x: number, y: number, z: number): BlockId {
    if (!World.inBounds(x, y, z)) return B.AIR;
    const chunk = this.chunks[(z >> 4) * MAP_CHUNKS + (x >> 4)]!;
    return chunk.get(x & 15, y, z & 15);
  }

  /** Trả về false nếu ngoài biên. */
  setBlock(x: number, y: number, z: number, id: BlockId): boolean {
    if (!World.inBounds(x, y, z)) return false;
    const chunk = this.chunks[(z >> 4) * MAP_CHUNKS + (x >> 4)]!;
    chunk.set(x & 15, y, z & 15, id);
    return true;
  }

  heightAt(x: number, z: number): number {
    if (x < 0 || z < 0 || x >= MAP_SIZE || z >= MAP_SIZE) return 0;
    return this.heightmap[z * MAP_SIZE + x]!;
  }

  /** Chunk chứa block và các chunk kề nếu block nằm ở biên (để dựng lại mesh). */
  static affectedChunks(x: number, z: number): ChunkCoord[] {
    const cx = x >> 4;
    const cz = z >> 4;
    const lx = x & (CHUNK_SIZE - 1);
    const lz = z & (CHUNK_SIZE - 1);
    const out: ChunkCoord[] = [{ cx, cz }];
    if (lx === 0) out.push({ cx: cx - 1, cz });
    if (lx === CHUNK_SIZE - 1) out.push({ cx: cx + 1, cz });
    if (lz === 0) out.push({ cx, cz: cz - 1 });
    if (lz === CHUNK_SIZE - 1) out.push({ cx, cz: cz + 1 });
    return out.filter((c) => c.cx >= 0 && c.cz >= 0 && c.cx < MAP_CHUNKS && c.cz < MAP_CHUNKS);
  }
}
