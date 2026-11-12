// Túi đồ (Giai đoạn 4a): 36 ô chính (0–8 là hotbar), 4 ô giáp, 1 chồng đang cầm trên con
// trỏ. Thuần túy để server (Giai đoạn 5) dùng lại. Tổng số vật phẩm không đổi qua mọi
// thao tác bấm (không nhân đôi, không mất).
import { INVENTORY } from "./survivalConstants.js";
import { ARMOR_PIECES, itemDef, maxDurability } from "./items.js";

export interface ItemStack {
  item: string;
  count: number;
  damage: number; // độ bền đã dùng
}

export type Slot = ItemStack | null;
export type SlotArea = "main" | "armor";

export const stack = (item: string, count = 1, damage = 0): ItemStack => ({ item, count, damage });
const maxOf = (item: string): number => itemDef(item)?.maxStack ?? INVENTORY.MAX_STACK;
/** Hai chồng gộp được (cùng loại, chưa dùng, không phải đồ đơn chiếc). */
export const canMerge = (a: ItemStack, b: ItemStack): boolean =>
  a.item === b.item && a.damage === 0 && b.damage === 0 && maxOf(a.item) > 1;

export class Inventory {
  readonly main: Slot[] = new Array<Slot>(INVENTORY.MAIN).fill(null);
  readonly armor: Slot[] = new Array<Slot>(INVENTORY.ARMOR).fill(null); // mũ, áo, quần, giày
  cursor: Slot = null;
  selected = 0; // ô hotbar đang cầm

  get held(): Slot {
    return this.main[this.selected]!;
  }

  private area(a: SlotArea): Slot[] {
    return a === "main" ? this.main : this.armor;
  }

  /** Thêm vào túi (gộp chồng trước, rồi ô trống; hotbar trước túi). Trả về phần thừa. */
  add(s: ItemStack): ItemStack | null {
    let left = s.count;
    const max = maxOf(s.item);
    for (let i = 0; i < this.main.length && left > 0; i++) {
      const t = this.main[i];
      if (t && canMerge(t, s) && t.count < max) {
        const n = Math.min(left, max - t.count);
        t.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.main.length && left > 0; i++) {
      if (this.main[i]) continue;
      const n = Math.min(left, max);
      this.main[i] = { item: s.item, count: n, damage: s.damage };
      left -= n;
    }
    return left > 0 ? { ...s, count: left } : null;
  }

  count(item: string): number {
    return this.main.reduce((n, t) => n + (t && t.item === item ? t.count : 0), 0);
  }

  /** Bớt n vật phẩm loại item (ưu tiên ô cuối). false nếu không đủ (không bớt gì). */
  remove(item: string, n: number): boolean {
    if (this.count(item) < n) return false;
    for (let i = this.main.length - 1; i >= 0 && n > 0; i--) {
      const t = this.main[i];
      if (!t || t.item !== item) continue;
      const k = Math.min(n, t.count);
      t.count -= k;
      n -= k;
      if (t.count === 0) this.main[i] = null;
    }
    return true;
  }

  /** Bớt n từ ô đang cầm (đặt block, ăn, vứt). Trả về phần lấy ra. */
  takeHeld(n = 1): ItemStack | null {
    const t = this.held;
    if (!t) return null;
    const k = Math.min(n, t.count);
    t.count -= k;
    if (t.count === 0) this.main[this.selected] = null;
    return { ...t, count: k };
  }

  /** Công cụ / giáp mất độ bền; vỡ khi hết. Trả về true nếu vừa vỡ. */
  damageSlot(area: SlotArea, i: number, amount: number): boolean {
    const slots = this.area(area);
    const t = slots[i];
    const max = t ? maxDurability(t.item) : 0;
    if (!t || max === 0) return false;
    t.damage += amount;
    if (t.damage < max) return false;
    slots[i] = null;
    return true;
  }

  /** Ô giáp nhận vật phẩm này không. */
  static fitsArmor(i: number, s: ItemStack): boolean {
    return itemDef(s.item)?.armor?.piece === ARMOR_PIECES[i];
  }

  /** Bấm chuột lên một ô (giao diện túi đồ). */
  click(area: SlotArea, i: number, button: "left" | "right", shift: boolean): void {
    const slots = this.area(area);
    if (shift) return this.quickMove(area, i);
    const s = slots[i] ?? null;
    const c = this.cursor;
    if (area === "armor" && c && !Inventory.fitsArmor(i, c)) return;
    if (button === "left") {
      if (c && s && canMerge(c, s)) {
        const n = Math.min(c.count, maxOf(s.item) - s.count);
        s.count += n;
        c.count -= n;
        if (c.count === 0) this.cursor = null;
      } else {
        slots[i] = c;
        this.cursor = s;
      }
      return;
    }
    // chuột phải: nhấc nửa / đặt 1
    if (!c) {
      if (!s) return;
      const half = Math.ceil(s.count / 2);
      this.cursor = { ...s, count: half };
      s.count -= half;
      if (s.count === 0) slots[i] = null;
    } else if (!s) {
      slots[i] = { ...c, count: 1 };
      c.count--;
      if (c.count === 0) this.cursor = null;
    } else if (canMerge(c, s) && s.count < maxOf(s.item)) {
      s.count++;
      c.count--;
      if (c.count === 0) this.cursor = null;
    } else {
      slots[i] = c;
      this.cursor = s;
    }
  }

  /** Shift+bấm: giáp ↔ ô giáp; hotbar ↔ túi. */
  private quickMove(area: SlotArea, i: number): void {
    const slots = this.area(area);
    const s = slots[i];
    if (!s) return;
    if (area === "main") {
      const piece = ARMOR_PIECES.indexOf(itemDef(s.item)?.armor?.piece ?? ("" as never));
      if (piece >= 0 && !this.armor[piece]) {
        this.armor[piece] = s;
        slots[i] = null;
        return;
      }
    }
    // chuyển sang vùng kia: túi (9–35) nếu đang ở hotbar/giáp, ngược lại hotbar (0–8)
    const toHotbar = area === "main" && i >= INVENTORY.HOTBAR;
    const [from, to] = toHotbar ? [0, INVENTORY.HOTBAR] : [INVENTORY.HOTBAR, INVENTORY.MAIN];
    let left = s.count;
    const max = maxOf(s.item);
    for (let k = from; k < to && left > 0; k++) {
      const t = this.main[k];
      if (t && t !== s && canMerge(t, s) && t.count < max) {
        const n = Math.min(left, max - t.count);
        t.count += n;
        left -= n;
      }
    }
    for (let k = from; k < to && left > 0; k++) {
      if (this.main[k]) continue;
      this.main[k] = { ...s, count: left };
      left = 0;
    }
    if (left === 0) slots[i] = null;
    else s.count = left;
  }

  /** Đóng giao diện: chồng trên con trỏ trả về túi; phần không vừa trả về để vứt ra. */
  returnCursor(): ItemStack | null {
    const c = this.cursor;
    this.cursor = null;
    return c ? this.add(c) : null;
  }

  /** Lấy hết đồ ra (khi chết). */
  takeAll(): ItemStack[] {
    const out: ItemStack[] = [];
    for (const slots of [this.main, this.armor])
      for (let i = 0; i < slots.length; i++) {
        if (slots[i]) out.push(slots[i]!);
        slots[i] = null;
      }
    if (this.cursor) out.push(this.cursor);
    this.cursor = null;
    return out;
  }

  /** Điểm giáp và độ cứng đang mặc. */
  armorStats(): { points: number; toughness: number } {
    let points = 0, toughness = 0;
    for (const s of this.armor) {
      const a = s ? itemDef(s.item)?.armor : undefined;
      if (a) {
        points += a.points;
        toughness += a.toughness;
      }
    }
    return { points, toughness };
  }
}
