// Hiển thị các loài Giai đoạn 8c (theo Minecraft IllagerModel / VexModel): đao phủ khoanh tay, đuổi đánh thì giơ rìu sắt; pháp sư
// khoanh tay, làm phép thì giang hai tay lên + hạt phép (tím xám: nanh, trắng xanh: gọi tiểu quỷ); tiểu quỷ bay, cánh vỗ, đang lao
// thì đổi ảnh vex_charging và giơ kiếm. Góc xoay dùng thẳng số của Minecraft (model đổi hệ bằng phép lấy đối xứng tâm — góc giữ nguyên).
import { MOB_EXTRA, MOB_FLAG, type MobKey, type NetMob } from "../../../shared/src/index.js";
import * as THREE from "three";
import type { Atlas } from "../atlas.js";
import type { Particles } from "../fx/particles.js";
import { heldModel } from "../player/heldItem.js";
import type { MobModel } from "./mobModels.js";
import { pose10b, skinName10b } from "./mobPose10b.js";
import { fx10c } from "./mobPose10c.js";
import { attachHeld10d } from "./mobPose10d.js";

type SetFn = (name: string, x: number, y?: number, z?: number) => void;

export function skinName8c(key: MobKey, v: NetMob): string | null {
  switch (key) {
    case "vindicator": case "evoker": return key;
    case "vex": return v.extra & MOB_EXTRA.CHARGING ? "vex_charging" : "vex";
    default: return skinName10b(key, v);
  }
}

/** Hai tay rời (đánh / làm phép) hay tay khoanh. */
function arms(model: MobModel, free: boolean): void {
  const crossed = model.parts.get("arms");
  if (crossed) crossed.visible = !free;
  for (const n of ["right_arm", "left_arm"]) {
    const g = model.parts.get(n);
    if (g) g.visible = free;
  }
}

export function pose8c(model: MobModel, key: MobKey, v: NetMob, phase: number, t: number, amp: number, set: SetFn): void {
  const s = Math.sin(phase) * amp, age = t * 20;
  switch (key) {
    case "vindicator": case "evoker": {
      set("right_leg", s * 0.9);
      set("left_leg", -s * 0.9);
      const casting = key === "evoker" && v.extra > 0, attacking = key === "vindicator" && (v.flags & MOB_FLAG.ANGRY) !== 0;
      arms(model, casting || attacking);
      if (casting) { // SPELLCASTING
        set("right_arm", Math.cos(age * 0.6662) * 0.25, 0, (3 * Math.PI) / 4);
        set("left_arm", Math.cos(age * 0.6662) * 0.25, 0, (-3 * Math.PI) / 4);
      } else if (attacking) { // ATTACKING: giơ rìu lên đầu, vung theo bước chạy
        set("right_arm", -1.885 + Math.cos(age * 0.09) * 0.15 + Math.abs(s) * 0.6, 0.2618);
        set("left_arm", Math.cos(age * 0.19) * 0.5, -0.2618);
      }
      break;
    }
    case "vex": {
      const charging = (v.extra & MOB_EXTRA.CHARGING) !== 0, f = Math.cos(age * 5.5 * (Math.PI / 180)) * 0.1;
      set("body", charging ? 0 : 0.157);
      if (charging) set("right_arm", 3.665, Math.PI / 12, -(Math.PI / 5 + f));
      else set("right_arm", 0, 0, Math.PI / 5 + f);
      set("left_arm", 0, 0, -(Math.PI / 5 + f));
      const w = 1.0996 + Math.cos(age * 45.8366 * (Math.PI / 180)) * (Math.PI / 180) * 16.2;
      set("left_wing", 0.4712, w, -0.4712);
      set("right_wing", 0.4712, -w, 0.4712);
      model.body.position.y = 0.1 + Math.sin(t * 2) * 0.05;
      break;
    }
    default: pose10b(model, key, v, phase, t, amp, set); break; // (10b)
  }
}

/** Đồ cầm tay phải: rìu sắt (đao phủ), kiếm sắt (tiểu quỷ) — đặt như đồ cầm tay của người chơi khác. */
export function attachHeld8c(model: MobModel, key: MobKey, atlas: Atlas): void {
  if (attachHeld10d(model, key, atlas)) return; // (10d1) người lợn, vệ binh
  const item = key === "vindicator" ? "iron_axe" : key === "vex" ? "iron_sword" : key === "zombified_piglin" ? "gold_sword" // (10b)
    : key === "wither_skeleton" ? "stone_sword" : null; // (10c)
  const arm = model.parts.get("right_arm") ?? model.parts.get("rArm"); // (10c) model bộ xương: tay phải tên rArm
  if (!item || !arm) return;
  const sc = key === "vex" ? 0.35 : 0.55 * 1.25, down = key === "vex" ? 4 / 16 : 10.5 / 16;
  void heldModel(item, atlas).then((m) => {
    const o = m.clone(), r = Math.SQRT1_2;
    o.scale.setScalar(sc);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, r, r), new THREE.Vector3(0, -r, r), new THREE.Vector3(1, 0, 0)));
    o.position.set(1 / 16, -down, 0.354 * sc);
    arm.add(o);
  });
}

/** Pháp sư đang làm phép: hạt phép bay lên từ hai bàn tay (gọi mỗi khung). */
export function castFx8c(fx: Particles, key: MobKey, v: NetMob, dt: number): void {
  fx10c(fx, key, v, dt); // (10c) quỷ lửa bốc lửa khi nạp / bắn
  if (key !== "evoker" || !v.extra || Math.random() > dt * 24) return;
  const tint = v.extra === MOB_EXTRA.SUMMONING ? 0xb3b3cc : 0x664d59, side = Math.random() < 0.5 ? 1 : -1;
  const a = v.yaw + (side * Math.PI) / 2, d = 0.6;
  fx.spell(v.x - Math.sin(a) * d, v.y + 1.8 + Math.random() * 0.3, v.z - Math.cos(a) * d, tint);
}
