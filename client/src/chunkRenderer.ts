// Quản lý mesh theo chunk: hàng đợi dựng/dựng lại theo ngân sách thời gian mỗi khung.
import * as THREE from "three";
import { Chunk, World } from "../../shared/src/index.js";
import type { Atlas } from "./atlas.js";
import { buildChunkGeometry } from "./mesher.js";

interface ChunkMeshes {
  opaque: THREE.Mesh | null;
  cutout: THREE.Mesh | null;
}

export class ChunkRenderer {
  private readonly meshes = new Map<string, ChunkMeshes>();
  private readonly queue: Chunk[] = [];
  private readonly queued = new Set<string>();
  private readonly opaqueMat: THREE.MeshBasicMaterial;
  private readonly cutoutMat: THREE.MeshBasicMaterial;

  /** Chunk thật sự được vẽ (qua frustum culling) trong khung hiện tại. Xóa trước mỗi lần render. */
  readonly drawnThisFrame = new Set<string>();
  /** Debug: mặt cắt ngang (xem mesher). Đổi giá trị thì gọi markAll(). */
  cutY: number | null = null;
  builtCount = 0;
  totalMeshMs = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
    private readonly atlas: Atlas,
  ) {
    this.opaqueMat = new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true });
    this.cutoutMat = new THREE.MeshBasicMaterial({
      map: atlas.texture,
      vertexColors: true,
      alphaTest: 0.5,
    });
  }

  get pending(): number {
    return this.queue.length;
  }

  markAll(): void {
    for (const c of this.world.chunks) this.enqueue(c);
  }

  markChunk(cx: number, cz: number): void {
    const c = this.world.chunkAt(cx, cz);
    if (c) this.enqueue(c);
  }

  /** Gọi sau khi world.setBlock: dựng lại chunk chứa block và chunk kề nếu ở biên. */
  markBlockChanged(x: number, z: number): void {
    for (const c of World.affectedChunks(x, z)) this.markChunk(c.cx, c.cz);
  }

  private enqueue(c: Chunk): void {
    const key = Chunk.key(c.cx, c.cz);
    if (this.queued.has(key)) return;
    this.queued.add(key);
    this.queue.push(c);
  }

  /** Dựng các chunk trong hàng đợi cho đến khi hết ngân sách (ms). */
  update(budgetMs: number): void {
    const start = performance.now();
    while (this.queue.length > 0 && performance.now() - start < budgetMs) {
      const chunk = this.queue.shift()!;
      this.queued.delete(Chunk.key(chunk.cx, chunk.cz));
      this.rebuild(chunk);
    }
  }

  private rebuild(chunk: Chunk): void {
    const key = Chunk.key(chunk.cx, chunk.cz);
    const t0 = performance.now();
    this.dispose(key);
    const geo = buildChunkGeometry(this.world, chunk, this.atlas, this.cutY);
    const entry: ChunkMeshes = { opaque: null, cutout: null };
    if (geo.opaque) entry.opaque = this.addMesh(key, geo.opaque, this.opaqueMat);
    if (geo.cutout) entry.cutout = this.addMesh(key, geo.cutout, this.cutoutMat);
    this.meshes.set(key, entry);
    this.builtCount++;
    this.totalMeshMs += performance.now() - t0;
  }

  private addMesh(key: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.onBeforeRender = () => {
      this.drawnThisFrame.add(key);
    };
    this.scene.add(mesh);
    return mesh;
  }

  private dispose(key: string): void {
    const old = this.meshes.get(key);
    if (!old) return;
    for (const m of [old.opaque, old.cutout]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose();
    }
    this.meshes.delete(key);
  }
}
