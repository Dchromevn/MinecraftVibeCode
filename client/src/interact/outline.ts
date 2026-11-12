// Khung viền quanh block đang nhắm, theo các hộp nhắm thật (đuốc, ray, rào nối...).
import * as THREE from "three";
import { selectionBoxes, type RayHit } from "../../../shared/src/index.js";

export class BlockOutline {
  private readonly group = new THREE.Group();
  private readonly mat = new THREE.LineBasicMaterial({ color: 0x000000 });
  private key = "";

  constructor(scene: THREE.Scene, private readonly idAt: (x: number, y: number, z: number) => number) {
    scene.add(this.group);
  }

  update(t: RayHit | null): void {
    const boxes = t ? selectionBoxes(t.cell, t.x, t.y, t.z, this.idAt) : [];
    const key = t ? `${t.x},${t.y},${t.z},${t.cell},${boxes.length}` : "";
    if (key === this.key) return;
    this.key = key;
    for (const c of this.group.children) (c as THREE.LineSegments).geometry.dispose();
    this.group.clear();
    if (!t) return;
    const g = 0.002; // nới ra để không bị mặt block che
    for (const b of boxes) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(b[3] - b[0] + g * 2, b[4] - b[1] + g * 2, b[5] - b[2] + g * 2));
      const line = new THREE.LineSegments(geo, this.mat);
      line.position.set(t.x + (b[0] + b[3]) / 2, t.y + (b[1] + b[4]) / 2, t.z + (b[2] + b[5]) / 2);
      this.group.add(line);
    }
  }
}
