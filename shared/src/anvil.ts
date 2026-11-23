// Đe và đá mài (Giai đoạn 8b3; Minecraft Wiki "Anvil mechanics" / "Grindstone", bản Java): tính kết quả + giá (cấp) — client hiện
// trước, server tính lại khi lấy. Đe: gộp phù phép từ sách / món cùng loại (cấp bằng nhau thì +1, tối đa cấp cao nhất), sửa bằng món
// cùng loại (+12% độ bền) hoặc nguyên liệu (mỗi cái 25%), đổi tên; phạt theo số lần đã qua đe (2ⁿ − 1); giá ≥ 40 thì "quá đắt".
// Đá mài: gỡ mọi phù phép (trừ lời nguyền), trả lại một ít kinh nghiệm; hai món cùng loại thì gộp độ bền (+5%).
import { compatible, enchDef, enchSlot, ENCHANTMENTS } from "./enchantments.js";
import type { ItemStack } from "./inventory.js";
import { itemDef, maxDurability } from "./items.js";
import { randInt, type Rng } from "./rng.js";

export const ANVIL = { TOO_EXPENSIVE: 40, DAMAGE_CHANCE: 0.12, NAME_MAX: 35 };

/** Nguyên liệu sửa theo cấp công cụ / giáp. */
const REPAIR: Record<string, string> = { wood: "planks", stone: "cobble", iron: "iron_ingot", gold: "gold_ingot", diamond: "diamond", leather: "leather", netherite: "netherite_ingot" };
function repairMaterial(item: string): string | null {
  const d = itemDef(item), tier = d?.tool?.tier ?? d?.armor?.tier;
  return tier ? REPAIR[tier] ?? null : null;
}

/** Hệ số giá mỗi cấp phù phép theo độ hiếm (đồ / sách). */
const mult = (key: string, book: boolean): number => {
  const w = enchDef(key)?.weight ?? 10, m = w >= 10 ? 1 : w >= 5 ? 2 : w >= 2 ? 4 : 8;
  return book ? Math.max(1, m / 2) : m;
};
const penalty = (s: ItemStack | null): number => 2 ** (s?.work ?? 0) - 1;

export interface AnvilResult { out: ItemStack | null; cost: number; use: number; tooExpensive: boolean }

/** Kết quả đặt left (+ right) lên đe với tên mới name ("" = giữ tên). use: số món bên phải bị tiêu. */
export function anvilResult(left: ItemStack | null, right: ItemStack | null, name: string): AnvilResult {
  const none: AnvilResult = { out: null, cost: 0, use: 0, tooExpensive: false };
  if (!left) return none;
  const out: ItemStack = { ...left, count: 1, ench: { ...(left.ench ?? {}) } };
  let cost = 0, use = 0;
  const max = maxDurability(left.item);
  if (right) {
    const book = right.item === "enchanted_book", same = right.item === left.item, mat = repairMaterial(left.item) === right.item;
    if (mat && max > 0 && left.damage > 0) { // sửa bằng nguyên liệu: mỗi cái 25%
      let dmg = left.damage;
      while (dmg > 0 && use < right.count) {
        dmg = Math.max(0, dmg - Math.floor(max / 4));
        use++;
        cost++;
      }
      out.damage = dmg;
    } else if (book || same) {
      if (same && max > 0 && left.damage > 0) { // gộp độ bền + 12%
        out.damage = Math.max(0, max - ((max - left.damage) + (max - right.damage) + Math.floor(max * 0.12)));
        cost += 2;
      }
      const slot = left.item === "enchanted_book" ? "any" : enchSlot(left.item);
      let added = false;
      for (const [k, rl] of Object.entries(right.ench ?? {})) {
        const def = enchDef(k);
        if (!def || !slot) continue;
        const others = Object.fromEntries(Object.entries(out.ench!).filter(([o]) => o !== k));
        if (!compatible(def, slot, others)) { cost += 1; continue; } // không hợp: phạt 1 (Java)
        const ll = out.ench![k] ?? 0, nl = ll === rl ? Math.min(def.max, rl + 1) : Math.max(ll, rl);
        out.ench![k] = nl;
        cost += mult(k, book) * nl;
        added = true;
      }
      if (!added && !(same && left.damage > 0)) return none; // không có gì để gộp
      use = 1;
    } else return none;
  }
  const nm = name.trim().slice(0, ANVIL.NAME_MAX);
  if (nm && nm !== (left.name ?? "")) {
    cost += 1;
    out.name = nm;
  } else if (!right) return none;
  if (!Object.keys(out.ench!).length) delete out.ench;
  cost += penalty(left) + penalty(right);
  out.work = Math.max(left.work ?? 0, right?.work ?? 0) + 1;
  return { out, cost, use, tooExpensive: cost >= ANVIL.TOO_EXPENSIVE };
}

/** Đá mài: gỡ phù phép (sách phù phép → sách), gộp hai món cùng loại; xp: kinh nghiệm trả lại. */
export function grindResult(a: ItemStack | null, b: ItemStack | null, rng: Rng = Math.random): { out: ItemStack | null; xp: number } {
  if (!a && !b) return { out: null, xp: 0 };
  if (a && b && a.item !== b.item) return { out: null, xp: 0 };
  const src = (a ?? b)!, max = maxDurability(src.item);
  if (!a || !b) if (!src.ench && src.item !== "enchanted_book") return { out: null, xp: 0 };
  if (a && b && max === 0) return { out: null, xp: 0 };
  let xp = 0;
  for (const s of [a, b]) for (const [k, l] of Object.entries(s?.ench ?? {})) xp += ENCHANTMENTS.find((e) => e.key === k)?.min(l) ?? 0;
  const out: ItemStack = { item: src.item === "enchanted_book" ? "book" : src.item, count: 1, damage: src.damage };
  if (a && b) out.damage = Math.max(0, max - ((max - a.damage) + (max - b.damage) + Math.floor(max * 0.05)));
  if (src.name) out.name = src.name;
  return { out, xp: xp > 0 ? randInt(rng, Math.ceil(xp / 2), xp) : 0 };
}
