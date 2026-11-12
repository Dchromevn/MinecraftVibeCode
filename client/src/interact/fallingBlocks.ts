// Vẽ và cập nhật cát/sỏi đang rơi (logic rơi/đáp trong /shared/fallingBlock.ts).
import * as THREE from "three";
import {
  createFalling, stepFalling, settle, type BlockAccess, type Dropped, type FallingBlock,
} from "../../../shared/src/index.js";
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
    private readonly acc: BlockAccess,
    private readonly onDrop: (d: Dropped[]) => void,
  ) {
    this.mat = new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd });
  }

  get count(): number {
    return this.list.length;
  }

  /** Gọi khi block (đã gỡ khỏi thế giới) bắt đầu rơi. */
  readonly start = (x: number, y: number, z: number, id: number, meta: number): void => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    setBoxTiles(geo, blockTiles(this.atlas, id));
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);
    this.list.push({ f: createFalling(x, y, z, id, meta), mesh });
  };

  update(dt: number): void {
    // khối thấp trước để khối chồng lên đáp đúng thứ tự
    this.list.sort((a, b) => a.f.y - b.f.y);
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i]!;
      const r = stepFalling(e.f, Math.min(dt, 0.05), this.acc);
      e.mesh.position.y = e.f.y + 0.5;
      if (r.kind === "falling") continue;
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      this.list.splice(i--, 1);
      if (r.kind === "lost") {
        this.onDrop([{ id: e.f.id, meta: e.f.meta, forced: true, x: e.f.x, y: Math.floor(e.f.y), z: e.f.z }]);
        continue;
      }
      // block đè lên (đuốc...) rơi ra; ô vừa đáp có thể làm block khác mất chỗ bám
      const more = settle(this.acc, [{ x: e.f.x, y: r.y, z: e.f.z }], this.start);
      this.onDrop([...r.dropped, ...more]);
    }
  }
}
