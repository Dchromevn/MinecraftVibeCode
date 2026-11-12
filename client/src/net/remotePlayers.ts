// Người chơi khác (Giai đoạn 5a): model 6 phần + giáp + vật phẩm trên tay + tên trên đầu. Vị trí vẽ trễ
// NET.INTERP_DELAY_MS và nội suy giữa hai gói gần nhất; tay chân đung đưa theo tốc độ, đầu quay theo
// hướng nhìn, vung tay khi đào / đặt, cúi khi giữ Shift.
import * as THREE from "three";
import { NET, type PlayerView } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { heldModel } from "../player/heldItem.js";
import { createPlayerModel, loadSkin, type PlayerModel } from "../player/playerModel.js";

const SCALE = 0.9; // model cao 32 điểm ảnh (2 block) → người chơi cao 1.8
const PX = 1 / 16;
const SWING_S = 0.3;

interface Remote {
  name: string;
  model: PlayerModel;
  tag: THREE.Sprite;
  buf: { t: number; v: PlayerView }[];
  heldKey: string | null;
  held: THREE.Object3D | null;
  swing: number; // giá trị bộ đếm vung tay lần trước
  swingT: number; // thời gian còn lại của hoạt ảnh vung tay
  phase: number; // pha bước chân
}

function nameTag(name: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.font = "bold 34px monospace";
  const w = Math.min(250, ctx.measureText(name).width + 20);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(128 - w / 2, 8, w, 48);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.4, 1);
  s.renderOrder = 10;
  return s;
}

const lerpAngle = (a: number, b: number, k: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

export class RemotePlayers {
  private readonly map = new Map<number, Remote>();
  private readonly skin = loadSkin();

  constructor(private readonly scene: THREE.Scene, private readonly atlas: Atlas) {}

  get count(): number {
    return this.map.size;
  }

  names(): string[] {
    return [...this.map.values()].map((r) => r.name);
  }

  private ensure(id: number, name = "?"): Remote {
    let r = this.map.get(id);
    if (!r) {
      const model = createPlayerModel(this.skin);
      model.root.scale.setScalar(SCALE);
      const tag = nameTag(name);
      tag.position.y = 2.3;
      model.root.add(tag);
      this.scene.add(model.root);
      r = { name, model, tag, buf: [], heldKey: null, held: null, swing: 0, swingT: 0, phase: 0 };
      this.map.set(id, r);
    }
    return r;
  }

  join(id: number, name: string): void {
    const r = this.map.get(id);
    if (r && r.name === name) return;
    if (r) this.leave(id);
    this.ensure(id, name);
  }

  leave(id: number): void {
    const r = this.map.get(id);
    if (!r) return;
    this.scene.remove(r.model.root);
    this.map.delete(id);
  }

  /** Gói "players": trạng thái mới của từng người. */
  apply(list: PlayerView[]): void {
    const now = performance.now();
    for (const v of list) {
      const r = this.ensure(v.id);
      r.buf.push({ t: now, v });
      if (r.buf.length > 30) r.buf.shift();
    }
  }

  private setHeld(r: Remote, key: string | null): void {
    if (r.heldKey === key) return;
    r.heldKey = key;
    if (r.held) r.model.rArm.remove(r.held);
    r.held = null;
    if (!key) return;
    void heldModel(key, this.atlas).then((m) => {
      if (r.heldKey !== key) return;
      const o = m.clone();
      const block = m.userData.kind === "block";
      o.scale.setScalar(block ? 0.35 : 0.55);
      o.position.set(0, -10 * PX, block ? -2 * PX : -4 * PX);
      o.rotation.set(block ? 0 : -Math.PI / 2, block ? Math.PI / 4 : Math.PI / 2, 0);
      r.held = o;
      r.model.rArm.add(o);
    });
  }

  update(dt: number): void {
    const at = performance.now() - NET.INTERP_DELAY_MS;
    for (const r of this.map.values()) {
      if (!r.buf.length) continue;
      // hai gói bao quanh thời điểm vẽ (không có thì dùng gói mới nhất)
      while (r.buf.length > 2 && r.buf[1]!.t <= at) r.buf.shift();
      const a = r.buf[0]!, b = r.buf[1] ?? a;
      const k = b.t > a.t ? Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t))) : 1;
      const v = b.v, m = r.model;
      const x = a.v.x + (b.v.x - a.v.x) * k, y = a.v.y + (b.v.y - a.v.y) * k, z = a.v.z + (b.v.z - a.v.z) * k;
      const speed = b.t > a.t ? Math.hypot(b.v.x - a.v.x, b.v.z - a.v.z) / ((b.t - a.t) / 1000) : 0;
      m.root.visible = !v.dead;
      m.root.position.set(x, y - (v.sneaking ? 0.2 : 0), z);
      m.root.rotation.y = lerpAngle(a.v.yaw, b.v.yaw, k) + Math.PI;
      m.head.rotation.x = -(a.v.pitch + (b.v.pitch - a.v.pitch) * k);
      m.body.rotation.x = v.sneaking ? 0.45 : 0;
      // bước chân: biên độ theo tốc độ
      r.phase += dt * Math.min(speed, 6) * 2.2;
      const amp = Math.min(1, speed / 4) * 0.8;
      m.rLeg.rotation.x = Math.sin(r.phase) * amp;
      m.lLeg.rotation.x = -Math.sin(r.phase) * amp;
      m.lArm.rotation.x = Math.sin(r.phase) * amp * 0.8;
      if (v.swing !== r.swing) {
        r.swing = v.swing;
        r.swingT = SWING_S;
      }
      r.swingT = Math.max(0, r.swingT - dt);
      const sw = r.swingT > 0 ? Math.sin((1 - r.swingT / SWING_S) * Math.PI) : 0;
      m.rArm.rotation.x = -Math.sin(r.phase) * amp * 0.8 - sw * 1.4 - (r.heldKey ? 0.3 : 0);
      m.armor.set(v.armor);
      this.setHeld(r, v.held);
    }
  }
}
