// Tải / gỡ chunk theo bán kính tầm nhìn quanh camera. Sinh và dựng mesh trong
// worker; ưu tiên chunk gần và chunk trước mặt. Giai đoạn 5a: chunk đã sửa không giữ ở client nữa —
// server gửi lại danh sách block đã sửa mỗi khi chunk được sinh lại (móc onGenStart / onAdded / onRemoved).
import { CHUNK_VOLUME, Chunk, WORLD, World, chunkKey, type ChunkData } from "../../../shared/src/index.js";
import type { WorkerPool } from "../workers/workerPool.js";
import type { ChunkMeshes } from "./chunkMeshes.js";

/** Ánh sáng lan tối đa 14 ô; sửa block thì dựng lại các chunk trong bán kính này. */
const RELIGHT_RADIUS = 15;
/** Thay đổi nền (do server: nước chảy, cây lớn...): mỗi chunk dựng lại tối đa một lần trong khoảng này. */
const BG_REMESH_MS = 250;
/** Dựng lại nền xếp sau việc sinh / dựng chunk mới ở gần (cộng vào độ ưu tiên, đơn vị chunk). */
const BG_PRIORITY = 4;
/** Số mảng chunk giữ lại để dùng lại khi gửi việc dựng mesh (mỗi việc cần 18 mảng). */
const SPARE_MAX = 18 * 16;

export interface BlockChangeOptions {
  /** Do chính người chơi (đào / đặt): dựng lại ngay, chen trước mọi việc. Mặc định true. */
  urgent?: boolean;
  /** Có thể đổi ánh sáng: dựng lại mọi chunk trong RELIGHT_RADIUS; không thì chỉ chunk chứa ô (và chunk kề nếu ô ở mép). */
  light?: boolean;
}

interface Job {
  kind: "gen" | "mesh";
  cx: number;
  cz: number;
  priority: number; // nhỏ hơn = làm trước
  bg?: boolean; // dựng lại nền (do server đổi block)
}

export class ChunkManager {
  viewDistance: number = WORLD.VIEW_DISTANCE_DEFAULT;
  /** Bắt đầu sinh chunk (đăng ký nhận block đã sửa từ server). */
  onGenStart: (cx: number, cz: number) => void = () => undefined;
  /** Chunk vừa vào thế giới (trước khi dựng mesh): áp block đã sửa đang chờ. */
  onAdded: (chunk: Chunk) => void = () => undefined;
  /** Chunk bị gỡ (hủy đăng ký). */
  onRemoved: (cx: number, cz: number) => void = () => undefined;
  /** Chunk đã sẵn sàng để dựng mesh (đã nhận ô đã sửa từ server). */
  isReady: (key: number) => boolean = () => true;
  private readonly generating = new Set<number>();
  private readonly meshing = new Map<number, number>(); // key -> phiên bản đang dựng
  private readonly version = new Map<number, number>(); // tăng khi block đổi
  private readonly dirty = new Set<number>(); // cần dựng lại mesh
  private readonly urgent = new Map<number, number>(); // dựng lại ngay (do sửa block) -> độ ưu tiên
  private readonly lastMesh = new Map<number, number>(); // lúc bắt đầu dựng mesh gần nhất (ms)
  /** Mảng CHUNK_VOLUME byte đã dùng xong (worker trả về), dùng lại để không cấp mới mỗi lần. */
  private readonly spare: Uint8Array[] = [];
  /** Chunk đang dựng lại nền: tối đa pool.size việc cùng lúc, chỗ còn lại dành cho sinh / dựng chunk mới. */
  private readonly bgRunning = new Set<number>();

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
  onBlockChanged(x: number, z: number, opt: BlockChangeOptions = {}): void {
    const urgent = opt.urgent ?? true;
    const mark = (cx: number, cz: number): void => {
      const k = chunkKey(cx, cz);
      this.version.set(k, (this.version.get(k) ?? 0) + 1);
      this.dirty.add(k);
      if (urgent) this.urgent.set(k, cx === x >> 4 && cz === z >> 4 ? -2 : -1);
    };
    if (opt.light === false) {
      for (const c of World.affectedChunks(x, z)) mark(c.cx, c.cz);
      return;
    }
    const r = RELIGHT_RADIUS;
    for (let cz = Math.floor((z - r) / 16); cz <= Math.floor((z + r) / 16); cz++)
      for (let cx = Math.floor((x - r) / 16); cx <= Math.floor((x + r) / 16); cx++) mark(cx, cz);
  }

  update(camX: number, camZ: number, dirX: number, dirZ: number): void {
    const ccx = Math.floor(camX / 16), ccz = Math.floor(camZ / 16);
    const R = this.viewDistance;
    const unloadR = R + WORLD.UNLOAD_MARGIN;

    // 1. gỡ chunk và mesh ra ngoài bán kính + 2
    for (const [key, chunk] of this.world.chunks) {
      if (Math.hypot(chunk.cx - ccx, chunk.cz - ccz) <= unloadR + 0.5) continue;
      this.world.removeChunk(chunk.cx, chunk.cz);
      this.onRemoved(chunk.cx, chunk.cz);
      this.meshes.remove(chunk.cx, chunk.cz);
      this.dirty.delete(key);
      this.urgent.delete(key);
      this.lastMesh.delete(key);
    }
    for (const key of this.meshes.chunkKeys()) {
      if (this.world.chunks.has(key)) continue;
      const cx = Math.floor(key / 0x10000) - 0x8000, cz = (key % 0x10000) - 0x8000;
      this.meshes.remove(cx, cz);
    }

    // 2. lập danh sách việc
    const jobs: Job[] = [];
    const now = performance.now();
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
          if (!this.generating.has(key)) jobs.push({ kind: "gen", cx, cz, priority });
          continue;
        }
        if (dist > R + 0.5 || this.meshing.has(key)) continue;
        const hasMesh = this.meshes.has(key);
        if (hasMesh && !this.dirty.has(key)) continue;
        if (!this.neighborsLoaded(cx, cz)) continue;
        const u = this.urgent.get(key);
        if (u !== undefined) jobs.push({ kind: "mesh", cx, cz, priority: u });
        else if (!hasMesh) jobs.push({ kind: "mesh", cx, cz, priority });
        // dựng lại nền: gộp nhiều thay đổi, không quá một lần mỗi BG_REMESH_MS
        else if (now - (this.lastMesh.get(key) ?? -Infinity) >= BG_REMESH_MS) jobs.push({ kind: "mesh", cx, cz, priority: priority + BG_PRIORITY, bg: true });
      }
    }

    // 3. giao việc theo thứ tự ưu tiên, giới hạn số việc đang chạy
    jobs.sort((a, b) => a.priority - b.priority);
    const limit = this.pool.size * 3;
    for (const job of jobs) {
      if (this.pool.inFlight >= limit && job.priority >= 0) break;
      if (job.bg && this.bgRunning.size >= this.pool.size) continue;
      if (job.kind === "gen") this.startGen(job.cx, job.cz);
      else this.startMesh(job.cx, job.cz, job.bg ?? false);
    }
  }

  private neighborsLoaded(cx: number, cz: number): boolean {
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const k = chunkKey(cx + dx, cz + dz);
        if (!this.world.chunks.has(k) || !this.isReady(k)) return false;
      }
    return true;
  }

  private startGen(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    this.generating.add(key);
    this.onGenStart(cx, cz);
    this.pool.run({ type: "gen", cx, cz }, (msg) => {
      this.generating.delete(key);
      if (msg.type !== "gen" || this.world.chunks.has(key)) return;
      // chunk ở xa (camera đã đi khỏi) sẽ bị gỡ ở lần cập nhật sau
      const c = new Chunk(cx, cz, msg.chunk);
      this.world.addChunk(c);
      this.onAdded(c);
    });
  }

  private startMesh(cx: number, cz: number, bg = false): void {
    const key = chunkKey(cx, cz);
    if (bg) this.bgRunning.add(key);
    const ver = this.version.get(key) ?? 0;
    this.meshing.set(key, ver);
    this.lastMesh.set(key, performance.now());
    this.dirty.delete(key);
    this.urgent.delete(key);
    // bản sao 3x3 chunk (worker tính ánh sáng cả vùng rồi dựng chunk giữa)
    const chunks: (ChunkData | null)[] = [];
    const copy = (src: Uint8Array): Uint8Array => {
      const b = this.spare.pop() ?? new Uint8Array(CHUNK_VOLUME);
      b.set(src);
      return b;
    };
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.world.getChunk(cx + dx, cz + dz);
        chunks.push(c ? { data: copy(c.data), meta: copy(c.meta) } : null);
      }
    const transfer: ArrayBuffer[] = [];
    for (const c of chunks) if (c) transfer.push(c.data.buffer as ArrayBuffer, c.meta.buffer as ArrayBuffer);
    this.pool.run(
      { type: "mesh", cx, cz, chunks },
      (msg) => {
        this.meshing.delete(key);
        this.bgRunning.delete(key);
        if (msg.type === "mesh")
          for (const c of msg.chunks) if (c && this.spare.length < SPARE_MAX) this.spare.push(c.data, c.meta);
        if (msg.type !== "mesh" || !this.world.chunks.has(key)) return;
        this.meshes.set(cx, cz, msg.sections);
        this.world.getChunk(cx, cz)!.light = msg.light;
        // block đổi trong lúc đang dựng: dựng lại
        if ((this.version.get(key) ?? 0) !== ver) this.dirty.add(key);
      },
      transfer,
    );
  }

  /** Số chunk đã sửa đang tải, để HUD hiển thị. */
  modifiedCount(): number {
    let n = 0;
    for (const c of this.world.chunks.values()) if (c.modified) n++;
    return n;
  }
}
