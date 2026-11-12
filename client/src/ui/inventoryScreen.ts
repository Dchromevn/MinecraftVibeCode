// Màn hình túi đồ (phím E, lưới 2x2) và bàn chế tạo (chuột phải vào bàn, lưới 3x3), bố cục
// như ảnh mẫu (DESIGN.md 2.4). Thao tác như thể loại gốc: bấm trái nhấc/đặt chồng, bấm phải nhấc
// nửa/đặt 1, Shift+bấm chuyển nhanh, kéo trái chia đều, kéo phải đặt 1 mỗi ô, bấm đúp gom cùng
// loại, trỏ + phím 1–9 đổi chỗ với hotbar, trỏ + Q vứt, bấm ra ngoài khung vứt chồng đang cầm.
// Giai đoạn 5a: mọi thao tác là lệnh InvAction (áp dụng ngay trên máy và gửi server qua act).
import {
  gridResult, type FurnaceEntity, type InvAction, type Inventory, type SlotArea, type SlotRef,
} from "../../../shared/src/index.js";
import { chestView, furnaceView, type ContainerView } from "./containerViews.js";
import { STR } from "../strings.js";
import { PlayerPreview } from "./playerPreview.js";
import { RecipeBook } from "./recipeBook.js";
import { renderSlot } from "./survivalHud.js";

export type ScreenMode = "inventory" | "workbench" | "chest" | "furnace";

/** Khi mở rương / lò: tiêu đề, số ô, lò (để vẽ thanh lửa / tiến độ), việc cần làm khi đóng. */
export interface ContainerOpts {
  title: string;
  size: number;
  furnace?: FurnaceEntity;
  onClose: () => void;
}
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
  private readonly slotEls: (SlotRef & { el: HTMLDivElement; bg?: string })[] = [];
  private readonly preview = new PlayerPreview();
  private readonly book: RecipeBook;
  private readonly armorCol = div("armor");
  private readonly craftBox = div("craftbox");
  private readonly bagLabel = div("label", STR.inventoryTitle);
  private readonly bookBtn = document.createElement("button");
  private drag: { button: "left" | "right"; refs: SlotRef[] } | null = null;
  private sweep = false; // đang giữ Shift + chuột trái (chuyển nhanh khi rê qua ô)
  private pickFrom: SlotRef | null = null; // ô vừa nhấc đồ bằng chuột trái (kéo sang ô khác rồi thả = tráo đổi)
  private hover: SlotRef | null = null;
  private container: ContainerView | null = null;
  private containerClose: (() => void) | null = null;
  open = false;
  mode: ScreenMode = "inventory";

  constructor(private readonly inv: Inventory, private readonly act: (a: InvAction) => void, private readonly onClose: () => void) {
    this.root.id = "inv";
    this.cursorEl.id = "cursor";
    this.book = new RecipeBook(inv, act, () => this.refresh());
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
      this.act({ t: "result", shift: e.shiftKey });
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
      if (this.inv.cursor) this.act({ t: "dropCursor", button: e.button === 2 ? "right" : "left" });
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
    if (bg) el.style.backgroundImage = `url(${bg})`; // hình bóng mờ khi ô trống
    const ref = { area, i };
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const button = e.button === 2 ? "right" : "left";
      if (e.detail === 2 && button === "left" && this.inv.cursor) this.act({ t: "collect" });
      else if (e.shiftKey || !this.inv.cursor) {
        this.act({ t: "click", area, i, button, shift: e.shiftKey });
        if (!e.shiftKey && button === "left" && this.inv.cursor) this.pickFrom = ref;
        this.sweep = e.shiftKey && button === "left";
      }
      else this.drag = { button, refs: [ref] }; // đang cầm: chờ thả chuột (kéo qua nhiều ô)
      this.refresh();
    });
    el.addEventListener("mouseenter", (e) => {
      this.hover = ref;
      // giữ Shift + chuột trái rê qua: chuyển nhanh từng ô đi qua
      if (this.sweep && e.shiftKey && e.buttons & 1 && !this.inv.cursor) {
        this.act({ t: "click", area, i, button: "left", shift: true });
        this.refresh();
      }
      if (this.drag && !this.drag.refs.some((r) => r.area === area && r.i === i)) {
        this.drag.refs.push(ref);
        el.classList.add("drag");
      }
    });
    el.addEventListener("mouseleave", () => (this.hover = null));
    this.slotEls.push({ ...ref, el, bg });
    return el;
  }

  private endDrag(): void {
    this.sweep = false;
    this.dropDragged();
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    for (const s of this.slotEls) s.el.classList.remove("drag");
    const r = d.refs[0]!;
    if (d.refs.length === 1) this.act({ t: "click", area: r.area, i: r.i, button: d.button, shift: false });
    else this.act({ t: "spread", refs: d.refs, button: d.button });
    this.refresh();
  }

  /**
   * Kéo-thả: nhấc đồ ở ô A, thả chuột ở ô B → đặt vào B (gộp nếu cùng loại), món đang ở B (hoặc phần
   * dư) về lại A. Thả ngay tại A thì giữ trên con trỏ như bấm thường.
   */
  private dropDragged(): void {
    const from = this.pickFrom, to = this.hover;
    this.pickFrom = null;
    if (!from || !to || !this.inv.cursor || (to.area === from.area && to.i === from.i)) return;
    this.act({ t: "click", area: to.area, i: to.i, button: "left", shift: false });
    if (this.inv.cursor) this.act({ t: "click", area: from.area, i: from.i, button: "left", shift: false });
    this.refresh();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open || !this.hover) return;
    const n = Number(e.key);
    const h = this.hover;
    if (Number.isInteger(n) && n >= 1 && n <= 9) this.act({ t: "hotbar", area: h.area, i: h.i, n: n - 1 });
    else if (e.code === "KeyF" && !this.inv.cursor) this.act({ t: "click", area: h.area, i: h.i, button: "left", shift: true }); // như Shift + bấm
    else if (e.code === "KeyQ") this.act({ t: "dropSlot", area: h.area, i: h.i, all: e.shiftKey });
    else return;
    e.preventDefault();
    this.refresh();
  }

  /** Mở rương / lò nung (ô của nó đã gắn vào inv.ext trước khi gọi). */
  showContainer(mode: "chest" | "furnace", o: ContainerOpts): void {
    this.mode = mode;
    for (let k = this.slotEls.length - 1; k >= 0; k--) if (this.slotEls[k]!.area === "ext") this.slotEls.splice(k, 1);
    const slot = (i: number): HTMLDivElement => this.slot("ext", i);
    this.container = mode === "furnace" && o.furnace ? furnaceView(o.title, o.furnace, slot) : chestView(o.title, o.size, slot);
    this.containerClose = o.onClose;
    this.top.innerHTML = "";
    this.top.append(this.container.el);
    this.bagLabel.style.display = "";
    this.root.className = mode;
    this.open = true;
    this.root.style.display = "flex";
    this.refresh();
  }

  /** Mở túi đồ (lưới 2x2) hoặc bàn chế tạo (lưới 3x3). */
  show(mode: "inventory" | "workbench"): void {
    this.mode = mode;
    this.container = null;
    const size = mode === "workbench" ? 3 : 2;
    if (this.inv.craftSize !== size) this.act({ t: "craftSize", n: size });
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
    this.act({ t: "close" }); // trả con trỏ + lưới chế tạo về túi; server đóng rương / lò
    if (this.containerClose) {
      this.containerClose();
      this.containerClose = null;
      this.container = null;
    }
    this.refresh();
    this.onClose();
  }

  /** Vẽ lại các ô, ô kết quả, sổ công thức, hình nhân vật (gọi mỗi khung khi đang mở). */
  refresh(): void {
    for (const s of this.slotEls) {
      const item = this.inv.slots(s.area)[s.i] ?? null;
      renderSlot(s.el, item);
      if (s.bg) s.el.style.backgroundImage = item ? "none" : `url(${s.bg})`;
    }
    renderSlot(this.cursorEl, this.inv.cursor);
    this.cursorEl.style.display = this.inv.cursor && this.open ? "" : "none";
    if (!this.open) return;
    const r = gridResult(this.inv);
    renderSlot(this.resultEl, r ? { item: r.out.item, count: r.out.count, damage: 0 } : null);
    this.book.refresh();
    if (this.mode === "inventory") this.preview.render(this.inv.armor.map((s) => s?.item ?? null));
    this.container?.update();
  }
}
