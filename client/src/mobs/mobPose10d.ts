// Hiển thị sinh vật Giai đoạn 10d1 (theo Minecraft PiglinModel / HoglinModel): người lợn (model người lợn xác sống, ảnh piglin) cầm
// kiếm vàng hoặc nỏ (theo biến thể), giương nỏ thì đưa hai tay ra trước; cầm vàng ngắm thì giơ tay trái lên trước mặt, cúi đầu; đuổi đánh
// thì vung tay; người lợn vệ binh cầm rìu vàng; lợn rừng xác sống (model lợn rừng lửa) cúi đầu khi đuổi. Người lợn / lợn rừng lửa đang
// thành xác sống (ở thế giới chính) thì run. Sinh vật Phát sáng (mũi tên quang phổ): vẽ sáng, thấy xuyên tường.
import * as THREE from "three";
import { MOB_EXTRA, MOB_FLAG, type MobKey, type NetMob } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { heldModel } from "../player/heldItem.js";
import type { MobModel } from "./mobModels.js";

type SetFn = (name: string, x: number, y?: number, z?: number) => void;

/** Gắn món item vào tay arm (như đồ cầm tay người chơi khác); lưu vào model.root.userData[slot] để bật / tắt. */
function attach(model: MobModel, arm: string, item: string, slot: string, atlas: Atlas, left = false): void {
  const g = model.parts.get(arm);
  if (!g) return;
  void heldModel(item, atlas).then((m) => {
    const o = m.clone(), r = Math.SQRT1_2, sc = 0.55 * 1.25;
    o.scale.setScalar(sc);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, r, r), new THREE.Vector3(0, -r, r), new THREE.Vector3(1, 0, 0)));
    o.position.set((left ? -1 : 1) / 16, -10.5 / 16, 0.354 * sc);
    g.add(o);
    model.root.userData[slot] = o;
  });
}

/** Đồ cầm tay của người lợn (kiếm vàng + nỏ, bật theo biến thể; thỏi vàng tay trái khi ngắm), vệ binh (rìu vàng). true = loài 10d1. */
export function attachHeld10d(model: MobModel, key: MobKey, atlas: Atlas): boolean {
  if (key === "piglin_brute") attach(model, "right_arm", "gold_axe", "weapon", atlas);
  else if (key === "piglin") {
    attach(model, "right_arm", "gold_sword", "sword", atlas);
    attach(model, "right_arm", "crossbow", "crossbow", atlas);
    attach(model, "left_arm", "gold_ingot", "gold", atlas, true);
  } else return key === "zoglin";
  return true;
}

const show = (model: MobModel, slot: string, on: boolean): void => {
  const o = model.root.userData[slot] as THREE.Object3D | undefined;
  if (o) o.visible = on;
};

export function pose10d(model: MobModel, key: MobKey, v: NetMob, phase: number, t: number, amp: number, set: SetFn): void {
  const s = Math.sin(phase) * amp, angry = (v.flags & MOB_FLAG.ANGRY) !== 0;
  if (v.extra & MOB_EXTRA.ZOMBIFYING) model.root.rotation.y += Math.sin(t * 50) * 0.08; // run: sắp thành xác sống
  if (key === "zoglin") return set("head", (angry ? 0.35 : 0) + Math.max(0, -s) * 0.2);
  set("right_leg", s * 1.4);
  set("left_leg", -s * 1.4);
  for (const ear of ["left_ear", "right_ear"]) set(ear, 0, 0, Math.sin(t * 2) * 0.05 * (ear === "left_ear" ? -1 : 1));
  const admiring = (v.extra & MOB_EXTRA.ADMIRING) !== 0, crossbow = key === "piglin" && v.variant === 2, baby = (v.flags & MOB_FLAG.BABY) !== 0;
  show(model, "sword", key === "piglin" && v.variant === 1 && !baby);
  show(model, "crossbow", crossbow && !baby);
  show(model, "gold", admiring);
  if (admiring) { // giơ thỏi vàng lên trước mặt
    set("left_arm", -0.9, 0.5, 0);
    set("right_arm", -s * 0.5, 0, 0);
  } else if (crossbow && angry) { // giương nỏ: hai tay đưa ra trước
    set("right_arm", -Math.PI / 2 - v.pitch, -0.3, 0);
    set("left_arm", -Math.PI / 2 - v.pitch, 0.6, 0);
  } else if (angry) { // vung vũ khí
    set("right_arm", -Math.PI / 2 + Math.sin(t * 9) * 0.6, 0, 0);
    set("left_arm", s, 0, 0);
  } else {
    set("right_arm", -s, 0, 0);
    set("left_arm", s, 0, 0);
  }
}

/** (10d1) Phát sáng: vẽ sáng hẳn và đè lên mọi thứ (thấy xuyên tường) — gọi sau khi đã tô màu theo ánh sáng. */
export function glow10d(model: MobModel, v: NetMob): void {
  const on = (v.flags & MOB_FLAG.GLOWING) !== 0, mats = [...model.materials, ...(model.overlayMat ? [model.overlayMat] : [])];
  if (on) for (const m of mats) m.color.setScalar(1.3);
  if (model.root.userData.glowing === on) return;
  model.root.userData.glowing = on;
  for (const m of mats) {
    m.depthTest = !on;
    m.needsUpdate = true;
  }
  model.root.traverse((o) => void (o.renderOrder = on ? 10 : 0));
}
