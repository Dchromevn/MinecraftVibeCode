// Màn hình túi đồ (phím E, lưới chế tạo 2x2) và bàn chế tạo (chuột phải vào bàn, lưới 3x3):
// 4 ô giáp, lưới + ô kết quả, 27 ô túi, 9 ô hotbar, sổ công thức bên phải. Bấm trái nhấc/đặt
// chồng, bấm phải nhấc nửa/đặt 1, Shift+bấm chuyển nhanh; ô kết quả: bấm lấy, Shift làm liên tục.
// Sổ công thức: bấm xếp 1 bộ nguyên liệu vào lưới, Shift xếp nhiều bộ nhất có thể.
import {
  RECIPES, canFill, fillFromBook, gridResult, takeResult, type Inventory, type ItemStack, type SlotArea,
} from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { iconUrl, itemName } from "./itemIcons.js";
import { renderSlot } from "./survivalHud.js";

export type ScreenMode = "inventory" | "workbench";

export class InventoryScreen {
  private readonly root = document.createElement("div");
  private readonly cursorEl = document.createElement("div");
  private readonly title = document.createElement("h3");
  private readonly gridEl = document.createElement("div");
  private readonly resultEl = document.createElement("div");
  private readonly slotEls: { area: SlotArea; i: number; el: HTMLDivElement }[] = [];
  private readonly recipeList = document.createElement("div");
  private recipeKey = "";
  open = false;
  mode: ScreenMode = "inventory";

  constructor(
    private readonly inv: Inventory,
    private readonly drop: (s: ItemStack) => void,
    private readonly onClose: () => void,
  ) {
    this.root.id = "inv";
    this.cursorEl.id = "cursor";
    this.cursorEl.className = "slot";
    const panel = document.createElement("div");
    panel.className = "panel";
    const left = document.createElement("div");
    const top = document.createElement("div");
    top.className = "top";
    const armor = document.createElement("div");
    armor.className = "armor";
    for (let i = 0; i < 4; i++) armor.appendChild(this.slot("armor", i));
    const craft = document.createElement("div");
    craft.className = "craft";
    const arrow = document.createElement("div");
    arrow.className = "arrow";
    arrow.textContent = "➜";
    this.resultEl.className = "slot result";
    this.resultEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      takeResult(this.inv, e.shiftKey).forEach(this.drop);
      this.refresh();
    });
    craft.append(this.gridEl, arrow, this.resultEl);
    top.append(armor, craft);
    const bag = document.createElement("div");
    bag.className = "grid";
    bag.style.marginTop = "8px";
    for (let i = 9; i < 36; i++) bag.appendChild(this.slot("main", i));
    const hot = document.createElement("div");
    hot.className = "grid";
    hot.style.marginTop = "8px";
    for (let i = 0; i < 9; i++) hot.appendChild(this.slot("main", i));
    left.append(this.title, top, bag, hot);
    const right = document.createElement("div");
    right.innerHTML = `<h3>${STR.craftingTitle}</h3>`;
    this.recipeList.className = "recipes";
    const hint = document.createElement("div");
    hint.className = "tip";
    hint.textContent = STR.craftHint;
    right.append(this.recipeList, hint);
    panel.append(left, right);
    this.root.appendChild(panel);
    document.body.append(this.root, this.cursorEl);
    this.root.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("mousemove", (e) => {
      this.cursorEl.style.left = `${e.clientX - 20}px`;
      this.cursorEl.style.top = `${e.clientY - 20}px`;
    });
  }

  private slot(area: SlotArea, i: number): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "slot";
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.inv.click(area, i, e.button === 2 ? "right" : "left", e.shiftKey);
      this.refresh();
    });
    this.slotEls.push({ area, i, el });
    return el;
  }

  /** Mở túi đồ (lưới 2x2) hoặc bàn chế tạo (lưới 3x3). */
  show(mode: ScreenMode): void {
    this.mode = mode;
    const size = mode === "workbench" ? 3 : 2;
    this.inv.setCraftSize(size).forEach(this.drop);
    // dựng lại các ô lưới chế tạo
    for (let k = this.slotEls.length - 1; k >= 0; k--) if (this.slotEls[k]!.area === "craft") this.slotEls.splice(k, 1);
    this.gridEl.innerHTML = "";
    this.gridEl.className = `grid g${size}`;
    for (let i = 0; i < size * size; i++) this.gridEl.appendChild(this.slot("craft", i));
    this.title.textContent = mode === "workbench" ? STR.blocks.workbench ?? "" : STR.inventoryTitle;
    this.open = true;
    this.root.style.display = "flex";
    this.recipeKey = "";
    this.refresh();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.style.display = "none";
    const left = this.inv.returnCursor();
    if (left) this.drop(left);
    this.inv.returnCraft().forEach(this.drop);
    this.refresh();
    this.onClose();
  }

  /** Vẽ lại các ô, ô kết quả và sổ công thức (gọi mỗi khung khi đang mở). */
  refresh(): void {
    for (const s of this.slotEls) {
      const src = s.area === "main" ? this.inv.main : s.area === "armor" ? this.inv.armor : this.inv.craft;
      renderSlot(s.el, src[s.i] ?? null);
    }
    renderSlot(this.cursorEl, this.inv.cursor);
    this.cursorEl.style.display = this.inv.cursor && this.open ? "" : "none";
    if (!this.open) return;
    const r = gridResult(this.inv);
    renderSlot(this.resultEl, r ? { item: r.out.item, count: r.out.count, damage: 0 } : null);
    const ok = RECIPES.map((x) => canFill(this.inv, x));
    const key = `${this.inv.craftSize}|${ok.join("")}`;
    if (key === this.recipeKey) return;
    this.recipeKey = key;
    this.recipeList.innerHTML = "";
    // công thức xếp được lên đầu
    const order = RECIPES.map((x, i) => ({ x, ok: ok[i]! })).sort((a, b) => Number(b.ok) - Number(a.ok));
    for (const { x, ok: can } of order) {
      const row = document.createElement("div");
      row.className = can ? "rec" : "rec off";
      const ing = x.inputs.map((i) => `${i.count} ${itemName(i.item)}`).join(" + ");
      const where = x.station === "workbench" && this.inv.craftSize < 3 ? ` · ${STR.needWorkbench}` : "";
      row.innerHTML = `<img src="${iconUrl(x.out.item)}"><div>${x.out.count > 1 ? `${x.out.count} ` : ""}${itemName(x.out.item)}<div class="ing">${ing}${where}</div></div>`;
      if (can)
        row.addEventListener("mousedown", (e) => {
          fillFromBook(this.inv, x, e.shiftKey);
          this.refresh();
        });
      this.recipeList.appendChild(row);
    }
  }
}
