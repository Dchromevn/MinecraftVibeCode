// Môi trường quanh sinh vật (tách từ mobs.ts, Giai đoạn 7b): dung nham, lửa, xương rồng, nắng đốt, đang cháy; nước làm
// hại kẻ hư không (và nó dịch chuyển đi); đẩy nhau khi chồng lên; tìm chỗ đứng để dịch chuyển.
import { B, BLAZE, MOB_AI, PLAYER, STRIDER, type CellReader, type Rng } from "../../../shared/src/index.js";
import { DOLPHIN_AIR_S } from "./brainWater.js";
import type { Mob } from "./mob.js";
import type { MobDamage } from "./mobs.js";
import type { PathFinder } from "./pathfind.js";

export const FISH_AIR_S = 5; // cá trên cạn giãy được 5 giây

export interface EnvHost {
  dt: number;
  rng: Rng;
  hurt(m: Mob, amount: number, src: MobDamage): boolean;
  teleport(m: Mob): boolean;
  lightRaw(x: number, y: number, z: number): number;
  isWater(x: number, y: number, z: number): boolean;
}

/** Dung nham, lửa, xương rồng, nắng đốt (quái cháy dưới nắng ngoài trời ban ngày), đang cháy, nước (kẻ hư không). */
export function environment(h: EnvHost, m: Mob, burnTime: boolean, dtScale = 1): void {
  const b = m.body, dt = h.dt * dtScale, fp = !!m.def.fireproof; // (10b) sinh vật Vực Lửa không cháy
  if (b.inLava && !fp) {
    h.hurt(m, PLAYER.LAVA_DAMAGE, "lava");
    m.burnS = PLAYER.LAVA_BURN_S;
  }
  if (b.inFire && !fp) {
    h.hurt(m, 1, "fire");
    m.burnS = Math.max(m.burnS, MOB_AI.SUN_BURN_S);
  }
  if (b.inCactus) h.hurt(m, 1, "cactus");
  if (b.inWater) m.burnS = 0;
  // kẻ hư không sợ nước: mất 1 máu và tìm chỗ khác
  if (m.def.key === "enderman" && b.inWater && h.rng() < dt * 2) {
    h.hurt(m, 1, "other");
    h.teleport(m);
  }
  if (m.def.aquatic) breathe(h, m, dt);
  if (m.def.key === "strider" && b.inWater && h.rng() < dt) h.hurt(m, STRIDER.WATER_DAMAGE, "other"); // (10b) kẻ lội dung nham sợ nước
  if (m.def.key === "blaze" && b.inWater && h.rng() < dt * 2) h.hurt(m, BLAZE.WATER_DAMAGE, "other"); // (10c) quỷ lửa sợ nước
  if (m.def.burnsInSun && burnTime && !b.inWater && m.burnS <= 0) {
    const raw = h.lightRaw(Math.floor(m.x), Math.floor(m.eyeY), Math.floor(m.z));
    if (raw >> 4 === 15) m.burnS = MOB_AI.SUN_BURN_S; // thấy trời
  }
  if (m.burnS > 0 && !b.inLava) {
    m.burnS = Math.max(0, m.burnS - dt);
    m.fireT += dt;
    if (m.fireT >= 1) {
      m.fireT -= 1;
      h.hurt(m, MOB_AI.FIRE_DAMAGE, "fire");
    }
  } else if (m.burnS <= 0) m.fireT = 0;
}

/**
 * (7c) Sinh vật nước: cá / mực ở trên cạn chịu được FISH_AIR_S giây rồi mất 1 máu mỗi giây; cá heo thở bằng phổi — đầu
 * dưới nước thì dưỡng khí giảm dần, hết thì mất máu, ngoi lên mặt nước thì đầy lại.
 */
function breathe(h: EnvHost, m: Mob, dt: number): void {
  const dolphin = m.def.key === "dolphin";
  const wet = dolphin ? h.isWater(Math.floor(m.x), Math.floor(m.eyeY + 0.2), Math.floor(m.z)) : m.body.inWater;
  if (dolphin ? !wet : wet) {
    m.airS = dolphin ? DOLPHIN_AIR_S : FISH_AIR_S;
    return;
  }
  m.airS -= dt;
  if (m.airS > 0) return;
  m.airS += 1;
  h.hurt(m, dolphin ? 2 : 1, "other");
}

const LOD_DIST = 24, LOD_EVERY = 3;

/** (7c) Bước tính của sinh vật môi trường (dơi, cá, mực): xa mọi người chơi hơn 24 block thì 3 tick tính một lần (0 = bỏ tick này). */
export function lodStep(m: Mob, players: readonly { x: number; y: number; z: number }[], tickNo: number): number {
  if (!m.def.ambient || players.some((p) => Math.abs(p.x - m.x) < LOD_DIST && Math.abs(p.z - m.z) < LOD_DIST && Math.abs(p.y - m.y) < LOD_DIST)) return 1;
  return (tickNo + m.id) % LOD_EVERY === 0 ? LOD_EVERY : 0;
}

/** Sinh vật chồng lên nhau thì đẩy nhẹ ra (không đứng dồn một chỗ). */
export function separate(l: readonly Mob[]): void {
  for (let i = 0; i < l.length; i++)
    for (let j = i + 1; j < l.length; j++) {
      const a = l[i]!, b = l[j]!;
      const dx = b.x - a.x, dz = b.z - a.z, min = (a.width + b.width) / 2;
      if (Math.abs(dx) >= min || Math.abs(dz) >= min || Math.abs(a.y - b.y) > 1 || a.dead || b.dead) continue;
      const d = Math.hypot(dx, dz) || 0.01, push = (min - d) * 2;
      a.body.vx -= (dx / d) * push;
      a.body.vz -= (dz / d) * push;
      b.body.vx += (dx / d) * push;
      b.body.vz += (dz / d) * push;
    }
}

/**
 * Chỗ đứng để dịch chuyển: ngẫu nhiên trong 32 block ngang (gần `near` thì trong 8 block quanh đó), dò xuống tìm chỗ có sàn,
 * đủ cao, không phải nước. null nếu thử 16 lần không được.
 */
export function teleportSpot(paths: PathFinder, cell: CellReader, m: Mob, rng: Rng, near?: { x: number; y: number; z: number }, radius?: number) {
  const cells = Math.max(1, Math.ceil(m.height - 0.05)), r = radius ?? (near ? 8 : 32);
  const cx = near?.x ?? m.x, cy = near?.y ?? m.y, cz = near?.z ?? m.z;
  for (let t = 0; t < 16; t++) {
    const x = Math.floor(cx + (rng() * 2 - 1) * r), z = Math.floor(cz + (rng() * 2 - 1) * r);
    const y0 = Math.floor(cy + (rng() * 2 - 1) * (r / 2));
    for (let y = y0; y > y0 - 24 && y > 1; y--) {
      const c = cell(x, y - 1, z);
      if (c < 0) break;
      if ((c & 255) === B.WATER || (c & 255) === B.LAVA) break;
      if (paths.standable(x, y, z, cells)) return { x: x + 0.5, y, z: z + 0.5 };
    }
  }
  return null;
}
