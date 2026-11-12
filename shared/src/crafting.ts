// Chế tạo bằng lưới (DESIGN.md 2.4): ô kết quả theo công thức khớp lưới; lấy thành phẩm (mỗi ô
// lưới mất 1); Shift làm liên tục vào túi; sổ công thức tự xếp nguyên liệu từ túi vào lưới.
import { INVENTORY } from "./survivalConstants.js";
import { canMerge, type Inventory, type ItemStack } from "./inventory.js";
import { itemDef } from "./items.js";
import { fitsGrid, layout, matchGrid, type Recipe } from "./recipes.js";

const maxOf = (item: string): number => itemDef(item)?.maxStack ?? INVENTORY.MAX_STACK;

/** Công thức khớp với lưới chế tạo đang mở. */
export function gridResult(inv: Inventory): Recipe | null {
  return matchGrid(inv.craft.map((s) => s?.item ?? null), inv.craftSize);
}

function consumeGrid(inv: Inventory): void {
  for (let i = 0; i < inv.craft.length; i++) {
    const s = inv.craft[i];
    if (!s) continue;
    s.count--;
    if (s.count === 0) inv.craft[i] = null;
  }
}

/**
 * Bấm ô kết quả. Thường: thành phẩm lên con trỏ (gộp nếu cùng loại và còn chỗ).
 * Shift: làm liên tục vào túi tới khi hết nguyên liệu / hết chỗ. Trả về phần thừa (vứt ra).
 */
export function takeResult(inv: Inventory, shift: boolean): ItemStack[] {
  const over: ItemStack[] = [];
  let r = gridResult(inv);
  if (!r) return over;
  if (!shift) {
    const out: ItemStack = { item: r.out.item, count: r.out.count, damage: 0 };
    const c = inv.cursor;
    if (!c) inv.cursor = out;
    else if (canMerge(c, out) && c.count + out.count <= maxOf(c.item)) c.count += out.count;
    else return over;
    consumeGrid(inv);
    return over;
  }
  const first = r;
  for (let n = 0; n < INVENTORY.MAX_STACK && r === first; n++) {
    consumeGrid(inv);
    const left = inv.add({ item: r.out.item, count: r.out.count, damage: 0 });
    if (left) {
      over.push(left);
      break;
    }
    r = gridResult(inv);
  }
  return over;
}

/** Tổng số vật phẩm trong túi + lưới. */
function available(inv: Inventory, item: string): number {
  return inv.count(item) + inv.craft.reduce((n, s) => n + (s && s.item === item ? s.count : 0), 0);
}

/** Sổ công thức: đủ nguyên liệu (túi + lưới) và vừa lưới đang mở. */
export function canFill(inv: Inventory, r: Recipe): boolean {
  return fitsGrid(r, inv.craftSize) && r.inputs.every((i) => available(inv, i.item) >= i.count);
}

/**
 * Sổ công thức: trả lưới về túi rồi xếp nguyên liệu đúng hình. many = xếp nhiều bộ nhất có thể
 * (mỗi ô tối đa một chồng). Trả về false nếu không xếp được (không đổi gì).
 */
export function fillFromBook(inv: Inventory, r: Recipe, many: boolean): boolean {
  if (!canFill(inv, r)) return false;
  const over = inv.returnCraft();
  if (over.length) {
    // túi đầy: đặt lại vào lưới như cũ
    over.forEach((s, i) => (inv.craft[i] = s));
    return false;
  }
  const cells = layout(r, inv.craftSize);
  let sets = 1;
  if (many) {
    sets = Math.min(...r.inputs.map((i) => Math.floor(inv.count(i.item) / i.count)), ...cells.map((c) => maxOf(c.item)));
    sets = Math.max(1, sets);
  }
  for (const c of cells) {
    inv.remove(c.item, sets);
    inv.craft[c.i] = { item: c.item, count: sets, damage: 0 };
  }
  return true;
}
