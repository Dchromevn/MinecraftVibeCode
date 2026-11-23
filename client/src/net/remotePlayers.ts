// Người chơi khác (Giai đoạn 5a): model 6 phần + giáp + vật phẩm trên tay + tên trên đầu. Vị trí vẽ trễ
// NET.INTERP_DELAY_MS và nội suy giữa hai gói gần nhất; tay chân đung đưa theo tốc độ, đầu quay theo
// hướng nhìn, vung tay khi đào / đặt, cúi khi giữ Shift. 6a: chọn người bị nhắm (tia nhìn trúng hộp), nháy đỏ
// khi trúng đòn. Đồ tay trái; khiên đeo bên tay, giơ lên trước ngực khi đỡ đòn.
import * as THREE from "three";
import { NET, RIDE, RIDE_BACK_FLAG, playerHitBox, rayBox, type PlayerView } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { heldModel } from "../player/heldItem.js";
import { createPlayerModel, loadSkin, type PlayerModel } from "../player/playerModel.js";

const SCALE = 0.9; // model cao 32 điểm ảnh (2 block) → người chơi cao 1.8
const PX = 1 / 16;
/** Cỡ vật phẩm trong tay người chơi khác (cạnh icon / khối, đơn vị block của mô hình) — người dùng chọn to hơn 25%. */
const HELD_ITEM_SCALE = 0.55 * 1.25;
const HELD_BLOCK_SCALE = 0.35 * 1.25;
const SWING_S = 0.3;
const HURT_FLASH_S = 0.4;
const BLOCK_ARM_X = 0.95; // giơ khiên: tay nâng ra trước (rad) và hướng vào giữa
const BLOCK_ARM_Y = 0.45;
const HAND = new THREE.Vector3(0, -10 * PX, 0); // nắm tay trong hệ của cánh tay (tay dài 12 điểm ảnh)
const SHIELD_GRIP = 3; // đẩy khiên ra trước nắm tay 3 điểm ảnh (gốc mô hình ở giữa tay cầm và mặt khiên): nắm tay nằm sau mặt khiên
const SHIELD_FRONT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // mặt khiên (−Z) quay ra trước (+Z)
const HURT_TINT = new THREE.Color(1, 0.45, 0.45);
const WHITE = new THREE.Color(1, 1, 1);
/** Mô hình chính mình (góc nhìn thứ 3): id riêng, không trùng id người chơi của server. */
export const SELF_ID = -1;

interface Remote {
  name: string;
  model: PlayerModel;
  tag: THREE.Sprite;
  buf: { t: number; v: PlayerView }[];
  heldKey: string | null;
  held: THREE.Object3D | null;
  heldKind: string;
  offKey: string | null;
  off: THREE.Object3D | null;
  offKind: string;
  swing: number; // giá trị bộ đếm vung tay lần trước
  swingT: number; // thời gian còn lại của hoạt ảnh vung tay
  phase: number; // pha bước chân
  /** Vị trí đang vẽ (chân), để nhắm đánh (6a). */
  at: { x: number; y: number; z: number; sneaking: boolean; dead: boolean } | null;
  skinMat: THREE.MeshBasicMaterial;
  hurtT: number;
  /** Vẽ trễ bao lâu (ms): người khác NET.INTERP_DELAY_MS để nội suy; chính mình 0. */
  delay: number;
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
  /** (7d) Thú đang được người chơi khác cưỡi: id thú → chỗ ngồi + hướng (đặt lại mỗi khung). */
  readonly rides = new Map<number, { x: number; y: number; z: number; yaw: number }>();

  constructor(private readonly scene: THREE.Scene, private readonly atlas: Atlas) {}

  get count(): number {
    return this.map.size - (this.map.has(SELF_ID) ? 1 : 0);
  }

  names(): string[] {
    return [...this.map].filter(([id]) => id !== SELF_ID).map(([, r]) => r.name);
  }

  /** (góc nhìn thứ 3) Mô hình chính mình theo trạng thái trên máy, mỗi khung một lần; null = ẩn (góc nhìn thứ nhất). */
  setSelf(v: PlayerView | null): void {
    if (!v) return this.leave(SELF_ID);
    const r = this.ensure(SELF_ID);
    r.tag.visible = false;
    r.delay = 0;
    r.buf.push({ t: performance.now(), v });
    if (r.buf.length > 3) r.buf.shift();
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
      const skinMat = (model.head.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      r = { name, model, tag, buf: [], heldKey: null, held: null, heldKind: "", offKey: null, off: null, offKind: "", swing: 0, swingT: 0, phase: 0, at: null, skinMat, hurtT: 0, delay: NET.INTERP_DELAY_MS };
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

  /** (10a) Đổi cõi: bỏ hết người chơi khác (server gửi lại "join" những người ở cõi mới). */
  clear(): void {
    for (const id of [...this.map.keys()]) this.leave(id);
  }

  leave(id: number): void {
    const r = this.map.get(id);
    if (!r) return;
    this.scene.remove(r.model.root);
    this.map.delete(id);
  }

  /** Người chơi gần nhất bị tia (o, d — d đơn vị) trúng trong khoảng max: id + khoảng cách. */
  pick(o: readonly number[], d: readonly number[], max: number): { id: number; dist: number } | null {
    let best: { id: number; dist: number } | null = null;
    for (const [id, r] of this.map) {
      if (!r.at || r.at.dead || id === SELF_ID) continue;
      const t = rayBox(o, d, playerHitBox(r.at.x, r.at.y, r.at.z, r.at.sneaking));
      if (t !== null && t <= max && (!best || t < best.dist)) best = { id, dist: t };
    }
    return best;
  }

  /** Vị trí đang vẽ (chân) của người chơi id. */
  posOf(id: number): { x: number; y: number; z: number } | null {
    return this.map.get(id)?.at ?? null;
  }

  /** Người chơi id vừa trúng đòn: nháy đỏ. */
  hurt(id: number): void {
    const r = this.map.get(id);
    if (r) r.hurtT = HURT_FLASH_S;
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

/** Gắn đồ vào tay phải (main) hoặc tay trái (off); đổi đồ thì thay mô hình. */
  private setHand(r: Remote, hand: "main" | "off", key: string | null): void {
    const arm = hand === "main" ? r.model.rArm : r.model.lArm;
    if ((hand === "main" ? r.heldKey : r.offKey) === key) return;
    const old = hand === "main" ? r.held : r.off;
    if (old) arm.remove(old);
    if (hand === "main") Object.assign(r, { heldKey: key, held: null, heldKind: "" });
    else Object.assign(r, { offKey: key, off: null, offKind: "" });
    if (!key) return;
    void heldModel(key, this.atlas).then((m) => {
      if ((hand === "main" ? r.heldKey : r.offKey) !== key) return;
      const o = m.clone(), kind = String(m.userData.kind);
      if (hand === "main") Object.assign(r, { held: o, heldKind: kind });
      else Object.assign(r, { off: o, offKind: kind });
      arm.add(o);
    });
  }

  /** Tư thế vật phẩm trong tay (out = phía ngoài thân: tay phải −1, tay trái +1). */
  private pose(o: THREE.Object3D | null, kind: string, out: number, blocking: boolean, arm: THREE.Object3D): void {
    if (!o) return;
    if (kind === "shield") {
      o.scale.setScalar(1);
      if (blocking) {
        // giơ khiên: tay cầm khiên nằm trong nắm tay, khiên đứng thẳng, mặt viền sắt quay ra trước (bù góc xoay của
        // cánh tay: hướng tính trong hệ tọa độ thân rồi đổi sang hệ của cánh tay) — nắm tay không lòi ra trước khiên
        const inv = new THREE.Quaternion().setFromEuler(arm.rotation).invert();
        o.quaternion.copy(inv).multiply(SHIELD_FRONT);
        o.position.set(0, 0, SHIELD_GRIP * PX).applyQuaternion(inv).add(HAND);
      } else {
        // khiên áp bên ngoài cánh tay, mặt có viền sắt quay ra ngoài
        o.position.set(out * 2.5 * PX, -9 * PX, 0);
        o.rotation.set(0, -out * (Math.PI / 2), 0);
      }
      return;
    }
    const block = kind === "block";
    o.scale.setScalar(block ? HELD_BLOCK_SCALE : HELD_ITEM_SCALE);
    if (block) {
      // khối nằm trong nắm tay: tâm ngang cuối tay (tay dài 12 điểm ảnh), lệch ra trước để mặt sau chạm lòng bàn tay
      o.position.set(0, -12.5 * PX, 4 * PX);
      o.rotation.set(0, Math.PI / 4, 0);
    } else {
      // icon dụng cụ: cán ở góc dưới-trái, đầu ở góc trên-phải, lưỡi (cuốc, cúp, rìu) ở phía trên-trái.
      // Icon đứng dọc theo hướng tay: đường chéo cán → đầu chĩa ra trước (+Z của tay), lưỡi chĩa xuống (−Y).
      // Cột của ma trận = ảnh của trục x, y, z của icon.
      const r = Math.SQRT1_2;
      o.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(new THREE.Vector3(0, r, r), new THREE.Vector3(0, -r, r), new THREE.Vector3(1, 0, 0)),
      );
      o.position.set(0, -10.5 * PX, 0.354 * HELD_ITEM_SCALE); // cán (1/4 icon từ góc dưới-trái) nằm trong nắm tay
    }
  }

  /** (7d) Vị trí đang vẽ của người chơi id (đầu dây dắt). */
  position(id: number): { x: number; y: number; z: number } | null {
    return this.map.get(id)?.at ?? null;
  }

  update(dt: number): void {
    const now = performance.now();
    this.rides.clear();
    for (const r of this.map.values()) {
      if (!r.buf.length) continue;
      const at = now - r.delay;
      // hai gói bao quanh thời điểm vẽ (không có thì dùng gói mới nhất)
      while (r.buf.length > 2 && r.buf[1]!.t <= at) r.buf.shift();
      const a = r.buf[0]!, b = r.buf[1] ?? a;
      const k = b.t > a.t ? Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t))) : 1;
      const v = b.v, m = r.model;
      const x = a.v.x + (b.v.x - a.v.x) * k, y = a.v.y + (b.v.y - a.v.y) * k, z = a.v.z + (b.v.z - a.v.z) * k;
      const speed = b.t > a.t ? Math.hypot(b.v.x - a.v.x, b.v.z - a.v.z) / ((b.t - a.t) / 1000) : 0;
      m.root.visible = !v.dead;
      m.root.position.set(x, y - (v.sneaking ? 0.2 : 0) + (v.sleeping ? 0.25 : 0) - (v.ride ? RIDE.SIT_DROP : 0), z);
      m.root.rotation.x = v.sleeping ? -Math.PI / 2 : 0; // (7a) nằm giường
      r.at = { x, y, z, sneaking: v.sneaking, dead: v.dead };
      r.hurtT = Math.max(0, r.hurtT - dt);
      r.skinMat.color.copy(r.hurtT > 0 ? HURT_TINT : WHITE);
      m.root.rotation.y = lerpAngle(a.v.yaw, b.v.yaw, k) + Math.PI;
      m.head.rotation.x = -(a.v.pitch + (b.v.pitch - a.v.pitch) * k);
      m.body.rotation.x = v.sneaking ? 0.45 : 0;
      // bước chân: biên độ theo tốc độ
      r.phase += dt * Math.min(speed, 6) * 2.2;
      const amp = Math.min(1, speed / 4) * 0.8;
      m.rLeg.rotation.set(Math.sin(r.phase) * amp, 0, 0);
      m.lLeg.rotation.set(-Math.sin(r.phase) * amp, 0, 0);
      if (v.ride) { // (7d) ngồi trên lưng thú: chân duỗi ra trước, hơi dạng
        m.rLeg.rotation.set(-1.4, 0.1, 0.12);
        m.lLeg.rotation.set(-1.4, -0.1, -0.12);
        if (!(v.ride & RIDE_BACK_FLAG)) this.rides.set(v.ride, { x, y, z, yaw: lerpAngle(a.v.yaw, b.v.yaw, k) });
      }
      m.lArm.rotation.set(Math.sin(r.phase) * amp * 0.8 - (r.offKey ? 0.2 : 0), 0, 0);
      m.rArm.rotation.set(0, 0, 0);
      if (v.swing !== r.swing) {
        r.swing = v.swing;
        r.swingT = SWING_S;
      }
      r.swingT = Math.max(0, r.swingT - dt);
      const sw = r.swingT > 0 ? Math.sin((1 - r.swingT / SWING_S) * Math.PI) : 0;
      m.rArm.rotation.x = -Math.sin(r.phase) * amp * 0.8 - sw * 1.4 - (r.heldKey ? 0.3 : 0);
      // giơ khiên: tay phải nếu tay phải cầm khiên, không thì tay trái
      const mainBlock = !!v.blocking && r.heldKind === "shield", offBlock = !!v.blocking && !mainBlock && r.offKind === "shield";
      if (mainBlock) m.rArm.rotation.set(-BLOCK_ARM_X, BLOCK_ARM_Y, 0);
      if (offBlock) m.lArm.rotation.set(-BLOCK_ARM_X, -BLOCK_ARM_Y, 0);
      // kéo cung (6b): hai tay đưa thẳng ra trước theo hướng nhìn
      const hk = v.held?.replace("*", ""), drawing = !!v.drawing && (hk === "bow" || hk === "crossbow"), aim = -Math.PI / 2 - (a.v.pitch + (b.v.pitch - a.v.pitch) * k);
      if (drawing) {
        m.rArm.rotation.set(aim, -0.1, 0);
        m.lArm.rotation.set(aim, 0.5, 0);
      }
      m.armor.set(v.armor);
      this.setHand(r, "main", drawing ? (hk === "crossbow" ? "icon:crossbow_pulling_2" : "icon:bow_pull_2") : v.held);
      this.setHand(r, "off", v.off);
      this.pose(r.held, r.heldKind, -1, mainBlock, m.rArm);
      this.pose(r.off, r.offKind, 1, offBlock, m.lArm);
    }
  }
}
