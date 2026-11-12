// Tải / gỡ chunk theo bán kính tầm nhìn quanh camera. Sinh và dựng mesh trong
// worker; ưu tiên chunk gần và chunk trước mặt. Chunk đã sửa được giữ lại khi gỡ.
import { Chunk, WORLD, chunkKey, type ChunkData, type World } from "../../../shared/src/index.js";
import type { WorkerPool } from "../workers/workerPool.js";
import type { ChunkMeshes } from "./chunkMeshes.js";

/** Ánh sáng lan tối đa 14 ô; sửa block thì dựng lại các chunk trong bán kính này. */
const RELIGHT_RADIUS = 15;

interface Job {
  kind: "gen" | "mesh";
  cx: number;
  cz: number;
  priority: number; // nhỏ hơn = làm trước
}

export class ChunkManager {
  viewDistance: number = WORLD.VIEW_DISTANCE_DEFAULT;
  /** Dữ liệu của chunk đã sửa nhưng đang bị gỡ khỏi bộ nhớ. */
  readonly saved = new Map<number, ChunkData>();
  private readonly generating = new Set<number>();
  private readonly meshing = new Map<number, number>(); // key -> phiên bản đang dựng
  private readonly version = new Map<number, number>(); // tăng khi block đổi
  private readonly dirty = new Set<number>(); // cần dựng lại mesh
  private readonly urgent = new Map<number, number>(); // dựng lại ngay (do sửa block) -> độ ưu tiên

  constructor(
    readonly world: World,
    private readonly pool: WorkerPool,
    private readonly meshes: ChunkMeshes,
  ) {}

  get pendingGen(): number {
    return this.generating.size;
  }

  get pendingMesh(): number {
    return this.meshing.size;
  }

  /**
   * Gọi sau khi world.setBlock thành công. Ánh sáng có thể đổi tới 15 block quanh
   * đó (kể cả xuyên chunk), nên dựng lại mọi chunk trong phạm vi này; chunk chứa
   * block được dựng trước.
   */
  onBlockChanged(x: number, z: number): void {
    const r = RELIGHT_RADIUS;
    for (let cz = Math.floor((z - r) / 16); cz <= Math.floor((z + r) / 16); cz++)
      for (let cx = Math.floor((x - r) / 16); cx <= Math.floor((x + r) / 16); cx++) {
        const k = chunkKey(cx, cz);
        this.version.set(k, (this.version.get(k) ?? 0) + 1);
        this.dirty.add(k);
        this.urgent.set(k, cx === x >> 4 && cz === z >> 4 ? -2 : -1);
      }
  }

  update(camX: number, camZ: number, dirX: number, dirZ: number): void {
    const ccx = Math.floor(camX / 16), ccz = Math.floor(camZ / 16);
    const R = this.viewDistance;
    const unloadR = R + WORLD.UNLOAD_MARGIN;

    // 1. gỡ chunk và mesh ra ngoài bán kính + 2
    for (const [key, chunk] of this.world.chunks) {
      if (Math.hypot(chunk.cx - ccx, chunk.cz - ccz) <= unloadR + 0.5) continue;
      if (chunk.modified) this.saved.set(key, { data: chunk.data, meta: chunk.meta });
      this.world.removeChunk(chunk.cx, chunk.cz);
      this.meshes.remove(chunk.cx, chunk.cz);
      this.dirty.delete(key);
      this.urgent.delete(key);
    }
    for (const key of this.meshes.chunkKeys()) {
      if (this.world.chunks.has(key)) continue;
      const cx = Math.floor(key / 0x10000) - 0x8000, cz = (key % 0x10000) - 0x8000;
      this.meshes.remove(cx, cz);
    }

    // 2. lập danh sách việc
    const jobs: Job[] = [];
    const len = Math.hypot(dirX, dirZ) || 1;
    const fx = dirX / len, fz = dirZ / len;
    for (let dz = -R - 1; dz <= R + 1; dz++) {
      for (let dx = -R - 1; dx <= R + 1; dx++) {
        const dist = Math.hypot(dx, dz);
        if (dist > R + 1.5) continue;
        const cx = ccx + dx, cz = ccz + dz;
        const key = chunkKey(cx, cz);
        const front = dist < 1.5 || (dx * fx + dz * fz) / dist > 0.3;
        const priority = dist * (front ? 1 : 2.5);
        const chunk = this.world.chunks.get(key);
        if (!chunk) {
          const saved = this.saved.get(key);
          if (saved) {
            const c = new Chunk(cx, cz, saved);
            c.modified = true;
            this.world.addChunk(c);
            this.saved.delete(key);
          } else if (!this.generating.has(key)) {
            jobs.push({ kind: "gen", cx, cz, priority });
          }
          continue;
        }
        if (dist > R + 0.5 || this.meshing.has(key)) continue;
        if (this.meshes.has(key) && !this.dirty.has(key)) continue;
        if (!this.neighborsLoaded(cx, cz)) continue;
        jobs.push({ kind: "mesh", cx, cz, priority: this.urgent.get(key) ?? priority });
      }
    }

    // 3. giao việc theo thứ tự ưu tiên, giới hạn số việc đang chạy
    jobs.sort((a, b) => a.priority - b.priority);
    const limit = this.pool.size * 3;
    for (const job of jobs) {
      if (this.pool.inFlight >= limit && job.priority >= 0) break;
      if (job.kind === "gen") this.startGen(job.cx, job.cz);
      else this.startMesh(job.cx, job.cz);
    }
  }

  private neighborsLoaded(cx: number, cz: number): boolean {
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) if (!this.world.chunks.has(chunkKey(cx + dx, cz + dz))) return false;
    return true;
  }

  private startGen(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    this.generating.add(key);
    this.pool.run({ type: "gen", cx, cz }, (msg) => {
      this.generating.delete(key);
      if (msg.type !== "gen" || this.world.chunks.has(key)) return;
      // chunk ở xa (camera đã đi khỏi) sẽ bị gỡ ở lần cập nhật sau
      this.world.addChunk(new Chunk(cx, cz, msg.chunk));
    });
  }

  private startMesh(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const ver = this.version.get(key) ?? 0;
    this.meshing.set(key, ver);
    this.dirty.delete(key);
    this.urgent.delete(key);
    // bản sao 3x3 chunk (worker tính ánh sáng cả vùng rồi dựng chunk giữa)
    const chunks: (ChunkData | null)[] = [];
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.world.getChunk(cx + dx, cz + dz);
        chunks.push(c ? { data: c.data.slice(), meta: c.meta.slice() } : null);
      }
    const transfer: ArrayBuffer[] = [];
    for (const c of chunks) if (c) transfer.push(c.data.buffer as ArrayBuffer, c.meta.buffer as ArrayBuffer);
    this.pool.run(
      { type: "mesh", cx, cz, chunks },
      (msg) => {
        this.meshing.delete(key);
        if (msg.type !== "mesh" || !this.world.chunks.has(key)) return;
        this.meshes.set(cx, cz, msg.sections);
        this.world.getChunk(cx, cz)!.light = msg.light;
        // block đổi trong lúc đang dựng: dựng lại
        if ((this.version.get(key) ?? 0) !== ver) this.dirty.add(key);
      },
      transfer,
    );
  }

  /** Số chunk đã sửa (đang tải + đang gỡ), để HUD hiển thị. */
  modifiedCount(): number {
    let n = this.saved.size;
    for (const c of this.world.chunks.values()) if (c.modified) n++;
    return n;
  }
}
