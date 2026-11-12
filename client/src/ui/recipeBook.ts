// Sổ công thức (nút sách cạnh lưới chế tạo): danh sách bên trái giao diện; đủ nguyên liệu
// thì sáng, thiếu thì mờ; bấm xếp 1 bộ nguyên liệu vào lưới, Shift xếp nhiều bộ.
import { RECIPES, canFill, type InvAction, type Inventory } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { iconUrl, itemName } from "./itemIcons.js";

export class RecipeBook {
  readonly el = document.createElement("div");
  private readonly list = document.createElement("div");
  private key = "";
  visible = false;

  constructor(private readonly inv: Inventory, private readonly act: (a: InvAction) => void, private readonly changed: () => void) {
    this.el.className = "book";
    const h = document.createElement("h3");
    h.textContent = STR.recipeBook;
    const hint = document.createElement("div");
    hint.className = "tip";
    hint.textContent = STR.craftHint;
    this.list.className = "recipes";
    this.el.append(h, this.list, hint);
    this.el.style.display = "none";
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? "" : "none";
    this.key = "";
    this.refresh();
  }

  refresh(): void {
    if (!this.visible) return;
    const ok = RECIPES.map((x) => canFill(this.inv, x));
    const key = `${this.inv.craftSize}|${ok.join("")}`;
    if (key === this.key) return;
    this.key = key;
    this.list.innerHTML = "";
    const order = RECIPES.map((x, i) => ({ x, ok: ok[i]! })).sort((a, b) => Number(b.ok) - Number(a.ok));
    for (const { x, ok: can } of order) {
      const row = document.createElement("div");
      row.className = can ? "rec" : "rec off";
      const ing = x.inputs.map((i) => `${i.count} ${itemName(i.item)}`).join(" + ");
      const where = x.station === "workbench" && this.inv.craftSize < 3 ? ` · ${STR.needWorkbench}` : "";
      row.innerHTML = `<img src="${iconUrl(x.out.item)}"><div>${x.out.count > 1 ? `${x.out.count} ` : ""}${itemName(x.out.item)}<div class="ing">${ing}${where}</div></div>`;
      if (can)
        row.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          this.act({ t: "book", recipe: x.id, all: e.shiftKey });
          this.changed();
        });
      this.list.appendChild(row);
    }
  }
}
