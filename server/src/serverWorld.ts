// Thế giới phía server: sinh chunk quanh người chơi (theo seed, như client), ghi lại mọi block đã
// sửa theo chunk (danh sách "khác bản sinh gốc" — gửi cho client, Giai đoạn 5b lưu xuống đĩa),
// gom thay đổi trong tick để phát cho người chơi, tính ánh sáng cho random tick.
import {
  Chunk, ChunkGenerator, NET, World, blockIndex, buildRegion, centerLight, chunkKey, computeRegionLight,
  type BlockId, type ChunkData,
} from "../../shared/src/index.js";

export class ServerWorld {
  readonly world: World;
  private readonly gen: ChunkGenerator;
  /** chunk → (chỉ số ô → cell) cho mọi ô đã đổi so với bản sinh gốc. */
  readonly edits = new Map<number, Map<number, number>>();
  /** [x, y, z, cell, ...] đã đổi trong tick này (phát cho người chơi rồi xóa). */
  private changes: number[] = [];
  private readonly lightDirty = new Set<number>();
  /** Chunk mới sinh trong tick (để quét chất lỏng hở). */
  readonly fresh: Chunk[] = [];

  constructor(readonly seed: number) {
    this.world = new World(seed);
    this.gen = new ChunkGenerator(seed);
  }

  getCell(x: number, y: number, z: number): number {
    return this.world.getCell(x, y, z);
  }

  lightAt(x: number, y: number, z: number): number {
    return this.world.lightAt(x, y, z);
  }

  /** Đổi block (chỉ khi chunk đã tải); ghi lại để phát và lưu. */
  setCell(x: number, y: number, z: number, id: number, meta: number): boolean {
    if (!this.world.setBlock(x, y, z, id as BlockId, meta)) return false;
    const cx = x >> 4, cz = z >> 4, k = chunkKey(cx, cz);
    let m = this.edits.get(k);
    if (!m) this.edits.set(k, (m = new Map()));
    m.set(blockIndex(x & 15, y, z & 15), id | (meta << 8));
    this.changes.push(x, y, z, id | (meta << 8));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.lightDirty.add(chunkKey(cx + dx, cz + dz));
    return true;
  }

  takeChanges(): number[] {
    const c = this.changes;
    this.changes = [];
    return c;
  }

  /** Danh sách ô đã sửa của chunk: [chỉ số, cell, ...] (rỗng nếu chưa sửa gì). */
  editsOf(cx: number, cz: number): number[] {
    const m = this.edits.get(chunkKey(cx, cz));
    if (!m) return [];
    const out: number[] = [];
    for (const [i, c] of m) out.push(i, c);
    return out;
  }

  private load(cx: number, cz: number): void {
    const data: ChunkData = this.gen.generate(cx, cz);
    const m = this.edits.get(chunkKey(cx, cz));
    if (m)
      for (const [i, c] of m) {
        data.data[i] = c & 255;
        data.meta[i] = c >> 8;
      }
    const chunk = new Chunk(cx, cz, data);
    this.world.addChunk(chunk);
    this.fresh.push(chunk);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.lightDirty.add(chunkKey(cx + dx, cz + dz));
  }

  /**
   * Tải chunk trong NET.SIM_RADIUS quanh các người chơi (gần trước, tối đa NET.GEN_PER_TICK mỗi lần),
   * gỡ chunk xa mọi người chơi (block đã sửa vẫn giữ trong edits).
   */
  updateLoaded(centers: readonly { cx: number; cz: number }[]): void {
    const R = NET.SIM_RADIUS;
    const want: [number, number, number][] = [];
    const seen = new Set<number>();
    for (const c of centers)
      for (let dz = -R; dz <= R; dz++)
        for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dz);
          if (d > R + 0.5) continue;
          const k = chunkKey(c.cx + dx, c.cz + dz);
          if (seen.has(k) || this.world.chunks.has(k)) continue;
          seen.add(k);
          want.push([c.cx + dx, c.cz + dz, d]);
        }
    want.sort((a, b) => a[2] - b[2]);
    for (const [cx, cz] of want.slice(0, NET.GEN_PER_TICK)) this.load(cx, cz);
    for (const chunk of [...this.world.chunks.values()]) {
      const near = centers.some((c) => Math.hypot(chunk.cx - c.cx, chunk.cz - c.cz) <= R + 2.5);
      if (!near) this.world.removeChunk(chunk.cx, chunk.cz);
    }
  }

  /** Tính lại ánh sáng các chunk vừa đổi (cần đủ 3x3 chunk), tối đa NET.LIGHT_PER_TICK mỗi lần. */
  updateLight(): void {
    let n = 0;
    for (const k of this.lightDirty) {
      if (n >= NET.LIGHT_PER_TICK) break;
      const chunk = this.world.chunks.get(k);
      if (!chunk) {
        this.lightDirty.delete(k);
        continue;
      }
      const around: (ChunkData | null)[] = [];
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) around.push(this.world.getChunk(chunk.cx + dx, chunk.cz + dz) ?? null);
      if (around.some((c) => !c)) continue; // chờ chunk bên cạnh
      chunk.light = centerLight(computeRegionLight(buildRegion(around)));
      this.lightDirty.delete(k);
      n++;
    }
  }
}
