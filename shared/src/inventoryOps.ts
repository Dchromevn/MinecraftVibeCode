// Thao tác chuột nâng cao trên túi đồ như thể loại gốc (DESIGN.md 2.4): kéo chuột trái chia
// đều, kéo chuột phải đặt 1 mỗi ô, bấm đúp gom cùng loại, phím số đổi chỗ với hotbar, Q vứt.
import { INVENTORY } from "./survivalConstants.js";
import { canMerge, Inventory, type ItemStack, type SlotArea } from "./inventory.js";
import { itemDef } from "./items.js";

export interface SlotRef {
  area: SlotArea;
  i: number;
}

const maxOf = (item: string): number => itemDef(item)?.maxStack ?? INVENTORY.MAX_STACK;

/** Ô có nhận thêm chồng c không (trống hoặc cùng loại còn chỗ; ô giáp đúng món). */
function accepts(inv: Inventory, r: SlotRef, c: ItemStack): boolean {
  if (!inv.accepts(r.area, r.i, c)) return false;
  const s = inv.slots(r.area)[r.i];
  return !s || (canMerge(s, c) && s.count < maxOf(s.item));
}

/** Kéo chồng đang cầm qua nhiều ô: trái = chia đều, phải = 1 cái mỗi ô. */
export function dragSpread(inv: Inventory, targets: readonly SlotRef[], button: "left" | "right"): void {
  const c = inv.cursor;
  if (!c) return;
  const seen = new Set<string>();
  const ok = targets.filter((r) => {
    const k = `${r.area}:${r.i}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return accepts(inv, r, c);
  });
  if (ok.length === 0) return;
  const per = button === "right" ? 1 : Math.floor(c.count / ok.length);
  if (per === 0) return;
  for (const r of ok) {
    if (c.count === 0) break;
    const slots = inv.slots(r.area);
    const s = slots[r.i];
    const room = s ? maxOf(s.item) - s.count : maxOf(c.item);
    const n = Math.min(per, room, c.count);
    if (s) s.count += n;
    else slots[r.i] = { ...c, count: n };
    c.count -= n;
  }
  if (c.count === 0) inv.cursor = null;
}

/** Bấm đúp: gom các chồng cùng loại (lưới chế tạo, túi, hotbar) lên con trỏ tới khi đầy. */
export function collectToCursor(inv: Inventory): void {
  const c = inv.cursor;
  if (!c || maxOf(c.item) <= 1) return;
  for (const area of ["craft", "ext", "main"] as SlotArea[]) {
    const slots = inv.slots(area);
    for (let i = 0; i < slots.length && c.count < maxOf(c.item); i++) {
      const s = slots[i];
      if (!s || !canMerge(s, c)) continue;
      const n = Math.min(s.count, maxOf(c.item) - c.count);
      c.count += n;
      s.count -= n;
      if (s.count === 0) slots[i] = null;
    }
  }
}

/** Trỏ vào ô rồi bấm phím số: đổi chỗ với ô hotbar `hot` (ô giáp chỉ nhận đúng món). */
export function swapWithHotbar(inv: Inventory, r: SlotRef, hot: number): void {
  if (r.area === "main" && r.i === hot) return;
  const slots = inv.slots(r.area);
  const a = slots[r.i] ?? null, b = inv.main[hot] ?? null;
  if (b && !inv.accepts(r.area, r.i, b)) return;
  slots[r.i] = b;
  inv.main[hot] = a;
}

/** Trỏ vào ô bấm Q: lấy 1 (hoặc cả chồng) ra để vứt. */
export function takeFromSlot(inv: Inventory, r: SlotRef, all: boolean): ItemStack | null {
  const slots = inv.slots(r.area);
  const s = slots[r.i];
  if (!s) return null;
  const n = all ? s.count : 1;
  s.count -= n;
  if (s.count === 0) slots[r.i] = null;
  return { ...s, count: n };
}

/** Bấm ra ngoài khung khi đang cầm: trái = vứt cả chồng, phải = vứt 1. */
export function dropCursor(inv: Inventory, button: "left" | "right"): ItemStack | null {
  const c = inv.cursor;
  if (!c) return null;
  const n = button === "left" ? c.count : 1;
  c.count -= n;
  if (c.count === 0) inv.cursor = null;
  return { ...c, count: n };
}
