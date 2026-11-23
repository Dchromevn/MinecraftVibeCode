// Cung tên (Giai đoạn 6b; DESIGN.md 2.8, như Minecraft bản Java): lực kéo theo thời gian giữ chuột, mũi tên bay theo
// từng tick 1/20 giây (trọng lực, lực cản không khí / nước), dừng ở block có va chạm, sát thương theo tốc độ lúc trúng.
// Server mô phỏng thật; client chạy cùng hàm để vẽ mũi tên mượt giữa hai lần server gửi.
import { B } from "./blocks.js";
import { firstSolidHit } from "./combat.js";
import { ARCHERY, COMBAT } from "./constants.js";
import type { Inventory } from "./inventory.js";

export const BOW_KEY = "bow";
export const ARROW_KEY = "arrow";
export const ARROW_TICK = 1 / 20;

/** Lực bắn sau khi kéo t giây: f = t / 1 giây, lực = (f² + 2f) / 3, tối đa 1 (kéo đủ 1 giây). */
export function bowPower(t: number): number {
  const f = Math.max(0, t) / COMBAT.BOW_MAX_DRAW_S;
  return Math.min(1, (f * f + 2 * f) / 3);
}

/** Mức hình cung đang kéo (0, 1, 2) theo lực. */
export function bowStage(power: number): number {
  return power < ARCHERY.STAGES[0] ? 0 : power < ARCHERY.STAGES[1] ? 1 : 2;
}

/** Sát thương mũi tên bay với tốc độ speed (block/giây): ⌈tốc độ (block/tick) × 2⌉, kéo đủ lực thì chí mạng ×1.5; trong [2, 9]. */
export function arrowDamage(speed: number, crit: boolean): number {
  const d = Math.ceil((speed * ARROW_TICK) * ARCHERY.DAMAGE_PER_SPEED) * (crit ? COMBAT.CRIT_MULTIPLIER : 1);
  return Math.max(COMBAT.BOW_MIN_DAMAGE, Math.min(COMBAT.BOW_MAX_DAMAGE, d));
}

/** Các loại mũi tên bắn được: thường, (10d1) quang phổ (trúng thì Phát sáng). */
export const ARROW_KEYS: readonly string[] = [ARROW_KEY, "spectral_arrow"];

/** Mũi tên sẽ bắn: tay trái trước, rồi ô đầu tiên trong túi có mũi tên; null = hết. */
export function firstArrow(inv: Inventory): string | null {
  const o = inv.offhand[0];
  if (o && ARROW_KEYS.includes(o.item)) return o.item;
  return inv.main.find((s) => !!s && ARROW_KEYS.includes(s.item))?.item ?? null;
}

/** Còn mũi tên để bắn không (tay trái hoặc trong túi). */
export const hasArrow = (inv: Inventory): boolean => firstArrow(inv) !== null;

/** Lấy 1 mũi tên (tay trái trước, rồi trong túi): trả về loại đã lấy, null = hết. */
export function takeArrow(inv: Inventory): string | null {
  const o = inv.offhand[0];
  if (o && ARROW_KEYS.includes(o.item)) {
    const k = o.item;
    o.count--;
    if (o.count <= 0) inv.offhand[0] = null;
    return k;
  }
  const i = inv.main.findIndex((s) => !!s && ARROW_KEYS.includes(s.item)), s = inv.main[i];
  if (!s) return null;
  s.count--;
  if (s.count <= 0) inv.main[i] = null;
  return s.item;
}

export interface ArrowState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  stuck: boolean;
  noGravity?: boolean; // (10b) cầu lửa ma bay: bay thẳng, không rơi, không chậm dần
}

/**
 * Một tick bay. Trả về đoạn đã đi (from → to; dir đơn vị, len) để server xét trúng người chơi trên đoạn đó;
 * chạm block có va chạm thì dừng ngay trước chỗ chạm và cắm vào (stuck).
 */
export function stepArrow(a: ArrowState, cell: (x: number, y: number, z: number) => number): { from: number[]; dir: number[]; len: number } {
  const from = [a.x, a.y, a.z];
  const dx = a.vx * ARROW_TICK, dy = a.vy * ARROW_TICK, dz = a.vz * ARROW_TICK;
  const len = Math.hypot(dx, dy, dz);
  if (a.stuck || len === 0) return { from, dir: [0, 0, 0], len: 0 };
  const dir = [dx / len, dy / len, dz / len];
  const hit = firstSolidHit(cell, from, dir, len);
  if (hit) {
    const t = Math.max(0, hit.dist - 0.05); // dừng sát mặt block, đầu tên cắm vào
    a.x += dir[0]! * t;
    a.y += dir[1]! * t;
    a.z += dir[2]! * t;
    a.stuck = true;
    return { from, dir, len: hit.dist };
  }
  a.x += dx;
  a.y += dy;
  a.z += dz;
  if (a.noGravity) return { from, dir, len };
  const inWater = (cell(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z)) & 255) === B.WATER;
  const drag = inWater ? ARCHERY.WATER_DRAG : ARCHERY.DRAG;
  a.vx *= drag;
  a.vy = a.vy * drag - ARCHERY.GRAVITY * ARROW_TICK;
  a.vz *= drag;
  return { from, dir, len };
}
