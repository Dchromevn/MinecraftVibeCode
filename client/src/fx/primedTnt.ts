// TNT đang cháy ngòi phía client (Giai đoạn 7b): server báo một lần (vị trí, thời gian ngòi); client tự cho rơi theo cùng
// vật lý với server (stepMobBody), nháy trắng, hết ngòi thì bỏ (vụ nổ do server gửi riêng).
import * as THREE from "three";
import { B, createMobBody, stepMobBody, type MobBody, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { blockTiles, setBoxTiles } from "../interact/boxMesh.js";

interface Primed { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; body: MobBody; fuse: number; acc: number }

const TICK = 1 / 20;

export class PrimedTnt {
  private readonly list: Primed[] = [];
  private readonly geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);

  constructor(private readonly scene: THREE.Scene, private readonly world: World, private readonly atlas: Atlas) {
    setBoxTiles(this.geo, blockTiles(atlas, B.TNT));
    this.geo.translate(0, 0.49, 0);
  }

  /** Gói "tnt": TNT bắt đầu cháy ngòi ở (x, y, z) (chân), còn fuse giây. */
  add(x: number, y: number, z: number, fuse: number): void {
    const mat = new THREE.MeshBasicMaterial({ map: this.atlas.texture });
    const mesh = new THREE.Mesh(this.geo, mat);
    const body = createMobBody(x, y, z);
    body.vy = 4;
    this.scene.add(mesh);
    this.list.push({ mesh, mat, body, fuse, acc: 0 });
  }

  update(dt: number): void {
    const cell = (x: number, y: number, z: number): number => this.world.getCell(x, y, z);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]!;
      p.fuse -= dt;
      if (p.fuse <= 0) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        this.list.splice(i, 1);
        continue;
      }
      p.acc += dt;
      while (p.acc >= TICK) {
        p.acc -= TICK;
        stepMobBody(p.body, 0.98, 0.98, 0.5, { vx: p.body.vx * 0.9, vz: p.body.vz * 0.9, jump: false }, cell, TICK);
      }
      p.mesh.position.set(p.body.x, p.body.y, p.body.z);
      const flash = Math.floor(p.fuse * 4) % 2 === 0;
      p.mat.color.setScalar(flash ? 2 : 1);
      p.mesh.scale.setScalar(p.fuse < 0.5 ? 1 + (0.5 - p.fuse) * 0.4 : 1);
    }
  }
}
