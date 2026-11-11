// Đối tượng three.js cho mesh của từng chunk (đặc + nước), tạo từ mảng worker trả về.
import * as THREE from "three";
import type { MeshArrays } from "../mesh/geomBuilder.js";
import type { ChunkMesh } from "../mesh/mesher.js";

interface Entry {
  solid: THREE.Mesh | null;
  water: THREE.Mesh | null;
}

function toGeometry(m: MeshArrays): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(m.colors, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(m.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

export class ChunkMeshes {
  private readonly entries = new Map<number, Entry>();
  private readonly solidMat: THREE.MeshBasicMaterial;
  private readonly waterMat: THREE.MeshBasicMaterial;

  constructor(private readonly scene: THREE.Scene, texture: THREE.Texture) {
    // một vật liệu cho cả khối đặc và lá/cỏ (alphaTest) để giảm lệnh vẽ
    this.solidMat = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, alphaTest: 0.5 });
    this.waterMat = new THREE.MeshBasicMaterial({
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  get count(): number {
    return this.entries.size;
  }

  has(key: number): boolean {
    return this.entries.has(key);
  }

  set(key: number, cx: number, cz: number, mesh: ChunkMesh): void {
    this.remove(key);
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
    this.entries.set(key, { solid: make(mesh.solid, this.solidMat, 0), water: make(mesh.water, this.waterMat, 1) });
  }

  remove(key: number): void {
    const e = this.entries.get(key);
    if (!e) return;
    for (const m of [e.solid, e.water]) {
      if (!m) continue;
      this.scene.remove(m);
      m.geometry.dispose();
    }
    this.entries.delete(key);
  }

  keys(): IterableIterator<number> {
    return this.entries.keys();
  }
}
