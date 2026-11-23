// Hiển thị riêng các loài Giai đoạn 7c: chọn model / ảnh theo biến thể và trạng thái (sói thuần / giận, cáo ngủ, thỏ / lạc đà
// theo màu, cá nhiệt đới theo dáng + hoa văn + màu), tư thế (sói ngồi, cáo nằm ngủ, tatu cuộn tròn, cá nóc phồng), cử động
// (cánh dơi, xúc tu mực, đuôi cá / cá heo, thỏ nhảy), vòng cổ tô màu và giáp sói.
import * as THREE from "three";
import {
  HORSE_COLORS, HORSE_MARKINGS, LLAMA_SKINS, MOB_EXTRA, MOB_FLAG, RABBIT_SKINS, WOLF_SKINS, type MobKey, type NetMob,
} from "../../../shared/src/index.js";
import type { MobModel } from "./mobModels.js";
import { pose8a, skinName8a } from "./mobPose8a.js";

/** Màu lông cừu / vòng cổ / cá nhiệt đới theo 16 màu (thứ tự COLORS). */
export const FLEECE = [
  0xf9fffe, 0xf9801d, 0xc74ebd, 0x3ab3da, 0xfed83d, 0x80c71f, 0xf38baa, 0x474f52,
  0x9d9d97, 0x169c9c, 0x8932b8, 0x3c44aa, 0x835432, 0x5e7c16, 0xb02e26, 0x1d1d21,
];
const PX = 1 / 16;

/** Dáng / hoa văn / màu cá nhiệt đới suy ra từ id (cố định theo con). */
const tropical = (id: number): { b: boolean; pattern: number; base: number; mark: number } =>
  ({ b: ((id * 7) & 1) === 1, pattern: 1 + ((id * 3) % 6), base: FLEECE[(id * 5) % 16]!, mark: FLEECE[(id * 11 + 3) % 16]! });

/** Khóa model trong MOB_MODELS. */
export function modelKey(key: MobKey, id: number): string {
  return key === "tropical_fish" && tropical(id).b ? "tropical_fish_b" : key;
}

/** Tên ảnh skin chính theo biến thể + trạng thái; null = dùng cách chọn cũ (7a–7b). */
export function skinName(key: MobKey, v: NetMob): string | null {
  switch (key) {
    case "rabbit": return `rabbit_${RABBIT_SKINS[v.variant] ?? "brown"}`;
    case "wolf": {
      const s = WOLF_SKINS[v.variant] ? `_${WOLF_SKINS[v.variant]}` : "";
      return `wolf${s}${v.extra & MOB_EXTRA.TAMED ? "_tame" : v.flags & MOB_FLAG.ANGRY ? "_angry" : ""}`;
    }
    case "fox": return `fox${v.variant === 1 ? "_snow" : ""}${v.extra & MOB_EXTRA.SLEEPING ? "_sleep" : ""}`;
    case "llama": return `llama_${LLAMA_SKINS[v.variant] ?? "creamy"}`;
    case "tropical_fish": return tropical(v.id).b ? "tropical_b" : "tropical_a";
    case "horse": return `horse_${HORSE_COLORS[Math.floor(v.variant / HORSE_MARKINGS.length)] ?? "brown"}`; // (7d)
    default: return skinName8a(key, v);
  }
}

/** Lúc tạo: màu thân + ảnh / màu hoa văn cá nhiệt đới. Trả về màu nhân thêm cho thân (hoặc null). */
export function setup7c(model: MobModel, key: MobKey, id: number, skin: (n: string) => THREE.Texture, variant = 0): THREE.Color | null {
  const marks = model.extra.get("markings"); // (7d) vết lông ngựa theo biến thể
  if (marks) {
    const mk = HORSE_MARKINGS[variant % HORSE_MARKINGS.length];
    marks.mat.visible = !!mk;
    if (mk) marks.mat.map = skin(`horse_markings_${mk}`);
  }
  if (key !== "tropical_fish") return null;
  const t = tropical(id), layer = model.extra.get("pattern");
  if (layer) {
    layer.mat.map = skin(`tropical_${t.b ? "b" : "a"}_pattern_${t.pattern}`);
    (layer.mat.userData.base as THREE.Color).setHex(t.mark);
  }
  return new THREE.Color(t.base);
}

type SetFn = (name: string, x: number, y?: number, z?: number) => void;

/** Đặt phần gốc tên `name` (và lớp phủ cùng tên) ở điểm xoay Minecraft p với góc r; p = null: về chỗ cũ. */
function place(model: MobModel, name: string, p: readonly number[] | null, r?: readonly number[]): void {
  for (const g of [model.parts.get(name), ...[...model.extra.values()].map((l) => l.parts.get(name))]) {
    if (!g) continue;
    if (p) g.position.set(-p[0]! * PX, (24 - p[1]!) * PX, -p[2]! * PX);
    else g.position.copy(g.userData.restPos as THREE.Vector3);
    if (r) g.rotation.set(r[0]!, r[1]!, r[2]!);
  }
}

const show = (model: MobModel, name: string, on: boolean): void => {
  const g = model.parts.get(name);
  if (g) g.visible = on;
};

/** Sói ngồi (số liệu tư thế như Minecraft). */
const WOLF_SIT: [string, number[], number[]][] = [
  ["upper_body", [-1, 16, -3], [1.2566, 0, 0]], ["body", [0, 18, 0], [Math.PI / 4, 0, 0]], ["tail", [-1, 21, 6], [0.6283, 0, 0]],
  ["right_hind_leg", [-2.5, 22.7, 2], [4.7124, 0, 0]], ["left_hind_leg", [0.5, 22.7, 2], [4.7124, 0, 0]],
  ["right_front_leg", [-2.49, 17, -4], [5.8119, 0, 0]], ["left_front_leg", [0.51, 17, -4], [5.8119, 0, 0]],
];

/** Mỗi khung: tư thế + cử động riêng loài 7c. phase: nhịp bước; t: đồng hồ riêng (cánh, xúc tu, đuôi). */
export function pose7c(model: MobModel, key: MobKey, v: NetMob, phase: number, t: number, amp: number, set: SetFn): void {
  const P = model.parts;
  switch (key) {
    case "wolf": {
      const sit = (v.extra & MOB_EXTRA.SITTING) !== 0;
      for (const [n, p, r] of WOLF_SIT) place(model, n, sit ? p : null, sit ? r : undefined);
      const collar = model.extra.get("collar"), armor = model.extra.get("armor");
      if (collar) {
        collar.mat.visible = (v.extra & MOB_EXTRA.TAMED) !== 0;
        (collar.mat.userData.base as THREE.Color).setHex(FLEECE[(v.extra >> 4) & 15]!);
      }
      if (armor) armor.mat.visible = (v.extra & MOB_EXTRA.ARMORED) !== 0;
      if (!sit) set("tail", 0, Math.sin(phase) * amp * 0.5);
      break;
    }
    case "fox": {
      const sleep = (v.extra & MOB_EXTRA.SLEEPING) !== 0;
      for (const n of ["right_hind_leg", "left_hind_leg", "right_front_leg", "left_front_leg"]) show(model, n, !sleep);
      model.body.rotation.z = sleep ? -Math.PI / 2 : 0; // nằm nghiêng
      model.body.position.set(sleep ? -0.3 : 0, sleep ? 0.25 : 0, 0);
      break;
    }
    case "armadillo": {
      const rolled = (v.extra & MOB_EXTRA.ROLLED) !== 0;
      for (const [n, g] of P) if (g.parent === model.body) g.visible = n === "cube" ? rolled : !rolled; // phần gốc; phần con theo cha
      break;
    }
    case "llama": case "donkey": case "mule": case "horse": { // (7d) rương hai bên, yên theo byte riêng loài
      const chest = (v.extra & MOB_EXTRA.CHEST) !== 0;
      show(model, "right_chest", chest);
      show(model, "left_chest", chest);
      const saddle = model.extra.get("saddle");
      if (saddle) saddle.mat.visible = (v.extra & MOB_EXTRA.SADDLED) !== 0;
      const armor = (v.extra >> MOB_EXTRA.HORSE_ARMOR_SHIFT) & 3; // (10c) giáp ngựa
      for (let k = 1; k <= 3; k++) { const l = model.extra.get(`armor${k}`); if (l) l.mat.visible = armor === k; }
      set("tail", Math.sin(t * 2) * 0.08, Math.sin(t * 1.3) * 0.15);
      break;
    }
    case "pufferfish":
      for (const [n, i] of [["s", 0], ["m", 1], ["b", 2]] as const) show(model, n, (v.extra & 3) === i);
      break;
    case "bat": {
      const a = Math.cos(t * 20) * 0.6;
      set("right_wing", 0, a);
      set("right_wing_tip", 0, a * 0.5);
      set("left_wing", 0, -a);
      set("left_wing_tip", 0, -a * 0.5);
      break;
    }
    case "squid": case "glow_squid":
      for (let i = 0; i < 8; i++) set(`n${i}`, Math.sin(t * 3) * 0.3 + 0.3);
      break;
    case "cod": set("tail_fin", 0, Math.sin(t * 8) * 0.4); break;
    case "tropical_fish": set("tail", 0, Math.sin(t * 8) * 0.4); break;
    case "salmon": set("body_back", 0, Math.sin(t * 8) * 0.3); break;
    case "dolphin": set("tail", Math.sin(t * 4) * 0.2); set("tail_fin", Math.sin(t * 4) * 0.3); break;
    case "rabbit": model.body.position.y = Math.abs(Math.sin(phase)) * amp * 0.25; break; // nhảy
    default: pose8a(model, key, v, phase, t, amp, set); break;
  }
}
