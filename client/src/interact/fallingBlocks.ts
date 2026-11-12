// Vẽ cát / sỏi đang rơi (Giai đoạn 5a: server mô phỏng và đặt block khi đáp; client chỉ vẽ khối
// rơi theo cùng vật lý /shared/fallingBlock.ts rồi gỡ khi chạm đất).
import * as THREE from "three";
import { createFalling, stepFalling, type FallingBlock } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { blockTiles, setBoxTiles } from "./boxMesh.js";

interface Entry {
  f: FallingBlock;
  mesh: THREE.Mesh;
}

export class FallingBlocks {
  private readonly list: Entry[] = [];
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly atlas: Atlas,
    private readonly getCell: (x: number, y: number, z: number) => number,
  ) {
    this.mat = new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd });
  }

  get count(): number {
    return this.list.length;
  }

  /** Server báo block ở (x, y, z) bắt đầu rơi. */
  start(x: number, y: number, z: number, id: number, meta: number): void {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    setBoxTiles(geo, blockTiles(this.atlas, id));
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);
    this.list.push({ f: createFalling(x, y, z, id, meta), mesh });
  }

  update(dt: number): void {
    // chỉ đọc thế giới: chạm đất thì gỡ khối vẽ, block thật do server gửi
    const acc = { getCell: this.getCell, setCell: () => undefined };
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i]!;
      const r = stepFalling(e.f, Math.min(dt, 0.05), acc);
      e.mesh.position.y = e.f.y + 0.5;
      if (r.kind === "falling") continue;
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      this.list.splice(i--, 1);
    }
  }
}
