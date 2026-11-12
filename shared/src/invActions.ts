// Thao tác túi đồ dạng lệnh (Giai đoạn 5a): client áp dụng ngay (đoán trước) rồi gửi lên server;
// server áp dụng đúng hàm này lên túi đồ của nó và gửi lại trạng thái chuẩn. Mọi thao tác đều
// xác định (cùng đầu vào → cùng kết quả) nên hai bên khớp nhau.
import { collectToCursor, dragSpread, dropCursor, swapWithHotbar, takeFromSlot, type SlotRef } from "./inventoryOps.js";
import { fillFromBook, takeResult } from "./crafting.js";
import { RECIPES } from "./recipes.js";
import { INVENTORY } from "./survivalConstants.js";
import type { Inventory, ItemStack, Slot, SlotArea } from "./inventory.js";

export type MouseButton = "left" | "right";

export type InvAction =
  | { t: "click"; area: SlotArea; i: number; button: MouseButton; shift: boolean }
  | { t: "collect" } // bấm đúp: gom cùng loại lên con trỏ
  | { t: "spread"; refs: SlotRef[]; button: MouseButton } // kéo chia đều / đặt 1 mỗi ô
  | { t: "hotbar"; area: SlotArea; i: number; n: number } // trỏ + phím số
  | { t: "dropSlot"; area: SlotArea; i: number; all: boolean } // trỏ + Q
  | { t: "dropCursor"; button: MouseButton } // bấm ra ngoài khung
  | { t: "result"; shift: boolean } // lấy thành phẩm chế tạo
  | { t: "book"; recipe: string; all: boolean } // sổ công thức xếp nguyên liệu
  | { t: "craftSize"; n: number } // mở túi đồ (2) / bàn chế tạo (3)
  | { t: "close" } // đóng giao diện: trả con trỏ + lưới chế tạo về túi
  | { t: "select"; n: number } // chọn ô hotbar
  | { t: "throwHeld"; all: boolean }; // Q khi đang chơi

const AREAS: readonly SlotArea[] = ["main", "armor", "craft", "ext"];
const okRef = (inv: Inventory, area: unknown, i: unknown): boolean =>
  AREAS.includes(area as SlotArea) && Number.isInteger(i) && (i as number) >= 0 && (i as number) < inv.slots(area as SlotArea).length;

/** Áp dụng lệnh; trả về các chồng bị vứt ra ngoài (server tạo vật phẩm rơi). Lệnh sai dạng thì bỏ qua. */
export function applyInvAction(inv: Inventory, a: InvAction): ItemStack[] {
  const out: ItemStack[] = [];
  const push = (s: ItemStack | null): void => void (s && out.push(s));
  const btn = (b: unknown): MouseButton => (b === "right" ? "right" : "left");
  switch (a.t) {
    case "click":
      if (okRef(inv, a.area, a.i)) inv.click(a.area, a.i, btn(a.button), !!a.shift);
      break;
    case "collect":
      collectToCursor(inv);
      break;
    case "spread":
      if (Array.isArray(a.refs) && a.refs.every((r) => okRef(inv, r?.area, r?.i))) dragSpread(inv, a.refs, btn(a.button));
      break;
    case "hotbar":
      if (okRef(inv, a.area, a.i) && Number.isInteger(a.n) && a.n >= 0 && a.n < INVENTORY.HOTBAR)
        swapWithHotbar(inv, { area: a.area, i: a.i }, a.n);
      break;
    case "dropSlot":
      if (okRef(inv, a.area, a.i)) push(takeFromSlot(inv, { area: a.area, i: a.i }, !!a.all));
      break;
    case "dropCursor":
      push(dropCursor(inv, btn(a.button)));
      break;
    case "result":
      out.push(...takeResult(inv, !!a.shift));
      break;
    case "book": {
      const r = RECIPES.find((x) => x.id === a.recipe);
      if (r) fillFromBook(inv, r, !!a.all);
      break;
    }
    case "craftSize":
      if (a.n === 2 || a.n === 3) out.push(...inv.setCraftSize(a.n));
      break;
    case "close":
      push(inv.returnCursor());
      out.push(...inv.returnCraft());
      break;
    case "select":
      if (Number.isInteger(a.n) && a.n >= 0 && a.n < INVENTORY.HOTBAR) inv.selected = a.n;
      break;
    case "throwHeld":
      push(inv.takeHeld(a.all ? (inv.held?.count ?? 1) : 1));
      break;
  }
  return out;
}

/** Trạng thái túi đồ gửi từ server (con trỏ, lưới chế tạo, ô rương / lò đang mở). */
export interface InvSnapshot {
  main: Slot[];
  armor: Slot[];
  craft: Slot[];
  craftSize: number;
  cursor: Slot;
  ext: Slot[];
  ack: number; // số thứ tự lệnh cuối cùng server đã áp dụng
}

const copy = (s: Slot): Slot => (s ? { ...s } : null);

export function snapshotInv(inv: Inventory, ack: number): InvSnapshot {
  return {
    main: inv.main.map(copy), armor: inv.armor.map(copy), craft: inv.craft.map(copy), craftSize: inv.craftSize,
    cursor: copy(inv.cursor), ext: inv.ext.map(copy), ack,
  };
}

/** Ghi trạng thái từ server vào túi đồ (giữ ô hotbar đang chọn của client). */
export function restoreInv(inv: Inventory, s: InvSnapshot): void {
  s.main.forEach((v, i) => (inv.main[i] = copy(v)));
  s.armor.forEach((v, i) => (inv.armor[i] = copy(v)));
  inv.craft = s.craft.map(copy);
  inv.craftSize = s.craftSize;
  inv.cursor = copy(s.cursor);
  // ô rương / lò: cùng mảng với giao diện đang mở
  inv.ext.length = s.ext.length;
  s.ext.forEach((v, i) => (inv.ext[i] = copy(v)));
}
