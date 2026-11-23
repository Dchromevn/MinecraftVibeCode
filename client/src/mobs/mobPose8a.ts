// Hiển thị riêng các loài Giai đoạn 8a: ảnh skin theo vùng + nghề (dân làng, dân làng xác sống), màu mèo; tư thế (chân dân làng /
// người sắt bước, tay người sắt vung, tay dân làng xác sống giơ thẳng, mèo ngồi), vòng cổ mèo thuần (tô màu), yên lạc đà, dân
// làng xác sống đang được chữa thì rung.
import {
  CAT_SKINS, LLAMA_SKINS, MOB_EXTRA, VILLAGER_PROFS, VILLAGER_TYPES, type MobKey, type NetMob,
} from "../../../shared/src/index.js";
import * as THREE from "three";
import type { Atlas } from "../atlas.js";
import { heldModel } from "../player/heldItem.js";
import type { MobModel } from "./mobModels.js";
import { FLEECE } from "./mobPose7c.js";
import { pose8c, skinName8c } from "./mobPose8c.js";

const villagerSkin = (base: string, variant: number): string =>
  `${base}_${VILLAGER_TYPES[variant >> 4] ?? "plains"}_${VILLAGER_PROFS[variant & 15] ?? "none"}`;

/** Ảnh skin chính; null = không phải loài 8a. */
export function skinName8a(key: MobKey, v: NetMob): string | null {
  switch (key) {
    case "villager": case "zombie_villager": return villagerSkin(key, v.variant);
    case "wandering_trader": case "iron_golem": case "camel": case "pillager": case "allay": return key;
    case "cat": return `cat_${CAT_SKINS[v.variant] ?? "tabby"}`;
    case "trader_llama": return `llama_${LLAMA_SKINS[v.variant] ?? "creamy"}`;
    default: return skinName8c(key, v);
  }
}

type SetFn = (name: string, x: number, y?: number, z?: number) => void;

/** Mèo ngồi: nghiêng thân, chân sau gập (số liệu gần đúng Minecraft). */
function catSit(model: MobModel, sit: boolean): void {
  const b = model.parts.get("body");
  if (b) b.rotation.x = (b.userData.rest as { x: number }).x + (sit ? -Math.PI / 4 : 0);
  model.body.position.y = sit ? -0.12 : 0;
}

/** Mỗi khung: cử động riêng loài 8a. */
export function pose8a(model: MobModel, key: MobKey, v: NetMob, phase: number, t: number, amp: number, set: SetFn): void {
  const s = Math.sin(phase) * amp;
  switch (key) {
    case "villager": case "wandering_trader":
      set("right_leg", s * 0.9);
      set("left_leg", -s * 0.9);
      break;
    case "zombie_villager": {
      const shake = v.extra & MOB_EXTRA.CURING ? Math.sin(t * 40) * 0.08 : 0; // đang chữa: run rẩy
      set("right_arm", -Math.PI / 2 + s * 0.1);
      set("left_arm", -Math.PI / 2 - s * 0.1);
      set("right_leg", s * 0.9);
      set("left_leg", -s * 0.9);
      set("head", -v.pitch, shake);
      break;
    }
    case "iron_golem":
      set("right_leg", s * 0.7);
      set("left_leg", -s * 0.7);
      set("right_arm", -s * 0.8);
      set("left_arm", s * 0.8);
      break;
    case "cat": {
      const sit = (v.extra & MOB_EXTRA.SITTING) !== 0, collar = model.extra.get("collar");
      catSit(model, sit);
      if (collar) {
        collar.mat.visible = (v.extra & MOB_EXTRA.TAMED) !== 0;
        (collar.mat.userData.base as { setHex(h: number): void }).setHex(FLEECE[(v.extra >> 4) & 15]!);
      }
      set("tail1", 0.9 + Math.sin(t * 2) * 0.1);
      break;
    }
    case "camel": {
      const saddle = model.extra.get("saddle");
      if (saddle) saddle.mat.visible = (v.extra & MOB_EXTRA.SADDLED) !== 0;
      set("tail", 0, Math.sin(t * 1.3) * 0.15);
      break;
    }
    case "pillager": { // cầm nỏ: hai tay giơ ra trước, ẩn tay khoanh; đội trưởng (biến thể 1) có cờ
      set("right_leg", s * 0.9);
      set("left_leg", -s * 0.9);
      const arms = model.parts.get("arms");
      if (arms) arms.visible = false;
      for (const n of ["right_arm", "left_arm"]) {
        const g = model.parts.get(n);
        if (g) g.visible = true;
      }
      set("right_arm", -Math.PI / 2 - v.pitch + 0.1, -0.3);
      set("left_arm", -Math.PI / 2 - v.pitch + 0.1, 0.6);
      const b = model.extra.get("banner");
      if (b) {
        b.mat.visible = v.variant === 1;
        for (const n of ["banner", "pole"]) b.parts.get(n)?.scale.setScalar(0.5);
      }
      break;
    }
    case "allay": { // bay: cánh vỗ, thân hơi lắc
      set("right_wing", 0, 0.4 + Math.sin(t * 18) * 0.5);
      set("left_wing", 0, -0.4 - Math.sin(t * 18) * 0.5);
      model.body.position.y = 0.2 + Math.sin(t * 2) * 0.05;
      break;
    }
    default: pose8c(model, key, v, phase, t, amp, set); break; // 8c
  }
}

/** Kẻ cướp cầm nỏ ở tay phải (đặt như đồ cầm tay của người chơi khác: cán trong nắm tay, đầu chĩa ra trước). */
export function attachHeld8a(model: MobModel, key: MobKey, atlas: Atlas): void {
  const arm = key === "pillager" ? model.parts.get("right_arm") : undefined;
  if (!arm) return;
  void heldModel("crossbow", atlas).then((m) => {
    const o = m.clone(), r = Math.SQRT1_2, sc = 0.55 * 1.25;
    o.scale.setScalar(sc);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, r, r), new THREE.Vector3(0, -r, r), new THREE.Vector3(1, 0, 0)));
    o.position.set(1 / 16, -10.5 / 16, 0.354 * sc);
    arm.add(o);
  });
}
