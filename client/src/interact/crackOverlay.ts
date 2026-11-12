// Vết nứt 5 mức phủ lên block đang đào (texture crack_0..4 trong atlas).
import * as THREE from "three";
import { DIGGING, type Box } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { setBoxTiles } from "./boxMesh.js";

const GROW = 0.003; // nới ra để không chớp với mặt block

export class CrackOverlay {
  private readonly mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private stage = -1;

  constructor(scene: THREE.Scene, private readonly atlas: Atlas) {
    const mat = new THREE.MeshBasicMaterial({
      map: atlas.texture, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  hide(): void {
    this.mesh.visible = false;
    this.stage = -1;
  }

  /** progress 0..1 trên block (x, y, z) có các hộp nhắm boxes. */
  show(x: number, y: number, z: number, boxes: readonly Box[], progress: number): void {
    if (boxes.length === 0) return this.hide();
    const stage = Math.min(DIGGING.CRACK_STAGES - 1, Math.floor(progress * DIGGING.CRACK_STAGES));
    // bao quanh mọi hộp nhắm của block
    let x0 = 1, y0 = 1, z0 = 1, x1 = 0, y1 = 0, z1 = 0;
    for (const b of boxes) {
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); z0 = Math.min(z0, b[2]);
      x1 = Math.max(x1, b[3]); y1 = Math.max(y1, b[4]); z1 = Math.max(z1, b[5]);
    }
    this.mesh.scale.set(x1 - x0 + GROW * 2, y1 - y0 + GROW * 2, z1 - z0 + GROW * 2);
    this.mesh.position.set(x + (x0 + x1) / 2, y + (y0 + y1) / 2, z + (z0 + z1) / 2);
    if (stage !== this.stage) {
      this.stage = stage;
      const t = this.atlas.uv(`crack_${stage}`);
      setBoxTiles(this.mesh.geometry, [t, t, t, t, t, t]);
    }
    this.mesh.visible = true;
  }
}
