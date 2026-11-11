// Tải / gỡ chunk theo bán kính tầm nhìn quanh camera. Sinh và dựng mesh trong
// worker; ưu tiên chunk gần và chunk trước mặt. Chunk đã sửa được giữ lại khi gỡ.
import { Chunk, World, WORLD, chunkKey, CHUNK_HEIGHT } from "../../../shared/src/index.js";
import { PAD, padIndex } from "../mesh/mesher.js";
import type { WorkerPool } from "../workers/workerPool.js";
import type { ChunkMeshes } from "./chunkMeshes.js";

interface Job {
  kind: "gen" | "mesh";
  cx: number;
  cz: number;
  priority: number; // nhỏ hơn = làm trước
}

export class ChunkManager {
  viewDistance: number = WORLD.VIEW_DISTANCE_DEFAULT;
  /** Dữ liệu của chunk đã sửa nhưng đang bị gỡ khỏi bộ nhớ. */
  readonly saved = new Map<number, Uint8Array>();
  private readonly generating = new Set<number>();
  private readonly meshing = new Map<number, number>(); // key -> phiên bản đang dựng
  private readonly version = new Map<number, number>(); // tăng khi block đổi
  private readonly dirty = new Set<number>(); // cần dựng lại mesh
  private readonly urgent = new Set<number>(); // dựng lại ngay (do sửa block)

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

  /** Gọi sau khi world.setBlock thành công. */
  onBlockChanged(x: number, z: number): void {
    for (const c of World.affectedChunks(x, z)) {
      const k = chunkKey(c.cx, c.cz);
      this.version.set(k, (this.version.get(k) ?? 0) + 1);
      this.dirty.add(k);
      this.urgent.add(k);
    }
  }

  update(camX: number, camZ: number, dirX: number, dirZ: number): void {
    const ccx = Math.floor(camX / 16), ccz = Math.floor(camZ / 16);
    const R = this.viewDistance;
    const unloadR = R + WORLD.UNLOAD_MARGIN;

    // 1. gỡ chunk và mesh ra ngoài bán kính + 2
    for (const [key, chunk] of this.world.chunks) {
      if (Math.hypot(chunk.cx - ccx, chunk.cz - ccz) <= unloadR + 0.5) continue;
      if (chunk.modified) this.saved.set(key, chunk.data);
      this.world.removeChunk(chunk.cx, chunk.cz);
      this.meshes.remove(key);
      this.dirty.delete(key);
      this.urgent.delete(key);
    }
    for (const key of [...this.meshes.keys()]) {
      if (!this.world.chunks.has(key)) this.meshes.remove(key);
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
        jobs.push({ kind: "mesh", cx, cz, priority: this.urgent.has(key) ? -1 : priority });
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
      this.world.addChunk(new Chunk(cx, cz, msg.data));
    });
  }

  private startMesh(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const ver = this.version.get(key) ?? 0;
    this.meshing.set(key, ver);
    this.dirty.delete(key);
    this.urgent.delete(key);
    const pad = this.buildPadded(cx, cz);
    this.pool.run(
      { type: "mesh", cx, cz, pad },
      (msg) => {
        this.meshing.delete(key);
        if (msg.type !== "mesh" || !this.world.chunks.has(key)) return;
        this.meshes.set(key, cx, cz, msg.mesh);
        // block đổi trong lúc đang dựng: dựng lại
        if ((this.version.get(key) ?? 0) !== ver) this.dirty.add(key);
      },
      [pad.buffer],
    );
  }

  /** Chunk + 1 block viền của 8 chunk kề, dạng 18 x 128 x 18. */
  private buildPadded(cx: number, cz: number): Uint8Array {
    const pad = new Uint8Array(PAD * PAD * CHUNK_HEIGHT);
    for (let pz = 0; pz < PAD; pz++) {
      for (let px = 0; px < PAD; px++) {
        const wx = cx * 16 + px - 1, wz = cz * 16 + pz - 1;
        const c = this.world.chunks.get(chunkKey(wx >> 4, wz >> 4));
        if (!c) continue;
        const lx = wx & 15, lz = wz & 15;
        for (let y = 0; y < CHUNK_HEIGHT; y++) pad[padIndex(px, y, pz)] = c.data[(y * 16 + lz) * 16 + lx]!;
      }
    }
    return pad;
  }

  /** Số chunk đã sửa (đang tải + đang gỡ), để HUD hiển thị. */
  modifiedCount(): number {
    let n = this.saved.size;
    for (const c of this.world.chunks.values()) if (c.modified) n++;
    return n;
  }
}
