// Thế giới phía server: sinh chunk quanh người chơi (theo seed, như client), ghi lại mọi block đã
// sửa theo chunk (danh sách "khác bản sinh gốc" — gửi cho client, Giai đoạn 5b lưu xuống đĩa),
// gom thay đổi trong tick để phát cho người chơi, tính ánh sáng cho random tick.
import {
  Chunk, NET, makeGenerator, type WorldGenerator, WORLDGEN_VERSION, World, blockIndex, buildRegion, centerLight, chunkKey, computeRegionLight,
  lightChanges, type BlockId, type ChunkData,
} from "../../shared/src/index.js";
import type { GenPool } from "./genPool.js";
import type { SavedChunk } from "./storage.js";

const keyCoords = (k: number): [number, number] => [Math.floor(k / 0x10000) - 0x8000, (k % 0x10000) - 0x8000];

export class ServerWorld {
  readonly world: World;
  private readonly gen: WorldGenerator;
  /** chunk → (chỉ số ô → cell) cho mọi ô đã đổi so với bản sinh gốc. */
  readonly edits = new Map<number, Map<number, number>>();
  /** [x, y, z, cell, ...] đã đổi trong tick này (phát cho người chơi rồi xóa). */
  private changes: number[] = [];
  private readonly lightDirty = new Set<number>();
  /** Chunk mới sinh trong tick (để quét chất lỏng hở). */
  readonly fresh: Chunk[] = [];
  /** Chunk có ô đổi từ lần lưu trước (Giai đoạn 5b). */
  private readonly dirty = new Set<number>();
  /** (7a) chunk vừa tải: động vật đã cất ở đó hoạt động lại, chunk mới thì sinh đàn động vật. */
  onChunkLoad: (cx: number, cz: number) => void = () => undefined;
  /** Luồng phụ sinh chunk / tính ánh sáng (server thật); null = làm ngay trên luồng chính (bài kiểm tra). */
  pool: GenPool | null = null;
  /** (8a) Trước khi sinh chunk: chốt mốc nhà tự lưu cho các vùng làng quanh nó. */
  beforeGen: (cx: number, cz: number) => void = () => {};
  private readonly genPending = new Set<number>();
  /** Chunk đã sửa vừa gỡ khỏi bộ nhớ: giữ nội dung tới lần lưu kế tiếp (khỏi sinh lại khi lưu — sửa ping 2026-11-14). */
  private readonly unloadedDirty = new Map<number, ChunkData>();
  private readonly lightPending = new Set<number>();
  /** (10a) Chunk đang được giữ (tải trước cho cổng): không gỡ dù không có người chơi gần. */
  private readonly pinned = new Map<number, number>();

  constructor(readonly seed: number, readonly dim = 0) {
    this.world = new World(seed);
    this.gen = makeGenerator(seed, dim); // (10a) thế giới chính / Vực Lửa
  }

  getCell(x: number, y: number, z: number): number {
    return this.world.getCell(x, y, z);
  }

  lightAt(x: number, y: number, z: number): number {
    return this.world.lightAt(x, y, z);
  }

  /** Đổi block (chỉ khi chunk đã tải); ghi lại để phát và lưu. */
  setCell(x: number, y: number, z: number, id: number, meta: number): boolean {
    const old = this.world.getCell(x, y, z);
    if (!this.world.setBlock(x, y, z, id as BlockId, meta)) return false;
    const cx = x >> 4, cz = z >> 4, k = chunkKey(cx, cz);
    let m = this.edits.get(k);
    if (!m) this.edits.set(k, (m = new Map()));
    m.set(blockIndex(x & 15, y, z & 15), id | (meta << 8));
    this.dirty.add(k);
    this.changes.push(x, y, z, id | (meta << 8));
    // tính lại ánh sáng chỉ khi đổi đáng kể (cùng quy tắc client): nước chảy, cỏ lan, cây lớn thì không —
    // mỗi lần tính lại vùng 3x3 tốn ~5 ms, nước tự chảy ở chunk mới tải từng làm tick server ~30 ms
    if (lightChanges(old, id | (meta << 8)))
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

  /**
   * Nạp chunk đã lưu (khởi động). Lưu bằng bộ sinh thế giới cũ thì tính lại danh sách ô đã sửa từ nguyên
   * nội dung chunk so với bộ sinh hiện tại (nhà đã xây giữ nguyên), rồi đánh dấu để lưu lại.
   */
  loadSaved(list: readonly SavedChunk[]): number {
    const old = list.filter((c) => c.worldgen !== WORLDGEN_VERSION).length, t0 = Date.now();
    if (old) console.log(`[server] đang chuyển ${old} chunk đã lưu sang bộ sinh thế giới mới (chỉ một lần, chờ chút)...`);
    let done = 0;
    for (const c of list) {
      const k = chunkKey(c.cx, c.cz), m = new Map<number, number>();
      if (c.worldgen === WORLDGEN_VERSION) for (let i = 0; i + 1 < c.edits.length; i += 2) m.set(c.edits[i]!, c.edits[i + 1]!);
      else {
        if (++done % 200 === 0) console.log(`[server]   ${done}/${old} chunk (${Math.round((Date.now() - t0) / 1000)} giây)`);
        const g = this.gen.generate(c.cx, c.cz);
        for (let i = 0; i < c.data.length; i++)
          if (c.data[i] !== g.data[i] || c.meta[i] !== g.meta[i]) m.set(i, c.data[i]! | (c.meta[i]! << 8));
        this.dirty.add(k);
      }
      if (m.size) this.edits.set(k, m);
    }
    if (old) console.log(`[server] đã chuyển xong ${old} chunk (${Math.round((Date.now() - t0) / 1000)} giây)`);
    return old;
  }

  /** Chunk cần lưu (đổi từ lần trước): danh sách ô đã sửa + nguyên nội dung. Gọi xong thì coi như đã lưu. */
  takeSaves(): SavedChunk[] {
    const out: SavedChunk[] = [];
    for (const k of this.dirty) {
      const [cx, cz] = keyCoords(k);
      const m = this.edits.get(k);
      const edits: number[] = [];
      if (m) for (const [i, c] of m) edits.push(i, c);
      let data: ChunkData;
      const loaded = this.world.getChunk(cx, cz), kept = this.unloadedDirty.get(k);
      if (loaded) data = { data: loaded.data.slice(), meta: loaded.meta.slice() };
      else if (kept) data = kept; // đã gồm các ô sửa
      else {
        data = this.gen.generate(cx, cz);
        for (let i = 0; i + 1 < edits.length; i += 2) {
          data.data[edits[i]!] = edits[i + 1]! & 255;
          data.meta[edits[i]!] = edits[i + 1]! >> 8;
        }
      }
      out.push({ cx, cz, worldgen: WORLDGEN_VERSION, edits, data: data.data, meta: data.meta });
    }
    this.dirty.clear();
    this.unloadedDirty.clear();
    return out;
  }

  private load(cx: number, cz: number): void {
    this.beforeGen(cx, cz);
    this.addGenerated(cx, cz, this.gen.generate(cx, cz));
  }

  /** Thêm chunk vừa sinh (áp các ô đã sửa, báo chunk tải, đánh dấu tính lại ánh sáng). */
  private addGenerated(cx: number, cz: number, data: ChunkData): void {
    this.unloadedDirty.delete(chunkKey(cx, cz)); // tải lại: bản đang giữ cũ hơn chunk sắp có
    const m = this.edits.get(chunkKey(cx, cz));
    if (m)
      for (const [i, c] of m) {
        data.data[i] = c & 255;
        data.meta[i] = c >> 8;
      }
    const chunk = new Chunk(cx, cz, data);
    this.world.addChunk(chunk);
    this.fresh.push(chunk);
    this.onChunkLoad(cx, cz);
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
    if (!this.pool) for (const [cx, cz] of want.slice(0, NET.GEN_PER_TICK)) this.load(cx, cz);
    else
      for (const [cx, cz] of want) {
        if (this.genPending.size >= NET.GEN_IN_FLIGHT) break;
        const k = chunkKey(cx, cz);
        if (this.genPending.has(k)) continue;
        this.genPending.add(k);
        this.beforeGen(cx, cz);
        this.pool.generate(cx, cz, (d) => {
          this.genPending.delete(k);
          if (!this.world.chunks.has(k)) this.addGenerated(cx, cz, d); // có thể đã tải đồng bộ (cellLoading) trong lúc chờ
        }, this.dim);
      }
    for (const chunk of [...this.world.chunks.values()]) {
      if (this.pinned.has(chunkKey(chunk.cx, chunk.cz))) continue;
      const near = centers.some((c) => Math.hypot(chunk.cx - c.cx, chunk.cz - c.cz) <= R + 2.5);
      if (near) continue;
      const k = chunkKey(chunk.cx, chunk.cz);
      if (this.dirty.has(k)) this.unloadedDirty.set(k, { data: chunk.data, meta: chunk.meta });
      this.world.removeChunk(chunk.cx, chunk.cz);
    }
  }

  /**
   * (10a) Tải trước các chunk [cx0..cx1] × [cz0..cz1] (luồng phụ nếu có — luồng chính không đứng hình), giữ chúng tới khi done chạy xong.
   * Không có luồng phụ (bộ kiểm tra): tải ngay, gọi done ngay.
   */
  preload(cx0: number, cz0: number, cx1: number, cz1: number, done: () => void): void {
    const keys: number[] = [];
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) keys.push(chunkKey(cx, cz));
    for (const k of keys) this.pinned.set(k, (this.pinned.get(k) ?? 0) + 1);
    const finish = (): void => {
      try {
        done();
      } finally {
        for (const k of keys) {
          const n = (this.pinned.get(k) ?? 1) - 1;
          if (n > 0) this.pinned.set(k, n);
          else this.pinned.delete(k);
        }
      }
    };
    const need = keys.filter((k) => !this.world.chunks.has(k));
    if (!this.pool) {
      for (const k of need) { const [cx, cz] = keyCoords(k); this.load(cx, cz); }
      return finish();
    }
    let left = need.length;
    if (!left) return finish();
    for (const k of need) {
      const [cx, cz] = keyCoords(k);
      this.beforeGen(cx, cz);
      this.pool.generate(cx, cz, (d) => {
        if (!this.world.chunks.has(k)) this.addGenerated(cx, cz, d);
        if (--left === 0) finish();
      }, this.dim);
    }
  }

  /** Ô ở (x, y, z), tải chunk nếu chưa có (kiểm tra giường ở xa khi hồi sinh — 7a). */
  cellLoading(x: number, y: number, z: number): number {
    const cx = x >> 4, cz = z >> 4;
    if (!this.world.chunks.has(chunkKey(cx, cz))) this.load(cx, cz);
    return this.world.getCell(x, y, z);
  }

  /** Tính lại ánh sáng các chunk vừa đổi (cần đủ 3x3 chunk), tối đa NET.LIGHT_PER_TICK mỗi lần. */
  updateLight(): void {
    let n = 0;
    for (const k of this.lightDirty) {
      if (this.pool ? this.lightPending.size >= NET.LIGHT_IN_FLIGHT : n >= NET.LIGHT_PER_TICK) break;
      if (this.lightPending.has(k)) continue; // đang tính ở luồng phụ: xong rồi tính lại
      const chunk = this.world.chunks.get(k);
      if (!chunk) {
        this.lightDirty.delete(k);
        continue;
      }
      const around: (ChunkData | null)[] = [];
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) around.push(this.world.getChunk(chunk.cx + dx, chunk.cz + dz) ?? null);
      if (around.some((c) => !c)) continue; // chờ chunk bên cạnh
      this.lightDirty.delete(k);
      if (this.pool) {
        this.lightPending.add(k);
        this.pool.light(buildRegion(around), (light) => {
          this.lightPending.delete(k);
          const c = this.world.chunks.get(k);
          if (c) c.light = light;
        });
      } else chunk.light = centerLight(computeRegionLight(buildRegion(around)));
      n++;
    }
  }
}
