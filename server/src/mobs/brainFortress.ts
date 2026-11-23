// AI quỷ lửa (Giai đoạn 10c; theo Minecraft Blaze + Blaze$BlazeAttackGoal): lơ lửng hạ chậm, mục tiêu cao hơn thì bay lên; mục tiêu
// trong 2 block: đánh cận chiến 6; thấy mục tiêu trong 48 block: đứng yên nạp lửa 3 giây (người bốc cháy), bắn 3 cầu lửa nhỏ cách nhau
// 0.3 giây rồi nghỉ 5 giây; không thấy thì bay về phía mục tiêu. Không có mục tiêu: trôi lang thang chậm.
import { BLAZE, type MobMove } from "../../../shared/src/index.js";
import { face, hdist, sees, toward, type BrainCtx } from "./brain.js";
import type { Mob } from "./mob.js";

export function blazeBrain(ctx: BrainCtx, m: Mob, mv: MobMove): void {
  const t = m.target, dt = ctx.dt;
  mv.vy = m.body.onGround ? 0 : BLAZE.SINK_V;
  if (!t) {
    m.blazeStep = 0;
    m.aimS = 0;
    m.idleS -= dt; // trôi lang thang: giữ hướng một lúc rồi đổi
    if (m.idleS <= 0) {
      m.idleS = 2 + ctx.rng() * 4;
      m.yaw = ctx.rng() * Math.PI * 2;
      m.speed = ctx.rng() < 0.5 ? 0 : m.def.walk;
    }
    mv.vx = -Math.sin(m.yaw) * m.speed;
    mv.vz = -Math.cos(m.yaw) * m.speed;
    return;
  }
  if (t.y + 1.62 > m.eyeY + BLAZE.HOVER_DY) mv.vy = BLAZE.RISE_V; // mục tiêu cao hơn: bay lên
  face(m, t.x, t.z);
  const d = Math.hypot(t.x - m.x, t.y - m.y, t.z - m.z), visible = sees(ctx, m, t);
  m.pitch = Math.atan2(t.y + 1 - m.eyeY, hdist(m.x, m.z, t.x, t.z));
  if (d < BLAZE.MELEE_R) { // sát bên: đánh cận chiến
    toward(mv, m, t.x, t.z, m.def.run);
    if (m.attackCdS <= 0) {
      ctx.meleeHit(m, t);
      m.attackCdS = m.def.attackS;
    }
    return;
  }
  if (!visible || d > m.def.follow) { // không thấy: bay lại gần
    m.blazeStep = 0;
    return toward(mv, m, t.x, t.z, m.def.walk);
  }
  // nạp lửa → loạt 3 cầu lửa → nghỉ (aimS: đếm lùi tới bước kế)
  m.aimS -= dt;
  if (m.aimS > 0) return;
  m.blazeStep++;
  if (m.blazeStep === 1) m.aimS = BLAZE.CHARGE_S;
  else if (m.blazeStep <= 1 + BLAZE.BURST) {
    m.aimS = BLAZE.BURST_GAP_S;
    ctx.blazeFire(m, t);
  } else {
    m.aimS = BLAZE.REST_S;
    m.blazeStep = 0;
  }
}
