// Công thức chế tạo (DESIGN.md 2.4), giao diện dạng danh sách: đủ nguyên liệu thì làm được.
// "hand" làm mọi lúc; "workbench" cần đứng trong CRAFTING.WORKBENCH_RANGE block quanh bàn chế tạo.
import { CRAFTING } from "./constants.js";
import { B } from "./blocks.js";
import type { Inventory, ItemStack } from "./inventory.js";
import { ARMOR_PIECES, TOOL_KINDS } from "./items.js";

export interface Ingredient {
  item: string;
  count: number;
}

export interface Recipe {
  id: string;
  out: Ingredient;
  inputs: readonly Ingredient[];
  station: "hand" | "workbench";
}

const R: Recipe[] = [];
const rec = (out: string, n: number, inputs: [string, number][], station: Recipe["station"] = "workbench"): void =>
  void R.push({ id: `${out}#${R.length}`, out: { item: out, count: n }, inputs: inputs.map(([item, count]) => ({ item, count })), station });

// làm mọi lúc
rec("planks", 4, [["log", 1]], "hand");
rec("stick", 4, [["planks", 2]], "hand");
rec("workbench", 1, [["planks", 4]], "hand");
rec("torch", 4, [["coal", 1], ["stick", 1]], "hand");

// công cụ: X = ván gỗ / đá cuội / thỏi sắt / thỏi vàng / kim cương
const TOOL_MAT: [string, string][] = [["wood", "planks"], ["stone", "cobble"], ["iron", "iron_ingot"], ["gold", "gold_ingot"], ["diamond", "diamond"]];
const TOOL_COST: Record<(typeof TOOL_KINDS)[number], [number, number]> = {
  pickaxe: [3, 2], axe: [3, 2], shovel: [1, 2], sword: [2, 1], hoe: [2, 2],
};
for (const [tier, mat] of TOOL_MAT)
  for (const kind of TOOL_KINDS) rec(`${tier}_${kind}`, 1, [[mat, TOOL_COST[kind][0]], ["stick", TOOL_COST[kind][1]]]);

// giáp: mũ 5 · áo 8 · quần 7 · giày 4 (da / sắt / vàng / kim cương)
const ARMOR_MAT: [string, string][] = [["leather", "leather"], ["iron", "iron_ingot"], ["gold", "gold_ingot"], ["diamond", "diamond"]];
const ARMOR_COST = [5, 8, 7, 4];
for (const [tier, mat] of ARMOR_MAT) ARMOR_PIECES.forEach((p, i) => rec(`${tier}_${p}`, 1, [[mat, ARMOR_COST[i]!]]));

rec("bow", 1, [["stick", 3], ["string", 3]]);
rec("arrow", 4, [["stick", 1], ["flint", 1], ["feather", 1]]);
rec("chest", 1, [["planks", 8]]);
rec("furnace", 1, [["cobble", 8]]);
rec("ladder", 3, [["stick", 7]]);
rec("door", 3, [["planks", 6]]);
rec("fence", 3, [["stick", 4], ["planks", 2]]);
rec("rail", 16, [["iron_ingot", 6], ["stick", 1]]);
rec("bread", 1, [["wheat", 3]]);
rec("bed", 1, [["wool", 3], ["planks", 3]]);
rec("sandstone", 1, [["sand", 4]]);
rec("golden_apple", 1, [["apple", 1], ["gold_ingot", 8]]);

export const RECIPES: readonly Recipe[] = R;

/** Có bàn chế tạo trong phạm vi quanh (x, y, z) không. */
export function nearWorkbench(getId: (x: number, y: number, z: number) => number, x: number, y: number, z: number): boolean {
  const r = CRAFTING.WORKBENCH_RANGE;
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  for (let dy = -r; dy <= r; dy++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) if (getId(fx + dx, fy + dy, fz + dz) === B.WORKBENCH) return true;
  return false;
}

export function hasIngredients(inv: Inventory, r: Recipe): boolean {
  return r.inputs.every((i) => inv.count(i.item) >= i.count);
}

/** Chế tạo một lần: bớt nguyên liệu, thêm thành phẩm vào túi. Trả về phần thừa (vứt ra) hoặc null. */
export function craft(inv: Inventory, r: Recipe, workbench: boolean): { ok: boolean; overflow: ItemStack | null } {
  if (r.station === "workbench" && !workbench) return { ok: false, overflow: null };
  if (!hasIngredients(inv, r)) return { ok: false, overflow: null };
  for (const i of r.inputs) inv.remove(i.item, i.count);
  return { ok: true, overflow: inv.add({ item: r.out.item, count: r.out.count, damage: 0 }) };
}
