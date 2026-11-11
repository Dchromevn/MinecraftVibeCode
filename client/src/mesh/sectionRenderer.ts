// Quản lý mesh theo đoạn 16 x SECTION_H x 16: hàng đợi dựng lại theo ngân sách
// thời gian, ẩn đoạn khuất (hang) bằng SectionCuller.
import * as THREE from "three";
import { BLOCKS, World, type World as WorldT } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { MAP_CHUNKS, SECTIONS_Y, SECTION_H, sectionKey, type LightMap } from "../light/lightMap.js";
import { buildSectionGeometry } from "./mesher.js";
import { SectionCuller, computeConnectivity } from "./visibility.js";

/** Thêm uniform uMinLight: màu đỉnh = max(màu đỉnh, uMinLight). Không cần dựng lại mesh. */
function withMinLight(mat: THREE.MeshBasicMaterial, uniform: { value: number }): THREE.MeshBasicMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMinLight = uniform;
    shader.fragmentShader =
      "uniform float uMinLight;\n" +
      shader.fragmentShader.replace("#include <color_fragment>", "diffuseColor.rgb *= max(vColor.rgb, vec3(uMinLight));");
  };
  return mat;
}

interface SectionEntry {
  opaque: THREE.Mesh | null;
  cutout: THREE.Mesh | null;
  conn: Uint8Array;
}

export class SectionRenderer {
  private readonly entries = new Map<number, SectionEntry>();
  private readonly queue: number[] = [];
  private readonly queued = new Set<number>();
  private readonly opaqueMat: THREE.MeshBasicMaterial;
  private readonly cutoutMat: THREE.MeshBasicMaterial;
  private readonly culler = new SectionCuller();

  /** Debug: mặt cắt ngang. Đổi giá trị thì gọi markAll(). */
  cutY: number | null = null;
  /** Bật/tắt ẩn hang khuất (để so sánh hiệu năng). */
  culling = true;
  /** Debug "nhìn đêm": độ sáng tối thiểu của mọi đỉnh (0 = tắt). */
  readonly minLight = { value: 0 };
  /** Đoạn được vẽ trong khung gần nhất. */
  readonly drawn = new Set<number>();
  builtCount = 0;
  totalMeshMs = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: WorldT,
    private readonly light: LightMap,
    private readonly atlas: Atlas,
  ) {
    this.opaqueMat = withMinLight(new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true }), this.minLight);
    this.cutoutMat = withMinLight(
      new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true, alphaTest: 0.5 }),
      this.minLight,
    );
  }

  get pending(): number {
    return this.queue.length;
  }

  markAll(): void {
    for (let sy = 0; sy < SECTIONS_Y; sy++)
      for (let cz = 0; cz < MAP_CHUNKS; cz++) for (let cx = 0; cx < MAP_CHUNKS; cx++) this.enqueue(sectionKey(cx, sy, cz));
  }

  markSections(keys: Iterable<number>): void {
    for (const k of keys) this.enqueue(k);
  }

  /** Gọi sau khi world.setBlock: đoạn chứa block và đoạn kề nếu block ở biên. */
  markBlockChanged(x: number, y: number, z: number): void {
    const sy = Math.floor(y / SECTION_H);
    const ly = y - sy * SECTION_H;
    const sys = [sy];
    if (ly === 0 && sy > 0) sys.push(sy - 1);
    if (ly === SECTION_H - 1 && sy < SECTIONS_Y - 1) sys.push(sy + 1);
    for (const c of World.affectedChunks(x, z)) {
      for (const s of sys) this.enqueue(sectionKey(c.cx, s, c.cz));
      if (c.cx === x >> 4 && c.cz === z >> 4) continue;
      this.enqueue(sectionKey(c.cx, sy, c.cz));
    }
  }

  private enqueue(k: number): void {
    if (this.queued.has(k)) return;
    this.queued.add(k);
    this.queue.push(k);
  }

  /** Dựng các đoạn trong hàng đợi cho đến khi hết ngân sách (ms). */
  update(budgetMs: number): void {
    const start = performance.now();
    while (this.queue.length > 0 && performance.now() - start < budgetMs) {
      const k = this.queue.shift()!;
      this.queued.delete(k);
      this.rebuild(k);
    }
  }

  /** Cập nhật cờ hiển thị trước khi render. */
  cull(camera: THREE.Camera): void {
    // camera bay xuyên vào khối đặc (debug) thì không ẩn gì, để nhìn xuyên thấy mạng hang
    const p = camera.position;
    const inside = BLOCKS[this.world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))]!.opaque;
    const useCulling = this.culling && this.cutY === null && !inside;
    if (useCulling) this.culler.update(camera, (k) => this.entries.get(k)?.conn ?? null);
    const vis = this.culler.visible;
    for (const [k, e] of this.entries) {
      const v = !useCulling || vis[k] === 1;
      if (e.opaque) e.opaque.visible = v;
      if (e.cutout) e.cutout.visible = v;
    }
  }

  private rebuild(k: number): void {
    const cx = k % MAP_CHUNKS;
    const cz = Math.floor(k / MAP_CHUNKS) % MAP_CHUNKS;
    const sy = Math.floor(k / (MAP_CHUNKS * MAP_CHUNKS));
    const t0 = performance.now();
    this.dispose(k);
    const light = this.cutY === null ? this.light : null;
    const geo = buildSectionGeometry(this.world, light, this.atlas, cx, sy, cz, this.cutY);
    const entry: SectionEntry = {
      opaque: geo.opaque ? this.addMesh(k, geo.opaque, this.opaqueMat) : null,
      cutout: geo.cutout ? this.addMesh(k, geo.cutout, this.cutoutMat) : null,
      conn: computeConnectivity(this.world, cx, sy, cz, this.cutY),
    };
    this.entries.set(k, entry);
    this.builtCount++;
    this.totalMeshMs += performance.now() - t0;
  }

  private addMesh(k: number, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.onBeforeRender = () => {
      this.drawn.add(k);
    };
    this.scene.add(mesh);
    return mesh;
  }

  private dispose(k: number): void {
    const old = this.entries.get(k);
    if (!old) return;
    for (const m of [old.opaque, old.cutout]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose();
    }
    this.entries.delete(k);
  }

  /** Số chunk (cột) có ít nhất một đoạn được vẽ. */
  drawnChunks(): number {
    const cols = new Set<number>();
    for (const k of this.drawn) cols.add(k % (MAP_CHUNKS * MAP_CHUNKS));
    return cols.size;
  }
}
