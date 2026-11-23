// Vẽ dây dắt (Giai đoạn 7d): server gửi mỗi giây danh sách dây trong tầm nhìn [sinh vật, loại đầu dây, id / x y z]; mỗi khung
// vẽ một sợi dây hơi võng từ cổ con vật tới tay người chơi / con dẫn đầu (đoàn lạc đà) / nút dây ở cọc hàng rào.
import * as THREE from "three";

const SEG = 10;
const COLOR = 0x6b4423;
const SAG = 0.12; // độ võng theo chiều dài

type P3 = { x: number; y: number; z: number };

export class LeashLines {
  private list: [number, number, number, number, number][] = [];
  private readonly lines = new Map<number, THREE.Line>();
  private readonly knots = new Map<string, THREE.Mesh>();
  private readonly mat = new THREE.LineBasicMaterial({ color: COLOR });
  private readonly knotGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  private readonly knotMat = new THREE.MeshBasicMaterial({ color: 0x8a5a2b });

  constructor(private readonly scene: THREE.Scene) {}

  apply(list: [number, number, number, number, number][]): void {
    this.list = list;
  }

  /** mob(id): điểm buộc ở cổ con vật; player(id): chân người chơi. */
  update(mob: (id: number) => P3 | null, player: (id: number) => P3 | null): void {
    const seenLine = new Set<number>(), seenKnot = new Set<string>();
    for (const [id, kind, a, b, c] of this.list) {
      const from = mob(id);
      let to: P3 | null = null;
      if (kind === 0) {
        const p = player(a);
        to = p && { x: p.x, y: p.y + 1.1, z: p.z }; // tay người cầm
      } else if (kind === 1) to = mob(a);
      else {
        to = { x: a + 0.5, y: b + 0.6, z: c + 0.5 };
        const k = `${a},${b},${c}`;
        seenKnot.add(k);
        if (!this.knots.has(k)) {
          const knot = new THREE.Mesh(this.knotGeo, this.knotMat);
          knot.position.set(to.x, to.y, to.z);
          this.scene.add(knot);
          this.knots.set(k, knot);
        }
      }
      if (!from || !to) continue;
      let line = this.lines.get(id);
      if (!line) {
        line = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3)), this.mat);
        line.frustumCulled = false;
        this.scene.add(line);
        this.lines.set(id, line);
      }
      seenLine.add(id);
      const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute, len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        pos.setXYZ(i, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * len * SAG, from.z + (to.z - from.z) * t);
      }
      pos.needsUpdate = true;
    }
    for (const [id, l] of this.lines)
      if (!seenLine.has(id)) {
        this.scene.remove(l);
        l.geometry.dispose();
        this.lines.delete(id);
      }
    for (const [k, m] of this.knots)
      if (!seenKnot.has(k)) {
        this.scene.remove(m);
        this.knots.delete(k);
      }
  }
}
