// Bảng vật phẩm (DESIGN.md 2.3–2.4). Vật phẩm nhận diện bằng khóa chuỗi; block đặt được
// dùng chung khóa với block (stone, torch...). Icon: "cube" = vẽ khối 3D từ texture block,
// "tex" = texture block phẳng (/textures), "icon" = file trong /icons.
import { B, BLOCKS, type BlockId, type ToolKind } from "./blocks.js";
import { ARMOR, BOW_DURABILITY, STACK, TOOL_TIERS, type ArmorTier, type ToolTier } from "./constants.js";
import { ARMOR_FORMULA, FOODS, type FoodDef } from "./survivalConstants.js";

export type ArmorPiece = "helmet" | "chestplate" | "leggings" | "boots";
export const ARMOR_PIECES: readonly ArmorPiece[] = ["helmet", "chestplate", "leggings", "boots"];
export type ItemIcon = { type: "cube"; block: BlockId } | { type: "tex"; name: string } | { type: "icon"; name: string };

export interface ItemDef {
  key: string;
  maxStack: number;
  icon: ItemIcon;
  places?: BlockId; // chuột phải đặt ra block này
  tool?: { kind: ToolKind; tier: ToolTier; durability: number };
  armor?: { piece: ArmorPiece; tier: ArmorTier; points: number; toughness: number; durability: number };
  food?: FoodDef;
  durability?: number; // vật phẩm có độ bền khác (cung)
}

const ITEMS = new Map<string, ItemDef>();
const add = (d: ItemDef): void => void ITEMS.set(d.key, d);

// --- block đặt được (khối đầy vẽ 3D, còn lại vẽ phẳng) ---
const CUBES: BlockId[] = [
  B.DIRT, B.STONE, B.COBBLE, B.SAND, B.GRAVEL, B.LOG, B.PLANKS, B.WORKBENCH, B.CHEST, B.MOSSY_COBBLE,
  B.SANDSTONE, B.FURNACE, B.GLASS, B.DEEPSLATE, B.LEAVES,
];
for (const id of CUBES) add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "cube", block: id }, places: id });
for (const id of [B.TORCH, B.RAIL, B.LADDER, B.SAPLING, B.FENCE] as BlockId[])
  add({ key: BLOCKS[id]!.key, maxStack: STACK.DEFAULT, icon: { type: "tex", name: BLOCKS[id]!.tex.side }, places: id });
add({ key: "door", maxStack: STACK.SINGLE, icon: { type: "icon", name: "door" }, places: B.DOOR });
add({ key: "bed", maxStack: STACK.SINGLE, icon: { type: "icon", name: "bed" }, places: B.BED });
add({ key: "seeds", maxStack: STACK.DEFAULT, icon: { type: "icon", name: "seeds" }, places: B.WHEAT });

// --- nguyên liệu ---
for (const k of [
  "stick", "coal", "raw_iron", "iron_ingot", "raw_gold", "gold_ingot", "diamond", "emerald", "flint", "string",
  "feather", "leather", "wool", "wheat", "arrow",
]) add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k } });
add({ key: "bow", maxStack: STACK.SINGLE, icon: { type: "icon", name: "bow" }, durability: BOW_DURABILITY });

// --- thức ăn ---
for (const [k, f] of Object.entries(FOODS)) add({ key: k, maxStack: STACK.DEFAULT, icon: { type: "icon", name: k }, food: f });

// --- công cụ: 5 loại x 5 cấp ---
export const TOOL_KINDS = ["pickaxe", "axe", "shovel", "sword", "hoe"] as const;
export const TOOL_TIER_LIST = Object.keys(TOOL_TIERS) as ToolTier[];
for (const tier of TOOL_TIER_LIST)
  for (const kind of TOOL_KINDS)
    add({
      key: `${tier}_${kind}`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${tier}_${kind}` },
      tool: { kind, tier, durability: TOOL_TIERS[tier].durability },
    });

// --- giáp: 4 cấp x 4 món ---
export const ARMOR_TIER_LIST = Object.keys(ARMOR) as ArmorTier[];
for (const tier of ARMOR_TIER_LIST)
  for (const piece of ARMOR_PIECES)
    add({
      key: `${tier}_${piece}`, maxStack: STACK.SINGLE, icon: { type: "icon", name: `${tier}_${piece}` },
      armor: {
        piece, tier, points: ARMOR[tier][piece], toughness: ARMOR_FORMULA.TOUGHNESS[tier] ?? 0,
        durability: ARMOR[tier].durability,
      },
    });

export function itemDef(key: string): ItemDef | undefined {
  return ITEMS.get(key);
}

export function allItems(): ItemDef[] {
  return [...ITEMS.values()];
}

/** Độ bền tối đa (công cụ, giáp, cung); 0 = không có độ bền. */
export function maxDurability(key: string): number {
  const d = ITEMS.get(key);
  return d?.tool?.durability ?? d?.armor?.durability ?? d?.durability ?? 0;
}
