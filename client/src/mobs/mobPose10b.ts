// Hiển thị sinh vật Vực Lửa Giai đoạn 10b (theo Minecraft GhastModel / PiglinModel / MagmaCubeModel / StriderModel / HoglinModel):
// ma bay xúc tu lượn, há miệng (ghast_shooting) trước khi bắn; người lợn xác sống giơ hai tay như xác sống, cầm kiếm vàng (mobPose8c); khối nhầy
// dung nham tách các lát khi bật nhảy; kẻ lội dung nham bước chân dài, lông rung, lạnh thì đổi ảnh tím; lợn rừng lửa cúi đầu khi húc.
import type * as THREE from "three";
import { MOB_EXTRA, MOB_FLAG, type MobKey, type NetMob } from "../../../shared/src/index.js";
import type { MobModel } from "./mobModels.js";
import { pose10c } from "./mobPose10c.js";
import { pose10d } from "./mobPose10d.js";

type SetFn = (name: string, x: number, y?: number, z?: number) => void;

export function skinName10b(key: MobKey, v: NetMob): string | null {
  switch (key) {
    case "ghast": return v.extra & MOB_EXTRA.SHOOTING ? "ghast_shooting" : "ghast";
    case "zombified_piglin": case "hoglin": return key;
    case "magma_cube": return "magmacube";
    case "strider": return v.extra & MOB_EXTRA.COLD ? "strider_cold" : "strider";
    default: return null;
  }
}

export function pose10b(model: MobModel, key: MobKey, v: NetMob, phase: number, t: number, amp: number, set: SetFn): void {
  const s = Math.sin(phase) * amp, P = model.parts;
  switch (key) {
    case "ghast":
      for (let i = 0; i < 9; i++) set(`tentacle${i}`, 0.2 * Math.sin(t * 20 * 0.3 + i) + 0.4);
      break;
    case "zombified_piglin": {
      set("right_leg", s * 1.4);
      set("left_leg", -s * 1.4);
      const angry = (v.flags & MOB_FLAG.ANGRY) !== 0; // tức: giơ hai tay như xác sống
      set("right_arm", angry ? -Math.PI / 2 + s * 0.1 : -s, 0, 0);
      set("left_arm", angry ? -Math.PI / 2 - s * 0.1 : s, 0, 0);
      for (const ear of ["left_ear", "right_ear"]) set(ear, 0, 0, Math.sin(t * 2) * 0.05 * (ear === "left_ear" ? -1 : 1));
      break;
    }
    case "magma_cube": { // lát giãn ra khi đang bật lên (đo theo vận tốc dọc)
      const last = (model.root.userData.lastY as number | undefined) ?? v.y, dy = v.y - last;
      model.root.userData.lastY = v.y;
      const squish = Math.max(0, Math.min(1, Math.abs(dy) * 6));
      for (let i = 0; i < 8; i++) {
        const g = P.get(`n${i}`);
        if (g) g.position.y = (g.userData.restPos as THREE.Vector3).y + (4 - i) * squish * 1.7 / 16;
      }
      break;
    }
    case "strider": {
      set("right_leg", s * 1.2, 0, 0);
      set("left_leg", -s * 1.2, 0, 0);
      const cold = (v.extra & MOB_EXTRA.COLD) !== 0, wob = Math.sin(t * (cold ? 40 : 6)) * (cold ? 0.03 : 0.1);
      for (const n of ["right_bottom_bristle", "right_middle_bristle", "right_top_bristle"]) set(n, 0, 0, wob);
      for (const n of ["left_bottom_bristle", "left_middle_bristle", "left_top_bristle"]) set(n, 0, 0, -wob);
      const saddle = model.extra.get("saddle");
      if (saddle) saddle.mat.visible = (v.extra & MOB_EXTRA.SADDLED) !== 0;
      break;
    }
    case "hoglin":
      set("head", (v.flags & MOB_FLAG.ANGRY ? 0.35 : 0) + Math.max(0, -s) * 0.2);
      break;
    case "piglin": case "piglin_brute": case "zoglin": pose10d(model, key, v, phase, t, amp, set); break; // (10d1)
    default: pose10c(model, key, v, t, set); break; // (10c) quỷ lửa
  }
}

