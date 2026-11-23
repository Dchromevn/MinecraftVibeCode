// Cận chiến (Giai đoạn 6a; DESIGN.md 2.8, MECHANICS.md 5.1–5.3): sát thương + tốc độ đánh theo vũ khí, hệ số
// hồi đòn, chí mạng, đẩy lùi, tia nhìn trúng hộp người chơi, tường chắn, vùng an toàn quanh điểm hồi sinh.
// Client dùng để vẽ thanh hồi đòn / chọn mục tiêu; server dùng để quyết định thật.
import { collisionBoxes } from "./blockShapes.js";
import { COMBAT, PLAYER } from "./constants.js";
import { TOOL_TIERS } from "./gameplay.js";
import type { Inventory } from "./inventory.js";
import { SHIELD_KEY, itemDef } from "./items.js";
import type { PlayerState } from "./physics.js";
import { raycast, type RayHit } from "./raycast.js";

export interface WeaponStats {
  damage: number;
  speed: number; // đòn đầy lực mỗi giây
  wear: number; // độ bền mất mỗi đòn trúng (0: không phải công cụ)
}

/** Sát thương, tốc độ đánh của vật phẩm đang cầm (null / vật phẩm thường = tay không). */
export function weaponStats(item: string | null | undefined): WeaponStats {
  const tool = item ? itemDef(item)?.tool : undefined;
  const hand = { damage: COMBAT.HAND_DAMAGE, speed: COMBAT.ATTACK_SPEED.hand, wear: 0 };
  if (!tool || !(tool.tier in TOOL_TIERS)) return hand;
  const sword = TOOL_TIERS[tool.tier].swordDamage, sp = COMBAT.ATTACK_SPEED;
  switch (tool.kind) {
    case "sword":
      return { damage: sword, speed: sp.sword, wear: COMBAT.WEAPON_WEAR };
    case "axe":
      return { damage: sword - COMBAT.AXE_DAMAGE_PENALTY, speed: sp.axe[tool.tier], wear: COMBAT.TOOL_ATTACK_WEAR };
    case "pickaxe":
      return { damage: sword - COMBAT.PICKAXE_DAMAGE_PENALTY, speed: sp.pickaxe, wear: COMBAT.TOOL_ATTACK_WEAR };
    case "shovel":
      return { damage: sword - COMBAT.SHOVEL_DAMAGE_PENALTY, speed: sp.shovel, wear: COMBAT.TOOL_ATTACK_WEAR };
    case "hoe":
      return { damage: COMBAT.HOE_DAMAGE, speed: sp.hoe, wear: COMBAT.TOOL_ATTACK_WEAR };
    default:
      return hand;
  }
}

/** Hệ số lực đánh sau `elapsedS` giây từ đòn trước / lần đổi đồ: 0.2 + ((t + 0.5 tick) / T)² × 0.8, trong [0.2, 1]. */
export function attackStrength(elapsedS: number, speed: number): number {
  const ticks = elapsedS * 20, T = 20 / speed;
  const f = COMBAT.MIN_COOLDOWN_DAMAGE_RATIO + ((ticks + 0.5) / T) ** 2 * (1 - COMBAT.MIN_COOLDOWN_DAMAGE_RATIO);
  return Math.max(COMBAT.MIN_COOLDOWN_DAMAGE_RATIO, Math.min(1, f));
}

/** Chí mạng: đang rơi xuống, đủ lực, không chạy nhanh, không ở trong nước, không leo thang. */
export function isCrit(s: PlayerState, strength: number, sprinting: boolean): boolean {
  return !s.onGround && s.vy < 0 && s.fallDist > 0 && !s.inWater && !s.onLadder && !sprinting && strength >= COMBAT.CRIT_MIN_STRENGTH;
}

/** Đẩy lùi người bị đánh theo hướng (dx, dz) từ người đánh; mult = 2 khi đánh lúc chạy nhanh. */
export function knockback(s: PlayerState, dx: number, dz: number, mult: number): void {
  const len = Math.hypot(dx, dz) || 1, h = COMBAT.KNOCKBACK_H * 20 * mult, v = COMBAT.KNOCKBACK_V * 20;
  s.vx = s.vx / 2 + (dx / len) * h;
  s.vz = s.vz / 2 + (dz / len) * h;
  if (s.onGround) s.vy = Math.min(v, s.vy / 2 + v);
}

/** Hộp va chạm người chơi [x0, y0, z0, x1, y1, z1] (chân ở y, nới pad mỗi phía). */
export function playerHitBox(x: number, y: number, z: number, sneaking: boolean, pad = 0): number[] {
  const hw = PLAYER.WIDTH / 2 + pad, h = (sneaking ? PLAYER.SNEAK_HEIGHT : PLAYER.HEIGHT) + pad;
  return [x - hw, y - pad, z - hw, x + hw, y + h, z + hw];
}

/** Khoảng cách từ gốc tia tới chỗ tia đi vào hộp (null nếu không trúng). dir là vectơ đơn vị. */
export function rayBox(o: readonly number[], d: readonly number[], b: readonly number[]): number | null {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const lo = b[i]!, hi = b[i + 3]!;
    if (Math.abs(d[i]!) < 1e-9) {
      if (o[i]! < lo || o[i]! > hi) return null;
      continue;
    }
    let a = (lo - o[i]!) / d[i]!, c = (hi - o[i]!) / d[i]!;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return null;
  }
  return t0;
}

/** Block có va chạm đầu tiên trên tia (bỏ qua cỏ cao / hoa / đuốc) trong khoảng dist: ô trúng + quãng từ gốc, hoặc null. */
export function firstSolidHit(
  cell: (x: number, y: number, z: number) => number, o: readonly number[], d: readonly number[], dist: number,
): { hit: RayHit; dist: number } | null {
  const idAt = (x: number, y: number, z: number): number => Math.max(0, cell(x, y, z)) & 255;
  let ox = o[0]!, oy = o[1]!, oz = o[2]!, left = dist, gone = 0;
  for (let i = 0; i < 16 && left > 0; i++) {
    const hit = raycast(cell, ox, oy, oz, d[0]!, d[1]!, d[2]!, left);
    if (!hit) return null;
    if (collisionBoxes(hit.cell, hit.x, hit.y, hit.z, idAt).length) return { hit, dist: gone + hit.dist };
    const step = hit.dist + 1e-3; // block không va chạm: đi tiếp qua nó
    ox += d[0]! * step;
    oy += d[1]! * step;
    oz += d[2]! * step;
    left -= step;
    gone += step;
  }
  return null;
}

/** Có block chắn (block có va chạm, không tính cỏ cao / hoa / đuốc) trên tia trong khoảng `dist` không. */
export function lineBlocked(cell: (x: number, y: number, z: number) => number, o: readonly number[], d: readonly number[], dist: number): boolean {
  return firstSolidHit(cell, o, d, dist) !== null;
}

/** Tay đang cầm khiên (ưu tiên tay phải như Minecraft), hoặc null. */
export function shieldHand(inv: Inventory): "main" | "offhand" | null {
  return inv.held?.item === SHIELD_KEY ? "main" : inv.offhand[0]?.item === SHIELD_KEY ? "offhand" : null;
}

/** Khiên của người ở (x, z) nhìn theo yaw có đỡ được đòn từ (ax, az) không: người đánh ở nửa phía trước. */
export function shieldFaces(yaw: number, x: number, z: number, ax: number, az: number): boolean {
  return -Math.sin(yaw) * (ax - x) - Math.cos(yaw) * (az - z) > 0;
}

/** Quét kiếm: người ở (ox, oy, oz) có đứng sát mục tiêu ở (vx, vy, vz) không (hộp mục tiêu nới 1 block ngang, 0.25 dọc). */
export function inSweep(vx: number, vy: number, vz: number, ox: number, oy: number, oz: number): boolean {
  const w = PLAYER.WIDTH + COMBAT.SWEEP_REACH_H;
  return Math.abs(ox - vx) <= w && Math.abs(oz - vz) <= w && Math.abs(oy - vy) <= PLAYER.HEIGHT + COMBAT.SWEEP_REACH_V;
}

/** Ô (x, z) có nằm trong vùng an toàn quanh điểm hồi sinh thế giới không (bán kính 0 = không có vùng an toàn). */
export function inSafeZone(x: number, z: number, safe: { x: number; z: number; r: number } | null): boolean {
  return !!safe && safe.r > 0 && Math.hypot(x - safe.x, z - safe.z) <= safe.r;
}
