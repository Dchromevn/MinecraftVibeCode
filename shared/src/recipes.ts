// Công thức chế tạo (DESIGN.md 2.4): lưới 2x2 (túi đồ) hoặc 3x3 (bàn chế tạo). Công thức có
// hình xếp (được lật ngang) hoặc không cần hình. Mỗi ô lưới dùng 1 nguyên liệu mỗi lần làm.
import { BLOCKS } from "./blocks.js";
import { SHAPE_MATERIALS, WALL_MATERIALS } from "./blockTable.js";
import { ARMOR_PIECES, TOOL_KINDS } from "./items.js";
import { LOG_ITEMS, PLANK_ITEMS, WOODS } from "./woods.js";
import { COLORS } from "./colors.js";

/** Nhóm nguyên liệu (Giai đoạn 4d): ô lưới nhận bất kỳ vật phẩm nào trong nhóm, có thể trộn loài. */
export const ITEM_TAGS: Readonly<Record<string, readonly string[]>> = {
  "#planks": PLANK_ITEMS, "#log": LOG_ITEMS,
  "#wool": COLORS.map((c) => `${c}_wool`), "#bed": COLORS.map((c) => `${c}_bed`), // Giai đoạn 4f
};

/** Vật phẩm have có dùng được cho nguyên liệu want (khóa vật phẩm hoặc nhóm "#...") không. */
export function ingredientMatches(want: string, have: string | null): boolean {
  if (!have) return false;
  return want === have || (ITEM_TAGS[want]?.includes(have) ?? false);
}

export interface Ingredient {
  item: string;
  count: number;
}

export interface Recipe {
  id: string;
  out: Ingredient;
  station: "hand" | "workbench"; // hand: cả lưới 2x2 và 3x3; workbench: chỉ 3x3
  shape: readonly string[] | null; // hàng, ký tự theo key; " " = ô trống; null = không cần hình
  key: Readonly<Record<string, string>>;
  shapeless: readonly string[]; // không cần hình: mỗi phần tử là 1 ô
  inputs: readonly Ingredient[]; // tổng nguyên liệu cho 1 lần (sổ công thức)
}

const R: Recipe[] = [];

function totals(items: string[]): Ingredient[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].map(([item, count]) => ({ item, count }));
}

function shaped(out: string, n: number, shape: string[], key: Record<string, string>, station: Recipe["station"] = "workbench"): void {
  const cells = shape.join("").split("").filter((c) => c !== " ").map((c) => key[c]!);
  R.push({ id: `${out}#${R.length}`, out: { item: out, count: n }, station, shape, key, shapeless: [], inputs: totals(cells) });
}

function shapeless(out: string, n: number, items: string[], station: Recipe["station"] = "hand"): void {
  R.push({ id: `${out}#${R.length}`, out: { item: out, count: n }, station, shape: null, key: {}, shapeless: items, inputs: totals(items) });
}

// làm mọi lúc (vừa lưới 2x2)
for (const w of WOODS) shapeless(BLOCKS[w.planks]!.key, 4, [BLOCKS[w.log]!.key]); // thân → 4 ván cùng loài
shaped("stick", 4, ["P", "P"], { P: "#planks" }, "hand");
shaped("workbench", 1, ["PP", "PP"], { P: "#planks" }, "hand");
shaped("torch", 4, ["C", "S"], { C: "coal", S: "stick" }, "hand");

// công cụ: X = ván gỗ / đá cuội / thỏi sắt / thỏi vàng / kim cương; | = que
const TOOL_MAT: [string, string][] = [["wood", "#planks"], ["stone", "cobble"], ["iron", "iron_ingot"], ["gold", "gold_ingot"], ["diamond", "diamond"]];
const TOOL_SHAPE: Record<(typeof TOOL_KINDS)[number], string[]> = {
  pickaxe: ["XXX", " | ", " | "], axe: ["XX", "X|", " |"], shovel: ["X", "|", "|"], sword: ["X", "X", "|"], hoe: ["XX", " |", " |"],
};
for (const [tier, mat] of TOOL_MAT)
  for (const kind of TOOL_KINDS) shaped(`${tier}_${kind}`, 1, TOOL_SHAPE[kind], { X: mat, "|": "stick" });

// giáp (da / sắt / vàng / kim cương)
const ARMOR_MAT: [string, string][] = [["leather", "leather"], ["iron", "iron_ingot"], ["gold", "gold_ingot"], ["diamond", "diamond"]];
const ARMOR_SHAPE = [["XXX", "X X"], ["X X", "XXX", "XXX"], ["XXX", "X X", "X X"], ["X X", "X X"]];
for (const [tier, mat] of ARMOR_MAT) ARMOR_PIECES.forEach((p, i) => shaped(`${tier}_${p}`, 1, ARMOR_SHAPE[i]!, { X: mat }));

shaped("bow", 1, [" |T", "| T", " |T"], { "|": "stick", T: "string" });
shaped("arrow", 4, ["F", "|", "E"], { F: "flint", "|": "stick", E: "feather" });
shaped("chest", 1, ["PPP", "P P", "PPP"], { P: "#planks" });
shaped("furnace", 1, ["CCC", "C C", "CCC"], { C: "cobble" });
shaped("ladder", 3, ["| |", "|||", "| |"], { "|": "stick" });
// cửa, hàng rào theo loài gỗ (Giai đoạn 4e): ván loài nào ra loài đó
for (const w of WOODS) {
  const planks = BLOCKS[w.planks]!.key, pre = w.kind === "oak" ? "" : `${w.kind}_`;
  shaped(`${pre}door`, 3, ["PP", "PP", "PP"], { P: planks });
  shaped(`${pre}fence`, 3, ["P|P", "P|P"], { P: planks, "|": "stick" });
}
// gạch đá; bậc (6 → 4), tấm (3 → 6), tường (6 → 6) theo vật liệu (DESIGN.md 2.13)
shaped("stone_bricks", 4, ["SS", "SS"], { S: "stone" }, "hand");
for (const [m, src] of SHAPE_MATERIALS) {
  const mat = BLOCKS[src]!.key;
  shaped(`${m}_stairs`, 4, ["X  ", "XX ", "XXX"], { X: mat });
  shaped(`${m}_slab`, 6, ["XXX"], { X: mat });
}
for (const m of WALL_MATERIALS) shaped(`${m}_wall`, 6, ["XXX", "XXX"], { X: BLOCKS[SHAPE_MATERIALS.find((x) => x[0] === m)![1]]!.key });
shaped("rail", 16, ["I I", "I|I", "I I"], { I: "iron_ingot", "|": "stick" });
shaped("bread", 1, ["WWW"], { W: "wheat" });
shaped("sandstone", 1, ["SS", "SS"], { S: "sand" });
shaped("golden_apple", 1, ["GGG", "GAG", "GGG"], { G: "gold_ingot", A: "apple" });
shaped("bowl", 4, ["P P", " P "], { P: "#planks" });
shaped("bucket", 1, ["I I", " I "], { I: "iron_ingot" });
shapeless("beetroot_soup", 1, ["beetroot", "beetroot", "beetroot", "beetroot", "beetroot", "beetroot", "bowl"]);
shapeless("melon_seeds", 1, ["melon_slice"]);
shapeless("pumpkin_seeds", 4, ["pumpkin"]);
// thuốc nhuộm từ hoa và củ cải đường (xanh lá: nung xương rồng)
shapeless("yellow_dye", 1, ["dandelion"]);
shapeless("red_dye", 1, ["poppy"]);
shapeless("red_dye", 1, ["beetroot"]);
shapeless("blue_dye", 1, ["cornflower"]);
shapeless("white_dye", 1, ["lily_of_the_valley"]);

// ---- Giai đoạn 4f: thuốc nhuộm còn lại (đen từ than, nâu = đỏ + xanh lá: game tự đặt), trộn màu ----
shapeless("black_dye", 1, ["coal"]);
for (const [out, n, ins] of [
  ["brown_dye", 2, ["red_dye", "green_dye"]], ["orange_dye", 2, ["red_dye", "yellow_dye"]], ["purple_dye", 2, ["red_dye", "blue_dye"]],
  ["cyan_dye", 2, ["blue_dye", "green_dye"]], ["light_blue_dye", 2, ["blue_dye", "white_dye"]], ["lime_dye", 2, ["green_dye", "white_dye"]],
  ["pink_dye", 2, ["red_dye", "white_dye"]], ["gray_dye", 2, ["black_dye", "white_dye"]], ["light_gray_dye", 2, ["gray_dye", "white_dye"]],
  ["magenta_dye", 2, ["purple_dye", "pink_dye"]],
] as const) shapeless(out, n, [...ins]);
// ---- len, thảm, kính màu, tấm kính, giường 16 màu ----
shaped("white_wool", 1, ["TT", "TT"], { T: "string" }, "hand");
shaped("glass_pane", 16, ["GGG", "GGG"], { G: "glass" });
for (const c of COLORS) {
  const dye = `${c}_dye`, wool = `${c}_wool`;
  shapeless(wool, 1, [dye, "#wool"]);
  shaped(`${c}_carpet`, 3, ["WW"], { W: wool }, "hand");
  shaped(`${c}_stained_glass`, 8, ["GGG", "GDG", "GGG"], { G: "glass", D: dye });
  shaped(`${c}_stained_glass_pane`, 16, ["GGG", "GGG"], { G: `${c}_stained_glass` });
  shaped(`${c}_stained_glass_pane`, 8, ["PPP", "PDP", "PPP"], { P: "glass_pane", D: dye });
  shaped(`${c}_bed`, 1, ["WWW", "PPP"], { W: wool, P: "#planks" });
  shapeless(`${c}_bed`, 1, ["#bed", dye]);
}
// ---- đồ sắt và đồ hay dùng ----
shaped("shears", 1, [" I", "I "], { I: "iron_ingot" }, "hand");
shapeless("flint_and_steel", 1, ["iron_ingot", "flint"]);
for (const [block, item] of [["coal_block", "coal"], ["iron_block", "iron_ingot"], ["gold_block", "gold_ingot"], ["diamond_block", "diamond"],
  ["emerald_block", "emerald"], ["raw_iron_block", "raw_iron"], ["raw_gold_block", "raw_gold"]] as const) {
  shaped(block, 1, ["XXX", "XXX", "XXX"], { X: item });
  shapeless(item, 9, [block]);
}
shapeless("iron_nugget", 9, ["iron_ingot"]);
shaped("iron_ingot", 1, ["NNN", "NNN", "NNN"], { N: "iron_nugget" });
shaped("lantern", 1, ["NNN", "NTN", "NNN"], { N: "iron_nugget", T: "torch" });
shaped("iron_bars", 16, ["III", "III"], { I: "iron_ingot" });
shaped("iron_door", 3, ["II", "II", "II"], { I: "iron_ingot" });
shapeless("stone_button", 1, ["stone"]);
shapeless("oak_button", 1, ["#planks"]);
shaped("lever", 1, ["S", "C"], { S: "stick", C: "cobble" }, "hand");

export const RECIPES: readonly Recipe[] = R;

/** Dùng được ở lưới cỡ size không (2x2: chỉ công thức tay và vừa khung 2x2). */
export function fitsGrid(r: Recipe, size: number): boolean {
  if (size >= 3) return true;
  if (r.station === "workbench") return false;
  if (!r.shape) return r.shapeless.length <= size * size;
  return r.shape.length <= size && r.shape.every((row) => row.length <= size);
}

/** Cắt lưới (size x size, khóa vật phẩm hoặc null) về khung chứa các ô có đồ. */
function trim(grid: readonly (string | null)[], size: number): (string | null)[][] | null {
  let r0 = size, r1 = -1, c0 = size, c1 = -1;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r * size + c]) {
        r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
      }
  if (r1 < 0) return null;
  const out: (string | null)[][] = [];
  for (let r = r0; r <= r1; r++) out.push(grid.slice(r * size + c0, r * size + c1 + 1) as (string | null)[]);
  return out;
}

function shapeEquals(m: (string | null)[][], r: Recipe, mirror: boolean): boolean {
  const s = r.shape!;
  if (m.length !== s.length || s.some((row) => row.length !== m[0]!.length)) return false;
  for (let y = 0; y < s.length; y++)
    for (let x = 0; x < s[y]!.length; x++) {
      const ch = s[y]![mirror ? s[y]!.length - 1 - x : x]!;
      if (ch === " " ? m[y]![x] !== null : !ingredientMatches(r.key[ch]!, m[y]![x]!)) return false;
    }
  return true;
}

/** Công thức không cần hình: mỗi ô có đồ khớp đúng một nguyên liệu (nguyên liệu có thể là nhóm "#..."). */
function shapelessMatch(want: readonly string[], items: readonly string[]): boolean {
  if (want.length !== items.length) return false;
  const used = items.map(() => false);
  const fit = (k: number): boolean => {
    if (k === want.length) return true;
    for (let i = 0; i < items.length; i++) {
      if (used[i] || !ingredientMatches(want[k]!, items[i]!)) continue;
      used[i] = true;
      if (fit(k + 1)) return true;
      used[i] = false;
    }
    return false;
  };
  return fit(0);
}

/** Công thức khớp với lưới (khóa vật phẩm từng ô), hoặc null. */
export function matchGrid(grid: readonly (string | null)[], size: number): Recipe | null {
  const m = trim(grid, size);
  if (!m) return null;
  const items = grid.filter((g): g is string => !!g).sort();
  for (const r of R) {
    if (!fitsGrid(r, size)) continue;
    if (r.shape) {
      if (shapeEquals(m, r, false) || shapeEquals(m, r, true)) return r;
    } else if (shapelessMatch(r.shapeless, items)) return r;
  }
  return null;
}

/** Vị trí (chỉ số ô trong lưới size) và vật phẩm để xếp một bộ nguyên liệu (góc trên trái). */
export function layout(r: Recipe, size: number): { i: number; item: string }[] {
  if (!r.shape) return r.shapeless.map((item, i) => ({ i, item }));
  const out: { i: number; item: string }[] = [];
  r.shape.forEach((row, y) => [...row].forEach((ch, x) => ch !== " " && out.push({ i: y * size + x, item: r.key[ch]! })));
  return out;
}
