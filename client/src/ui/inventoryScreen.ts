// Màn hình túi đồ (phím E): 4 ô giáp, 27 ô túi, 9 ô hotbar, danh sách chế tạo bên phải.
// Bấm trái nhấc/đặt chồng, bấm phải nhấc nửa/đặt 1, Shift+bấm chuyển nhanh. Chồng đang cầm
// đi theo con trỏ; đóng màn hình thì trả về túi (phần thừa vứt ra).
import {
  RECIPES, craft, hasIngredients, type Inventory, type ItemStack, type Recipe, type SlotArea,
} from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { iconUrl, itemName } from "./itemIcons.js";
import { renderSlot } from "./survivalHud.js";

const CRAFT_MAX_TIMES = 64;

export class InventoryScreen {
  private readonly root = document.createElement("div");
  private readonly cursorEl = document.createElement("div");
  private readonly slotEls: { area: SlotArea; i: number; el: HTMLDivElement }[] = [];
  private readonly recipeList = document.createElement("div");
  private readonly benchNote = document.createElement("div");
  private recipeKey = "";
  open = false;

  constructor(
    private readonly inv: Inventory,
    private readonly nearBench: () => boolean,
    private readonly drop: (s: ItemStack) => void,
    private readonly onClose: () => void,
  ) {
    this.root.id = "inv";
    this.cursorEl.id = "cursor";
    this.cursorEl.className = "slot";
    const panel = document.createElement("div");
    panel.className = "panel";
    const left = document.createElement("div");
    left.innerHTML = `<h3>${STR.inventoryTitle}</h3>`;
    const top = document.createElement("div");
    top.style.display = "flex";
    const armor = document.createElement("div");
    armor.className = "armor";
    for (let i = 0; i < 4; i++) armor.appendChild(this.slot("armor", i));
    const bag = document.createElement("div");
    bag.className = "grid";
    for (let i = 9; i < 36; i++) bag.appendChild(this.slot("main", i));
    top.append(armor, bag);
    const hot = document.createElement("div");
    hot.className = "grid";
    hot.style.marginTop = "8px";
    hot.style.marginLeft = "54px";
    for (let i = 0; i < 9; i++) hot.appendChild(this.slot("main", i));
    left.append(top, hot);
    const right = document.createElement("div");
    right.innerHTML = `<h3>${STR.craftingTitle}</h3>`;
    this.recipeList.className = "recipes";
    this.benchNote.className = "tip";
    const hint = document.createElement("div");
    hint.className = "tip";
    hint.textContent = STR.craftHint;
    right.append(this.recipeList, this.benchNote, hint);
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

  toggle(): void {
    if (this.open) this.close();
    else {
      this.open = true;
      this.root.style.display = "flex";
      this.recipeKey = "";
      this.refresh();
    }
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.style.display = "none";
    const left = this.inv.returnCursor();
    if (left) this.drop(left);
    this.refresh();
    this.onClose();
  }

  private craftRecipe(r: Recipe, many: boolean): void {
    const bench = this.nearBench();
    for (let n = 0; n < (many ? CRAFT_MAX_TIMES : 1); n++) {
      const res = craft(this.inv, r, bench);
      if (!res.ok) break;
      if (res.overflow) this.drop(res.overflow);
    }
    this.recipeKey = "";
    this.refresh();
  }

  /** Vẽ lại các ô và danh sách công thức (gọi mỗi khung khi đang mở). */
  refresh(): void {
    for (const s of this.slotEls) renderSlot(s.el, s.area === "main" ? this.inv.main[s.i]! : this.inv.armor[s.i]!);
    renderSlot(this.cursorEl, this.inv.cursor);
    this.cursorEl.style.display = this.inv.cursor && this.open ? "" : "none";
    if (!this.open) return;
    const bench = this.nearBench();
    const ok = RECIPES.map((r) => hasIngredients(this.inv, r) && (r.station === "hand" || bench));
    const key = `${bench}|${ok.join("")}`;
    if (key === this.recipeKey) return;
    this.recipeKey = key;
    this.benchNote.textContent = bench ? STR.nearWorkbench : "";
    this.recipeList.innerHTML = "";
    // công thức làm được lên đầu
    const order = RECIPES.map((r, i) => ({ r, ok: ok[i]! })).sort((a, b) => Number(b.ok) - Number(a.ok));
    for (const { r, ok: can } of order) {
      const row = document.createElement("div");
      row.className = can ? "rec" : "rec off";
      const ing = r.inputs.map((x) => `${x.count} ${itemName(x.item)}`).join(" + ");
      const where = r.station === "workbench" ? ` · ${STR.needWorkbench}` : "";
      row.innerHTML = `<img src="${iconUrl(r.out.item)}"><div>${r.out.count > 1 ? `${r.out.count} ` : ""}${itemName(r.out.item)}<div class="ing">${ing}${where}</div></div>`;
      if (can) row.addEventListener("mousedown", (e) => this.craftRecipe(r, e.shiftKey));
      this.recipeList.appendChild(row);
    }
  }
}
