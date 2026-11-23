// Hiển thị sinh vật Giai đoạn 10c (theo Minecraft BlazeModel.setupAnim): quỷ lửa — 12 que xoay thành 3 vòng (bán kính 9 / 7 / 5, nhấp
// nhô), luôn sáng (lớp "glow"), đang nạp lửa / bắn thì bốc lửa; bộ xương héo dùng model bộ xương phóng to 1.2, cầm kiếm đá (mobPose8c).
import { MOB_EXTRA, type MobKey, type NetMob } from "../../../shared/src/index.js";
import type { Particles } from "../fx/particles.js";
import type { MobModel } from "./mobModels.js";

type SetFn = (name: string, x: number, y?: number, z?: number) => void;
const PX = 1 / 16;

export function pose10c(model: MobModel, key: MobKey, v: NetMob, t: number, set: SetFn): void {
  if (key !== "blaze") return;
  const age = t * 20, groups = [model.parts, ...model.layers];
  const place = (i: number, x: number, y: number, z: number): void => {
    for (const ps of groups) ps.get(`n${i}`)?.position.set(-x * PX, (24 - y) * PX, -z * PX); // hệ Minecraft → model (như buildParts)
  };
  let f = age * Math.PI * -0.1;
  for (let i = 0; i < 4; i++, f += Math.PI / 2) place(i, Math.cos(f) * 9, -2 + Math.cos((2 * i + age) * 0.25), Math.sin(f) * 9);
  f = Math.PI / 4 + age * Math.PI * 0.03;
  for (let i = 4; i < 8; i++, f += Math.PI / 2) place(i, Math.cos(f) * 7, 2 + Math.cos((2 * i + age) * 0.25), Math.sin(f) * 7);
  f = 0.47123894 + age * Math.PI * -0.05;
  for (let i = 8; i < 12; i++, f += Math.PI / 2) place(i, Math.cos(f) * 5, 11 + Math.cos((1.5 * i + age) * 0.5), Math.sin(f) * 5);
  set("head", -v.pitch);
}

/** Quỷ lửa đang nạp lửa / bắn: lửa bốc quanh thân (gọi mỗi khung). */
export function fx10c(fx: Particles, key: MobKey, v: NetMob, dt: number): void {
  if (key !== "blaze" || !(v.extra & MOB_EXTRA.SHOOTING) || Math.random() > dt * 30) return;
  fx.flame(v.x + (Math.random() - 0.5) * 0.8, v.y + Math.random() * 1.8, v.z + (Math.random() - 0.5) * 0.8);
}
