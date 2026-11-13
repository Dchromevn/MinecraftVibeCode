// Đối tượng three.js cho mesh của từng đoạn chunk (đặc + nước), tạo từ mảng worker
// trả về; ẩn đoạn khuất; nước có sóng và texture trôi; ánh sáng qua shader.
import * as THREE from "three";
import { BLOCKS, chunkKey, type World } from "../../../shared/src/index.js";
import type { MeshArrays } from "../mesh/geomBuilder.js";
import { SECTIONS, type SectionMesh } from "../mesh/mesher.js";
import { applyChunkShader, type ChunkUniforms } from "./chunkShader.js";
import { SectionCuller, sectionKey } from "./sectionCuller.js";

/** Thông số hiển thị nước (chỉ là hình ảnh, không ảnh hưởng lối chơi). */
const WATER = { OPACITY: 0.8, DRIFT_U: 0.04, DRIFT_V: 0.025 } as const;

interface SectionEntry {
  solid: THREE.Mesh | null;
  water: THREE.Mesh | null;
  glass: THREE.Mesh | null;
  conn: Uint8Array;
}

function toGeometry(m: MeshArrays): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(m.colors, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(m.uvs, 2));
  g.setAttribute("aLight", new THREE.BufferAttribute(m.light, 2));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

export class ChunkMeshes {
  private readonly sections = new Map<number, SectionEntry>();
  private readonly chunks = new Set<number>(); // chunk đã có mesh
  private readonly solidMat: THREE.MeshBasicMaterial;
  private readonly waterMat: THREE.MeshBasicMaterial;
  /** Kính màu, tấm kính màu (Giai đoạn 4f): atlas thường, bán trong suốt có pha trộn. */
  private readonly glassMat: THREE.MeshBasicMaterial;
  private readonly culler = new SectionCuller();
  readonly uniforms: ChunkUniforms = { uTime: { value: 0 }, uDaylight: { value: 1 }, uMinLight: { value: 0 } };
  culling = true;
  drawnSections = 0;

  constructor(
    private readonly scene: THREE.Scene,
    texture: THREE.Texture,
    private readonly waterTexture: THREE.Texture,
  ) {
    // một vật liệu cho cả khối đặc và lá/cỏ/kính (alphaTest) để giảm lệnh vẽ
    this.solidMat = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, alphaTest: 0.5 });
    this.waterMat = new THREE.MeshBasicMaterial({
      map: waterTexture,
      vertexColors: true,
      transparent: true,
      opacity: WATER.OPACITY,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.glassMat = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    applyChunkShader(this.solidMat, this.uniforms, false);
    applyChunkShader(this.glassMat, this.uniforms, false);
    applyChunkShader(this.waterMat, this.uniforms, true);
  }

  get count(): number {
    return this.chunks.size;
  }

  has(key: number): boolean {
    return this.chunks.has(key);
  }

  set(cx: number, cz: number, sections: SectionMesh[]): void {
    this.remove(cx, cz);
    const make = (arr: MeshArrays | null, mat: THREE.Material, order: number): THREE.Mesh | null => {
      if (!arr) return null;
      const m = new THREE.Mesh(toGeometry(arr), mat);
      m.position.set(cx * 16, 0, cz * 16);
      m.renderOrder = order;
      m.updateMatrix();
      m.matrixAutoUpdate = false;
      this.scene.add(m);
      return m;
    };
    sections.forEach((s, sy) => {
      this.sections.set(sectionKey(cx, sy, cz), {
        solid: make(s.solid, this.solidMat, 0),
        water: make(s.water, this.waterMat, 1),
        glass: make(s.glass, this.glassMat, 2),
        conn: s.conn,
      });
    });
    this.chunks.add(chunkKey(cx, cz));
  }

  remove(cx: number, cz: number): void {
    if (!this.chunks.delete(chunkKey(cx, cz))) return;
    for (let sy = 0; sy < SECTIONS; sy++) {
      const key = sectionKey(cx, sy, cz);
      const e = this.sections.get(key);
      if (!e) continue;
      for (const m of [e.solid, e.water, e.glass]) {
        if (!m) continue;
        this.scene.remove(m);
        m.geometry.dispose();
      }
      this.sections.delete(key);
    }
  }

  chunkKeys(): number[] {
    return [...this.chunks];
  }

  /** Gọi mỗi khung trước khi vẽ: sóng, texture nước trôi, ẩn đoạn khuất. */
  update(seconds: number, camera: THREE.Camera, radius: number, world: World): void {
    this.uniforms.uTime.value = seconds;
    this.waterTexture.offset.set(seconds * WATER.DRIFT_U, seconds * WATER.DRIFT_V);
    // camera bay xuyên vào khối đặc (debug) thì không ẩn gì, để nhìn xuyên thấy mạng hang
    const p = camera.position;
    const inside = BLOCKS[world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))]!.opaque;
    const useCulling =
      this.culling && !inside && this.culler.update(camera, radius + 1, (k) => this.sections.get(k)?.conn ?? null);
    let drawn = 0;
    for (const [key, e] of this.sections) {
      const v = !useCulling || this.culler.visible.has(key);
      if (e.solid) e.solid.visible = v;
      if (e.water) e.water.visible = v;
      if (e.glass) e.glass.visible = v;
      if (v && (e.solid || e.water || e.glass)) drawn++;
    }
    this.drawnSections = drawn;
  }
}
