// Túi đồ (Giai đoạn 4a): 36 ô chính (0–8 là hotbar), 4 ô giáp, 1 chồng đang cầm trên con
// trỏ. Thuần túy để server (Giai đoạn 5) dùng lại. Tổng số vật phẩm không đổi qua mọi
// thao tác bấm (không nhân đôi, không mất).
import { INVENTORY } from "./survivalConstants.js";
import { ARMOR_PIECES, SHIELD_KEY, itemDef, maxDurability } from "./items.js";

/** (8b2) Không phá vỡ cấp L: mỗi điểm mòn chỉ tính với xác suất 1/(L+1) (giáp: 60% + 40%/(L+1)). */
const unbreakingWear = (amount: number, l: number, armor: boolean): number =>
  l <= 0 ? amount : Array.from({ length: amount }).filter(() => Math.random() < (armor ? 0.6 + 0.4 / (l + 1) : 1 / (l + 1))).length;

export interface ItemStack {
  item: string;
  count: number;
  damage: number; // độ bền đã dùng
  ench?: Record<string, number>; // (8b2) phù phép: khóa → cấp
  name?: string; work?: number; // (8b3) tên đặt ở đe, số lần đã qua đe
  lode?: [number, number, number, number]; // (10d2) la bàn đá nam châm: x, y, z, cõi của đá nam châm
}

export type Slot = ItemStack | null;
export type SlotArea = "main" | "armor" | "craft" | "ext" | "offhand";

/** Luật của ô chứa ngoài (rương, lò nung) đang mở. */
export interface ExtRules {
  /** Ô i nhận chồng s không (lò: ô nhiên liệu chỉ nhận đồ đốt được, ô thành phẩm không nhận). */
  accepts(i: number, s: ItemStack): boolean;
  /** Shift+bấm từ túi: các ô đích theo thứ tự ưu tiên (rỗng = không chuyển vào). */
  quickTargets(s: ItemStack): number[];
}

export const stack = (item: string, count = 1, damage = 0): ItemStack => ({ item, count, damage });
const maxOf = (item: string): number => itemDef(item)?.maxStack ?? INVENTORY.MAX_STACK;
/** Hai chồng gộp được (cùng loại, chưa dùng, không phải đồ đơn chiếc). */
export const canMerge = (a: ItemStack, b: ItemStack): boolean =>
  a.item === b.item && a.damage === 0 && b.damage === 0 && maxOf(a.item) > 1 && a.name === b.name && !a.ench && !b.ench;

export class Inventory {
  readonly main: Slot[] = new Array<Slot>(INVENTORY.MAIN).fill(null);
  readonly armor: Slot[] = new Array<Slot>(INVENTORY.ARMOR).fill(null); // mũ, áo, quần, giày
  readonly offhand: Slot[] = [null]; // tay trái (6a: khiên)
  cursor: Slot = null;
  selected = 0; // ô hotbar đang cầm
  /** Lưới chế tạo đang mở (2x2 túi đồ hoặc 3x3 bàn chế tạo), theo hàng. */
  craft: Slot[] = new Array<Slot>(4).fill(null);
  craftSize = 2;
  /** Ô của rương / lò đang mở (tham chiếu thẳng tới dữ liệu block), và luật của nó. */
  ext: Slot[] = [];
  extRules: ExtRules | null = null;

  get held(): Slot {
    return this.main[this.selected]!;
  }

  /** Mảng ô của một vùng. */
  slots(a: SlotArea): Slot[] {
    return a === "main" ? this.main : a === "armor" ? this.armor : a === "craft" ? this.craft : a === "offhand" ? this.offhand : this.ext;
  }

  /** F: đổi đồ tay phải (ô hotbar đang chọn) với tay trái. */
  swapHands(): void {
    [this.main[this.selected], this.offhand[0]] = [this.offhand[0]!, this.main[this.selected]!];
  }

  /** Đổi cỡ lưới chế tạo; đồ trong lưới cũ trả về túi. Trả về phần không vừa (vứt ra). */
  setCraftSize(n: number): ItemStack[] {
    const over = this.returnCraft();
    this.craftSize = n;
    this.craft = new Array<Slot>(n * n).fill(null);
    return over;
  }

  /** Trả đồ trong lưới chế tạo về túi; trả về phần không vừa. */
  returnCraft(): ItemStack[] {
    const over: ItemStack[] = [];
    for (let i = 0; i < this.craft.length; i++) {
      const s = this.craft[i];
      this.craft[i] = null;
      const left = s ? this.add(s) : null;
      if (left) over.push(left);
    }
    return over;
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
      this.main[i] = { ...s, count: n };
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
    const slots = this.slots(area);
    const t = slots[i];
    const max = t ? maxDurability(t.item) : 0;
    if (!t || max === 0) return false;
    t.damage += unbreakingWear(amount, t.ench?.unbreaking ?? 0, area === "armor"); // (8b2) Không phá vỡ
    if (t.damage < max) return false;
    slots[i] = null;
    return true;
  }

  /** Ô giáp nhận vật phẩm này không. */
  static fitsArmor(i: number, s: ItemStack): boolean {
    return itemDef(s.item)?.armor?.piece === ARMOR_PIECES[i];
  }

  /** Ô (area, i) có nhận chồng s đặt vào không. */
  accepts(area: SlotArea, i: number, s: ItemStack): boolean {
    if (area === "armor") return Inventory.fitsArmor(i, s);
    if (area === "ext" && this.extRules) return this.extRules.accepts(i, s);
    return true;
  }

  /** Bấm chuột lên một ô (giao diện túi đồ). */
  click(area: SlotArea, i: number, button: "left" | "right", shift: boolean): void {
    const slots = this.slots(area);
    if (shift) return this.quickMove(area, i);
    const s = slots[i] ?? null;
    const c = this.cursor;
    if (c && !this.accepts(area, i, c)) {
      // ô chỉ lấy ra (thành phẩm lò): cùng loại thì gom lên con trỏ
      if (s && canMerge(c, s) && c.count + s.count <= maxOf(c.item)) {
        c.count += s.count;
        slots[i] = null;
      }
      return;
    }
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
    const slots = this.slots(area);
    const s = slots[i];
    if (!s) return;
    if (area === "craft" || area === "ext") {
      slots[i] = this.add(s); // về túi; không vừa thì giữ lại
      return;
    }
    if (area === "main" && this.extRules) {
      // đang mở rương / lò: chuyển vào ô chứa
      let left = s.count;
      const targets = this.extRules.quickTargets(s);
      for (const pass of [0, 1])
        for (const k of targets) {
          if (left === 0) break;
          const t = this.ext[k];
          if (pass === 0 && t && canMerge(t, s) && t.count < maxOf(t.item)) {
            const n = Math.min(left, maxOf(t.item) - t.count);
            t.count += n;
            left -= n;
          } else if (pass === 1 && !t) {
            this.ext[k] = { ...s, count: Math.min(left, maxOf(s.item)) };
            left -= this.ext[k]!.count;
          }
        }
      if (targets.length) {
        if (left === 0) slots[i] = null;
        else s.count = left;
        return;
      }
    }
    if (area === "main") {
      const piece = ARMOR_PIECES.indexOf(itemDef(s.item)?.armor?.piece ?? ("" as never));
      const to = piece >= 0 && !this.armor[piece] ? this.armor : s.item === SHIELD_KEY && !this.offhand[0] ? this.offhand : null;
      if (to) {
        to[to === this.armor ? piece : 0] = s; // giáp → ô giáp, khiên → tay trái
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
    for (const slots of [this.main, this.armor, this.craft, this.offhand])
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
