// Giờ trong ngày (Giai đoạn 7a; MECHANICS.md 7): góc mặt trời, độ tối của trời theo giờ (như Minecraft), giờ ngủ,
// giờ quái xác sống / bộ xương bị cháy. time = số tick trong ngày 0..23999 (0 = bình minh, 6000 = trưa).
import { DAY } from "./mobConstants.js";

export const dayTick = (t: number): number => ((Math.floor(t) % DAY.TICKS) + DAY.TICKS) % DAY.TICKS;

/** Góc thiên thể 0..1 (0 = trưa, 0.5 = nửa đêm), có làm chậm quanh trưa / nửa đêm như Minecraft. */
export function celestialAngle(t: number): number {
  let f = ((t % DAY.TICKS) + DAY.TICKS) % DAY.TICKS / DAY.TICKS - 0.25;
  if (f < 0) f += 1;
  const g = f;
  f = 1 - (Math.cos(f * Math.PI) + 1) / 2;
  return g + (f - g) / 3;
}

/** Độ "tối" của trời 0..1 (0 = ban ngày, 1 = đêm). */
export function nightFactor(t: number): number {
  const c = Math.cos(celestialAngle(t) * Math.PI * 2);
  return Math.max(0, Math.min(1, 1 - (c * 2 + 0.5)));
}

/** Số mức ánh sáng trời bị trừ theo giờ (0 ban ngày .. 11 nửa đêm). */
export const skyDarken = (t: number): number => Math.floor(nightFactor(t) * DAY.SKY_DARKEN_MAX);

/** Ánh sáng trời thực tế ở ô có mức trời `sky` (0..15) vào giờ t. */
export const effectiveSky = (sky: number, t: number): number => Math.max(0, sky - skyDarken(t));

/** Hệ số sáng của trời khi vẽ (client): 1 ban ngày, DAY.NIGHT_BRIGHTNESS lúc nửa đêm. */
export const daylight = (t: number): number => 1 - nightFactor(t) * (1 - DAY.NIGHT_BRIGHTNESS);

/** Ngủ được vào giờ này không. */
export function canSleepAt(t: number): boolean {
  const d = dayTick(t);
  return d >= DAY.SLEEP_FROM && d < DAY.SLEEP_TO;
}

/** Giờ quái xác sống / bộ xương bị nắng đốt (ban ngày, kể cả lúc mặt trời vừa mọc). */
export function sunBurnsAt(t: number): boolean {
  const d = dayTick(t);
  return d < DAY.UNDEAD_SAFE_FROM || d >= DAY.UNDEAD_BURN_FROM;
}
