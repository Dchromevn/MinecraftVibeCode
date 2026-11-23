// Tốc độ đào (MECHANICS.md mục 4, DESIGN.md 2.2): tiến độ mỗi tick = tốc_độ / độ_cứng /
// (30 nếu đào được ra đồ, ngược lại 100). Giai đoạn 3b chỉ có tay không; Giai đoạn 4 thêm công cụ.
import { B, BLOCKS, type ToolKind } from "./blocks.js";
import { DIGGING, SHEARS, TOOL_TIERS, type ToolTier } from "./constants.js";
import { isLeaves } from "./woods.js";

/** Kéo (Giai đoạn 4f): lá, mạng nhện, cỏ cao rơi ra chính nó. */
export const shearsTakes = (id: number): boolean => isLeaves(id) || id === B.COBWEB || id === B.TALLGRASS || id === B.VINE ||
  id === B.NETHER_SPROUTS || id === B.WEEPING_VINES || id === B.TWISTING_VINES; // (10b)

export interface HeldTool {
  kind: ToolKind;
  tier: ToolTier;
  ench?: Readonly<Record<string, number>>; // (8b2) phù phép của công cụ
}

export interface DigContext {
  tool: HeldTool | null; // null = tay không
  headInWater: boolean;
  onGround: boolean;
  aqua?: boolean; // (8b2) mũ có Thích nghi nước: đào dưới nước không chậm
}

/** Đào block này bằng công cụ đang cầm có rơi ra đồ không. */
export function canHarvest(id: number, tool: HeldTool | null): boolean {
  const d = BLOCKS[id];
  if (!d) return false;
  if (!d.toolRequired && d.minTier === null) return true;
  if (tool?.kind === "shears" && shearsTakes(id)) return true;
  if (!tool || tool.kind !== d.tool) return false;
  return d.minTier === null || TOOL_TIERS[tool.tier].level >= TOOL_TIERS[d.minTier].level;
}

/** Tiến độ đào mỗi giây (1 = phá xong). Infinity = phá ngay; 0 = không phá được. */
export function digRate(id: number, ctx: DigContext): number {
  const d = BLOCKS[id];
  if (!d || !Number.isFinite(d.hardness) || id === B.BEDROCK) return 0;
  if (d.hardness === 0) return Infinity;
  let speed: number = DIGGING.HAND_SPEED;
  const t = ctx.tool;
  if (t && t.kind === "sword" && id === B.COBWEB) speed = DIGGING.SWORD_COBWEB_SPEED;
  else if (t?.kind === "shears" && (isLeaves(id) || id === B.COBWEB)) speed = SHEARS.LEAVES_SPEED;
  else if (t?.kind === "shears" && id === B.WOOL) speed = SHEARS.WOOL_SPEED;
  else if (t && t.kind === d.tool) speed = TOOL_TIERS[t.tier].speed;
  const eff = t?.ench?.efficiency ?? 0; // (8b2) Hiệu suất: + cấp² + 1 khi đúng công cụ
  if (eff > 0 && speed > 1) speed += eff * eff + 1;
  if (speed / d.hardness >= DIGGING.INSTANT_RATIO) return Infinity;
  if (ctx.headInWater && !ctx.aqua) speed /= DIGGING.UNDERWATER_DIVISOR;
  if (!ctx.onGround) speed /= DIGGING.AIRBORNE_DIVISOR;
  const div = canHarvest(id, t) ? DIGGING.HARVEST_DIVISOR : DIGGING.NO_HARVEST_DIVISOR;
  return (DIGGING.TICKS_PER_S * speed) / d.hardness / div;
}
