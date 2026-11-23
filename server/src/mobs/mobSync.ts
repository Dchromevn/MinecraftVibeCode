// Gửi sinh vật cho từng người chơi (Giai đoạn 7a): chỉ con nào mới / đã đổi so với lần gửi trước (chữ ký trạng thái),
// con đã ra khỏi tầm nhìn / đã mất thì báo "gone".
import { MOB_AI, encodeMobs, type NetMob } from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { Mob } from "./mob.js";

/** Gửi cho p sinh vật mới / đổi (vị trí, hướng, cờ) trong tầm nhìn và sinh vật đã mất — gói nhị phân MOBS. */
export function syncMobs(list: readonly Mob[], p: ServerPlayer): void {
  const up: NetMob[] = [], seen = new Set<number>();
  for (const m of list) {
    if (Math.hypot(m.x - p.x, m.z - p.z) > MOB_AI.VIEW) continue;
    seen.add(m.id);
    const n: NetMob = { id: m.id, kind: m.kind, flags: m.flags(), variant: m.def.key === "enderman" ? m.carry : m.variant, x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch, extra: m.extra() };
    const sig = `${n.flags},${n.variant},${n.extra},${m.x.toFixed(2)},${m.y.toFixed(2)},${m.z.toFixed(2)},${Math.round(m.yaw * 40)},${Math.round(m.pitch * 40)}`;
    if (p.knownMobs.get(m.id) === sig) continue;
    p.knownMobs.set(m.id, sig);
    up.push(n);
  }
  const gone: number[] = [];
  for (const id of p.knownMobs.keys())
    if (!seen.has(id)) {
      gone.push(id);
      p.knownMobs.delete(id);
    }
  if (up.length || gone.length) p.conn.send(encodeMobs(up, gone));
}
