// Mũi tên phía client (Giai đoạn 6b): server gửi vị trí / vận tốc mỗi tick; giữa hai lần gửi client tự cho tên bay theo
// cùng hàm stepArrow (mượt, không trễ), cắm vào block thì đứng yên. Hình mũi tên = icon "arrow" nổi khối, đầu tên
// (góc trên-phải icon) chĩa theo hướng bay. Tên kéo đủ lực để lại vệt hạt chí mạng. 7a: trứng ném (cờ 4) vẽ bằng icon trứng;
// 7b: ngọc hư không (cờ 8), bình của phù thủy (cờ 16). 10b: cầu lửa ma bay (cờ 32): bay thẳng, to, để lại vệt lửa.
import * as THREE from "three";
import { ARROW_TICK, stepArrow, type ArrowState, type NetArrow, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { Particles } from "../fx/particles.js";
import { heldModel } from "../player/heldItem.js";

const ICON_TIP = new THREE.Vector3(1, 1, 0).normalize(); // đầu tên trên icon (góc trên-phải)
const SCALE = 0.55;

interface ClientArrow extends ArrowState {
  obj: THREE.Object3D;
  crit: boolean;
  acc: number; // thời gian chưa chạy hết một tick
}

export class ClientArrows {
  private readonly map = new Map<number, ClientArrow>();
  private model: THREE.Object3D | null = null;
  private readonly thrown = new Map<number, THREE.Object3D>(); // cờ → hình (trứng, ngọc, bình)
  private readonly dir = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, atlas: Atlas, private readonly world: World, private readonly fx: Particles) {
    void heldModel("arrow", atlas).then((m) => (this.model = m));
    for (const [flag, key] of [[4, "egg"], [8, "ender_pearl"], [16, "icon:splash_potion"], [32, "icon:fire_charge"], [64, "icon:fire_charge"], [128, "snowball"]] as const) // (10c) cầu lửa nhỏ, bóng tuyết
      void heldModel(key, atlas).then((m) => this.thrown.set(flag, m));
  }

  /** Gói "arrows" từ server. */
  /** (10a) Đổi cõi: bỏ hết. */
  clear(): void {
    this.apply([], [...this.map.keys()]);
  }

  apply(up: NetArrow[], gone: number[]): void {
    for (const id of gone) {
      const a = this.map.get(id);
      if (a) this.scene.remove(a.obj);
      this.map.delete(id);
    }
    for (const [id, x, y, z, vx, vy, vz, flags] of up) {
      let a = this.map.get(id);
      if (!a) {
        const kind = flags & 252, src = kind ? this.thrown.get(kind) : this.model;
        const obj = src ? src.clone() : new THREE.Object3D();
        obj.scale.setScalar(kind === 32 ? SCALE * 2 : kind === 64 ? SCALE * 0.9 : kind ? SCALE * 0.6 : SCALE);
        this.scene.add(obj);
        a = { obj, x, y, z, vx, vy, vz, stuck: false, crit: (flags & 2) !== 0, acc: 0, noGravity: kind === 32 || kind === 64 };
        this.map.set(id, a);
      }
      Object.assign(a, { x, y, z, stuck: (flags & 1) !== 0, acc: 0 });
      if (!a.stuck || (vx || vy || vz)) Object.assign(a, { vx, vy, vz }); // tên đã cắm: giữ hướng lúc bay
      this.place(a);
    }
  }

  private place(a: ClientArrow): void {
    a.obj.position.set(a.x, a.y, a.z);
    this.dir.set(a.vx, a.vy, a.vz);
    if (this.dir.lengthSq() > 1e-6) a.obj.quaternion.setFromUnitVectors(ICON_TIP, this.dir.normalize());
  }

  update(dt: number): void {
    const cell = (x: number, y: number, z: number): number => this.world.getCell(x, y, z);
    for (const a of this.map.values()) {
      if (a.stuck) continue;
      a.acc += dt;
      while (a.acc >= ARROW_TICK && !a.stuck) {
        a.acc -= ARROW_TICK;
        const vx = a.vx, vy = a.vy, vz = a.vz;
        stepArrow(a, cell);
        if (a.stuck) Object.assign(a, { vx, vy, vz }); // giữ hướng cắm
        if (a.crit) this.fx.critTrail(a.x, a.y, a.z);
        if (a.noGravity) this.fx.flame(a.x + (Math.random() - 0.5) * 0.4, a.y + (Math.random() - 0.5) * 0.4, a.z + (Math.random() - 0.5) * 0.4);
      }
      this.place(a);
    }
  }
}
