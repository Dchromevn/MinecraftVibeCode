// Giai đoạn 10d1: người lợn / người lợn vệ binh / lợn rừng lửa ở ngoài Vực Lửa 15 giây thì biến thành người lợn xác sống / lợn rừng
// xác sống (Minecraft: đồ trong túi rơi ra, con non vẫn là con non); đếm lùi hiệu ứng Phát sáng (mũi tên quang phổ) của sinh vật.
import { ZOMBIFY, type ItemStack, type MobKey } from "../../../shared/src/index.js";
import type { Mob } from "./mob.js";
import type { Mobs } from "./mobs.js";

export function piglinLife(mobs: Mobs, dt: number, nether: boolean, pop: (s: ItemStack, x: number, y: number, z: number) => void): void {
  for (const m of [...mobs.list]) {
    if (m.glowS > 0) m.glowS = Math.max(0, m.glowS - dt);
    const into = ZOMBIFY.INTO[m.def.key];
    if (!into || m.dead) continue;
    if (nether) {
      m.zombifyS = 0;
      continue;
    }
    if ((m.zombifyS += dt) >= ZOMBIFY.S) zombify(mobs, m, into as MobKey, pop);
  }
}

function zombify(mobs: Mobs, m: Mob, into: MobKey, pop: (s: ItemStack, x: number, y: number, z: number) => void): void {
  const at = [Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)] as const;
  for (const s of [m.held, ...m.pocket]) if (s) pop(s, ...at);
  mobs.remove(m);
  const z = mobs.spawn(into, m.x, m.y, m.z, { baby: m.baby });
  Object.assign(z, { yaw: m.yaw, persistent: m.persistent });
}
