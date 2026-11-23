// Phù phép (Giai đoạn 8b2; Minecraft Wiki "Enchanting mechanics", bản Java): bảng phù phép (trọng số, cấp tối đa, khoảng "sức mạnh"
// mỗi cấp, món áp được, nhóm loại trừ nhau), độ dễ phù phép theo vật liệu, 3 lựa chọn của bàn phù phép theo số giá sách, chọn phù
// phép theo sức mạnh đã biến đổi. Bỏ phù phép của chỉ câu / đinh ba / giày linh hồn / lén lút; phù phép kho báu (Vá, Đi trên băng,
// lời nguyền) không ra từ bàn.
import { itemDef } from "./items.js";
import type { ItemStack } from "./inventory.js";
import { hashInts, mulberry32, randInt, type Rng } from "./rng.js";

export type EnchSlot = "sword" | "axe" | "digger" | "helmet" | "chest" | "legs" | "boots" | "bow" | "crossbow" | "any";
export interface EnchDef {
  key: string;
  weight: number; // độ hiếm (10 thường, 5 ít, 2 hiếm, 1 rất hiếm)
  max: number;
  min(l: number): number; // sức mạnh tối thiểu để ra cấp l
  top(l: number): number;
  on: readonly EnchSlot[];
  group?: string; // cùng nhóm thì loại trừ nhau
  treasure?: boolean; // không ra từ bàn phù phép
}

const d = (key: string, weight: number, max: number, min: (l: number) => number, span: (l: number, m: number) => number, on: EnchSlot[], group?: string, treasure?: boolean): EnchDef =>
  ({ key, weight, max, min, top: (l) => span(l, min(l)), on, group, treasure });
const ARMOR: EnchSlot[] = ["helmet", "chest", "legs", "boots"];
const DIG: EnchSlot[] = ["digger", "axe"];

export const ENCHANTMENTS: readonly EnchDef[] = [
  d("protection", 10, 4, (l) => 1 + (l - 1) * 11, (_, m) => m + 11, ARMOR, "prot"),
  d("fire_protection", 5, 4, (l) => 10 + (l - 1) * 8, (_, m) => m + 8, ARMOR, "prot"),
  d("feather_falling", 5, 4, (l) => 5 + (l - 1) * 6, (_, m) => m + 6, ["boots"]),
  d("blast_protection", 2, 4, (l) => 5 + (l - 1) * 8, (_, m) => m + 8, ARMOR, "prot"),
  d("projectile_protection", 5, 4, (l) => 3 + (l - 1) * 6, (_, m) => m + 6, ARMOR, "prot"),
  d("respiration", 2, 3, (l) => 10 * l, (_, m) => m + 30, ["helmet"]),
  d("aqua_affinity", 2, 1, () => 1, () => 41, ["helmet"]),
  d("thorns", 1, 3, (l) => 10 + 20 * (l - 1), (_, m) => m + 50, ["chest"]),
  d("depth_strider", 2, 3, (l) => 10 * l, (_, m) => m + 15, ["boots"], "boots_water"),
  d("frost_walker", 2, 2, (l) => 10 * l, (_, m) => m + 15, ["boots"], "boots_water", true),
  d("soul_speed", 1, 3, (l) => 10 * l, (_, m) => m + 15, ["boots"], undefined, true), // (10d1) chỉ có từ đổi vàng với người lợn
  d("sharpness", 10, 5, (l) => 1 + (l - 1) * 11, (_, m) => m + 20, ["sword", "axe"], "damage"),
  d("smite", 5, 5, (l) => 5 + (l - 1) * 8, (_, m) => m + 20, ["sword", "axe"], "damage"),
  d("bane_of_arthropods", 5, 5, (l) => 5 + (l - 1) * 8, (_, m) => m + 20, ["sword", "axe"], "damage"),
  d("knockback", 5, 2, (l) => 5 + 20 * (l - 1), (_, m) => m + 50, ["sword"]),
  d("fire_aspect", 2, 2, (l) => 10 + 20 * (l - 1), (_, m) => m + 50, ["sword"]),
  d("looting", 2, 3, (l) => 15 + (l - 1) * 9, (_, m) => m + 50, ["sword"]),
  d("sweeping_edge", 2, 3, (l) => 5 + (l - 1) * 9, (_, m) => m + 15, ["sword"]),
  d("efficiency", 10, 5, (l) => 1 + 10 * (l - 1), (_, m) => m + 50, DIG),
  d("silk_touch", 1, 1, () => 15, () => 65, DIG, "drops"),
  d("unbreaking", 5, 3, (l) => 5 + (l - 1) * 8, (_, m) => m + 50, ["sword", "axe", "digger", ...ARMOR, "bow", "crossbow"]),
  d("fortune", 2, 3, (l) => 15 + (l - 1) * 9, (_, m) => m + 50, DIG, "drops"),
  d("power", 10, 5, (l) => 1 + (l - 1) * 10, (_, m) => m + 15, ["bow"]),
  d("punch", 2, 2, (l) => 12 + (l - 1) * 20, (_, m) => m + 25, ["bow"]),
  d("flame", 2, 1, () => 20, () => 50, ["bow"]),
  d("infinity", 1, 1, () => 20, () => 50, ["bow"], "infinity"),
  d("multishot", 2, 1, () => 20, () => 50, ["crossbow"], "xbow"),
  d("quick_charge", 5, 3, (l) => 12 + (l - 1) * 20, () => 50, ["crossbow"]),
  d("piercing", 10, 4, (l) => 1 + (l - 1) * 10, () => 50, ["crossbow"], "xbow"),
  d("mending", 2, 1, (l) => l * 25, (_, m) => m + 50, ["sword", "axe", "digger", ...ARMOR, "bow", "crossbow"], "infinity", true),
];
const BY_KEY = new Map(ENCHANTMENTS.map((e) => [e.key, e]));
export const enchDef = (key: string): EnchDef | undefined => BY_KEY.get(key);

/** Loại chỗ phù phép của món (null = không phù phép được). Sách: mọi loại. */
export function enchSlot(item: string): EnchSlot | null {
  if (item === "book") return "any";
  if (item === "bow") return "bow";
  if (item === "crossbow") return "crossbow";
  const def = itemDef(item);
  if (def?.tool) return def.tool.kind === "sword" ? "sword" : def.tool.kind === "axe" ? "axe" : def.tool.kind === "shears" ? null : "digger";
  if (def?.armor) return ({ helmet: "helmet", chestplate: "chest", leggings: "legs", boots: "boots" } as const)[def.armor.piece];
  return null;
}

/** Độ dễ phù phép (vật liệu càng "thần kỳ" càng cao). */
export function enchantability(item: string): number {
  const def = itemDef(item);
  if (item === "book" || item === "bow" || item === "crossbow") return 1;
  if (def?.tool) return ({ wood: 15, stone: 5, iron: 14, gold: 22, diamond: 10, netherite: 15 } as Record<string, number>)[def.tool.tier] ?? 1;
  if (def?.armor) return ({ leather: 15, iron: 9, gold: 25, diamond: 10, chain: 12, netherite: 15 } as Record<string, number>)[def.armor.tier] ?? 1;
  return 0;
}

/** Cấp phù phép key trên món (0 = không có). */
export const enchLevel = (s: ItemStack | null | undefined, key: string): number => s?.ench?.[key] ?? 0;
export const isEnchanted = (s: ItemStack | null | undefined): boolean => !!s?.ench && Object.keys(s.ench).length > 0;

/** Phù phép đi được với món (đúng loại chỗ, không xung đột với phù phép đã có). */
export function compatible(e: EnchDef, slot: EnchSlot, have: Readonly<Record<string, number>>): boolean {
  if (slot !== "any" && !e.on.includes(slot)) return false;
  return !Object.keys(have).some((k) => k === e.key || (e.group && enchDef(k)?.group === e.group));
}

/** Mức (1–30) của 3 lựa chọn với số giá sách quanh bàn (0–15). */
export function offerLevels(rng: Rng, shelves: number): [number, number, number] {
  const b = Math.min(15, shelves), base = randInt(rng, 1, 8) + (b >> 1) + randInt(rng, 0, b);
  return [Math.max(Math.floor(base / 3), 1), Math.floor((base * 2) / 3) + 1, Math.max(base, b * 2)];
}

/** Chọn phù phép cho món ở mức `level` (đã gồm biến đổi ngẫu nhiên theo độ dễ phù phép). */
export function pickEnchantments(rng: Rng, item: string, level: number): Record<string, number> {
  const slot = enchSlot(item), ench = enchantability(item), out: Record<string, number> = {};
  if (!slot || ench <= 0) return out;
  let m = level + 1 + randInt(rng, 0, Math.floor(ench / 4)) + randInt(rng, 0, Math.floor(ench / 4));
  m = Math.max(1, Math.round(m * (1 + (rng() + rng() - 1) * 0.15)));
  const pool = (): [EnchDef, number][] => {
    const list: [EnchDef, number][] = [];
    for (const e of ENCHANTMENTS) {
      if (e.treasure || !compatible(e, slot, out)) continue;
      for (let l = e.max; l >= 1; l--) if (m >= e.min(l) && m <= e.top(l)) { list.push([e, l]); break; }
    }
    return list;
  };
  const draw = (list: [EnchDef, number][]): [EnchDef, number] | null => {
    let r = rng() * list.reduce((s, [e]) => s + e.weight, 0);
    for (const x of list) if ((r -= x[0].weight) < 0) return x;
    return list[0] ?? null;
  };
  for (let first = true; ; first = false) {
    if (!first && rng() >= (m + 1) / 50) break;
    const got = draw(pool());
    if (!got) break;
    out[got[0].key] = got[1];
    m = Math.floor(m / 2);
  }
  return out;
}

/** Ba lựa chọn của bàn phù phép cho món: [mức cần, phù phép gợi ý (key, cấp)] — gợi ý là một phù phép sẽ có. */
export function enchantOffers(seed: number, item: string, shelves: number): { level: number; ench: Record<string, number> }[] {
  if (!enchSlot(item) || enchantability(item) <= 0) return [];
  const levels = offerLevels(mulberry(seed, 0), shelves);
  return levels.map((lv, i) => ({ level: lv, ench: pickEnchantments(mulberry(seed, i + 1), item, lv) }));
}

const mulberry = (seed: number, k: number): Rng => mulberry32(hashInts(seed, k, 4421));

/** La Mã cho cấp (I..V). */
export const roman = (n: number): string => ["", "I", "II", "III", "IV", "V"][n] ?? String(n);

const UNDEAD = new Set(["zombie", "skeleton", "husk", "stray", "drowned", "zombie_villager", "phantom"]);
const ARTHROPOD = new Set(["spider", "cave_spider", "silverfish", "endermite"]);

/** Sát thương cộng thêm của vũ khí (Sắc bén 0.5 × cấp + 0.5; Phán xét / Khắc tinh chân đốt 2.5 × cấp với đúng loài). */
export function meleeBonus(ench: Readonly<Record<string, number>> | undefined, target: string | null): number {
  if (!ench) return 0;
  const sh = ench.sharpness ?? 0, sm = ench.smite ?? 0, ba = ench.bane_of_arthropods ?? 0;
  return (sh > 0 ? 0.5 * sh + 0.5 : 0) + (target && UNDEAD.has(target) ? 2.5 * sm : 0) + (target && ARTHROPOD.has(target) ? 2.5 * ba : 0);
}

/** Phù phép của bộ giáp đang mặc → các trường trạng thái (EPF bảo vệ, Gai, Hô hấp, Sải chân dưới nước). */
export function armorEnchState(armor: readonly (ItemStack | null)[]): Record<"encPrt" | "encFire" | "encBlast" | "encProj" | "encFall" | "encThorns" | "encResp" | "encDepth" | "encSoul", number> {
  const sum = (k: string): number => armor.reduce((n, s) => n + (s?.ench?.[k] ?? 0), 0);
  return {
    encPrt: sum("protection"), encFire: sum("fire_protection"), encBlast: sum("blast_protection"), encProj: sum("projectile_protection"),
    encFall: sum("feather_falling"), encThorns: sum("thorns"), encResp: sum("respiration"), encDepth: Math.min(3, sum("depth_strider")),
    encSoul: Math.min(3, sum("soul_speed")), // (10d1)
  };
}

/** (8b2) Thời gian lên dây nỏ (Nạp nhanh: −0.25 giây mỗi cấp). */
export const crossbowCharge = (s: ItemStack | null | undefined): number => Math.max(0.25, 1.25 - 0.25 * enchLevel(s, "quick_charge"));

/** (8b3) Sách phù phép ngẫu nhiên (rương công trình, thủ thư): một phù phép bất kỳ (kể cả Vá), cấp ngẫu nhiên. Bỏ Đi trên băng (chưa làm). */
export function randomBookEnch(rng: Rng): Record<string, number> {
  const list = ENCHANTMENTS.filter((e) => e.key !== "frost_walker" && e.key !== "soul_speed"), e = list[Math.floor(rng() * list.length)]!;
  return { [e.key]: 1 + Math.floor(rng() * e.max) };
}
