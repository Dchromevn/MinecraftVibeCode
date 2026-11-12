// Màn hình túi đồ (phím E, lưới 2x2) và bàn chế tạo (chuột phải vào bàn, lưới 3x3), bố cục
// như ảnh mẫu (DESIGN.md 2.4). Thao tác như thể loại gốc: bấm trái nhấc/đặt chồng, bấm phải nhấc
// nửa/đặt 1, Shift+bấm chuyển nhanh, kéo trái chia đều, kéo phải đặt 1 mỗi ô, bấm đúp gom cùng
// loại, trỏ + phím 1–9 đổi chỗ với hotbar, trỏ + Q vứt, bấm ra ngoài khung vứt chồng đang cầm.
import {
  collectToCursor, dragSpread, dropCursor, gridResult, swapWithHotbar, takeFromSlot, takeResult,
  type Inventory, type ItemStack, type SlotArea, type SlotRef,
} from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { PlayerPreview } from "./playerPreview.js";
import { RecipeBook } from "./recipeBook.js";
import { renderSlot } from "./survivalHud.js";

export type ScreenMode = "inventory" | "workbench";
const ARMOR_BG = ["helmet", "chestplate", "leggings", "boots"];
const div = (cls: string, text = ""): HTMLDivElement => {
  const d = document.createElement("div");
  d.className = cls;
  if (text) d.textContent = text;
  return d;
};

export class InventoryScreen {
  private readonly root = div("");
  private readonly cursorEl = div("slot");
  private readonly top = div("top");
  private readonly gridEl = div("grid");
  private readonly resultEl = div("slot result");
  private readonly slotEls: (SlotRef & { el: HTMLDivElement })[] = [];
  private readonly preview = new PlayerPreview();
  private readonly book: RecipeBook;
  private readonly armorCol = div("armor");
  private readonly craftBox = div("craftbox");
  private readonly bagLabel = div("label", STR.inventoryTitle);
  private readonly bookBtn = document.createElement("button");
  private drag: { button: "left" | "right"; refs: SlotRef[] } | null = null;
  private hover: SlotRef | null = null;
  open = false;
  mode: ScreenMode = "inventory";

  constructor(private readonly inv: Inventory, private readonly drop: (s: ItemStack) => void, private readonly onClose: () => void) {
    this.root.id = "inv";
    this.cursorEl.id = "cursor";
    this.book = new RecipeBook(inv, () => this.refresh());
    const panel = div("panel");
    ARMOR_BG.forEach((p, i) => this.armorCol.appendChild(this.slot("armor", i, `/ui/empty_${p}.png`)));
    this.bookBtn.className = "bookbtn";
    this.bookBtn.innerHTML = `<img src="/ui/book.png">`;
    this.bookBtn.title = STR.recipeBook;
    this.bookBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.book.toggle();
    });
    this.resultEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      takeResult(this.inv, e.shiftKey).forEach(this.drop);
      this.refresh();
    });
    const craftRow = div("craftrow");
    craftRow.append(this.gridEl, div("arrow", "➜"), this.resultEl);
    this.craftBox.append(div("label", STR.craftingTitle), craftRow);
    const bag = div("grid g9");
    for (let i = 9; i < 36; i++) bag.appendChild(this.slot("main", i));
    const hot = div("grid g9 hot");
    for (let i = 0; i < 9; i++) hot.appendChild(this.slot("main", i));
    panel.append(this.top, this.bagLabel, bag, hot);
    const wrap = div("wrap");
    wrap.append(this.book.el, panel);
    this.root.append(wrap);
    document.body.append(this.root, this.cursorEl);
    this.root.addEventListener("contextmenu", (e) => e.preventDefault());
    // bấm ra ngoài khung: vứt chồng đang cầm
    this.root.addEventListener("mousedown", (e) => {
      if (e.target !== this.root && e.target !== wrap) return;
      const s = dropCursor(this.inv, e.button === 2 ? "right" : "left");
      if (s) this.drop(s);
      this.refresh();
    });
    document.addEventListener("mousemove", (e) => {
      this.cursorEl.style.left = `${e.clientX - 20}px`;
      this.cursorEl.style.top = `${e.clientY - 20}px`;
    });
    document.addEventListener("mouseup", () => this.endDrag());
    document.addEventListener("keydown", (e) => this.onKey(e));
  }

  private slot(area: SlotArea, i: number, bg?: string): HTMLDivElement {
    const el = div("slot");
    if (bg) el.style.backgroundImage = `url(${bg})`;
    const ref = { area, i };
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const button = e.button === 2 ? "right" : "left";
      if (e.detail === 2 && button === "left" && this.inv.cursor) collectToCursor(this.inv);
      else if (e.shiftKey || !this.inv.cursor) this.inv.click(area, i, button, e.shiftKey);
      else this.drag = { button, refs: [ref] }; // đang cầm: chờ thả chuột (kéo qua nhiều ô)
      this.refresh();
    });
    el.addEventListener("mouseenter", () => {
      this.hover = ref;
      if (this.drag && !this.drag.refs.some((r) => r.area === area && r.i === i)) {
        this.drag.refs.push(ref);
        el.classList.add("drag");
      }
    });
    el.addEventListener("mouseleave", () => (this.hover = null));
    this.slotEls.push({ ...ref, el });
    return el;
  }

  private endDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    for (const s of this.slotEls) s.el.classList.remove("drag");
    const r = d.refs[0]!;
    if (d.refs.length === 1) this.inv.click(r.area, r.i, d.button, false);
    else dragSpread(this.inv, d.refs, d.button);
    this.refresh();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open || !this.hover) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= 9) swapWithHotbar(this.inv, this.hover, n - 1);
    else if (e.code === "KeyQ") {
      const s = takeFromSlot(this.inv, this.hover, e.ctrlKey);
      if (s) this.drop(s);
    } else return;
    e.preventDefault();
    this.refresh();
  }

  /** Mở túi đồ (lưới 2x2) hoặc bàn chế tạo (lưới 3x3). */
  show(mode: ScreenMode): void {
    this.mode = mode;
    const size = mode === "workbench" ? 3 : 2;
    this.inv.setCraftSize(size).forEach(this.drop);
    for (let k = this.slotEls.length - 1; k >= 0; k--) if (this.slotEls[k]!.area === "craft") this.slotEls.splice(k, 1);
    this.gridEl.innerHTML = "";
    this.gridEl.className = `grid g${size}`;
    for (let i = 0; i < size * size; i++) this.gridEl.appendChild(this.slot("craft", i));
    this.top.innerHTML = "";
    if (mode === "inventory") {
      const side = div("side");
      side.append(this.bookBtn);
      this.top.append(this.armorCol, this.preview.canvas, this.craftBox, side);
    } else this.top.append(this.bookBtn, this.craftBox);
    this.bagLabel.style.display = mode === "workbench" ? "" : "none";
    this.root.className = mode;
    this.open = true;
    this.root.style.display = "flex";
    this.refresh();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.drag = null;
    this.root.style.display = "none";
    const left = this.inv.returnCursor();
    if (left) this.drop(left);
    this.inv.returnCraft().forEach(this.drop);
    this.refresh();
    this.onClose();
  }

  /** Vẽ lại các ô, ô kết quả, sổ công thức, hình nhân vật (gọi mỗi khung khi đang mở). */
  refresh(): void {
    for (const s of this.slotEls) renderSlot(s.el, this.inv.slots(s.area)[s.i] ?? null);
    renderSlot(this.cursorEl, this.inv.cursor);
    this.cursorEl.style.display = this.inv.cursor && this.open ? "" : "none";
    if (!this.open) return;
    const r = gridResult(this.inv);
    renderSlot(this.resultEl, r ? { item: r.out.item, count: r.out.count, damage: 0 } : null);
    this.book.refresh();
    if (this.mode === "inventory") this.preview.render();
  }
}
