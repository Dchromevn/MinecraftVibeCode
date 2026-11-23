// Bảng đổi đồ với dân làng / thương nhân lang thang (Giai đoạn 8a): server gửi danh sách giao dịch (mua → bán, đã dùng / tối đa);
// bấm một dòng để đổi một lần (Shift: đổi tới khi hết đồ / hết hàng). Hết hàng: dòng đỏ có dấu ✕; thiếu đồ: dòng mờ. Server kiểm
// tra và trừ đồ (đồng bộ cho mọi người đang đổi với cùng sinh vật).
import { VILLAGER_PROFS, canAfford, stack, type Inventory, type ServerMsg, type TradeItem } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { renderSlot } from "./survivalHud.js";

type TradesMsg = Extract<ServerMsg, { t: "trades" }>;

const CSS = `
#trade { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: #0009; z-index: 5; font: 14px monospace; color: #404040; }
#trade .panel { background: #c6c6c6; padding: 10px 12px; border: 3px solid; border-color: #fff #555 #555 #fff; border-radius: 4px; box-shadow: 0 0 0 2px #000; min-width: 300px; }
#trade .title { margin: 2px 0 8px; font-weight: bold; }
#trade .row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; margin: 2px 0; cursor: pointer; border: 2px solid; border-color: #fff #555 #555 #fff; background: #b4b4b4; }
#trade .row:hover { background: #d8d8ff; }
#trade .row.poor { opacity: 0.55; }
#trade .row.out { background: #c89a9a; cursor: default; }
#trade .slot { background: #8b8b8b; border: 2px solid; border-color: #373737 #fff #fff #373737; }
#trade .arrow { width: 28px; text-align: center; font-size: 18px; }
#trade .left { margin-left: auto; font-size: 12px; }
#trade .hint { margin-top: 8px; font-size: 12px; color: #555; }
`;

export class TradeScreen {
  private readonly root = document.createElement("div");
  private readonly panel = document.createElement("div");
  private mob = 0;
  private list: TradesMsg["list"] = [];
  open = false;

  constructor(private readonly inv: Inventory, private readonly send: (m: { t: "trade"; mob: number; i: number; all: boolean } | { t: "tradeClose" }) => void,
    private readonly onClose: () => void) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root.id = "trade";
    this.panel.className = "panel";
    this.root.appendChild(this.panel);
    this.root.addEventListener("mousedown", (e) => {
      if (e.target === this.root) this.close();
    });
    document.body.appendChild(this.root);
  }

  /** Gói "trades": mở (hoặc cập nhật nếu đang mở cùng sinh vật). */
  show(m: TradesMsg): void {
    this.mob = m.mob;
    this.list = m.list;
    const name = m.key === "wandering_trader" ? STR.mobs.wandering_trader : STR.professions[VILLAGER_PROFS[m.prof] ?? "none"] ?? STR.mobs.villager;
    this.panel.innerHTML = "";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = name ?? "";
    this.panel.appendChild(title);
    m.list.forEach(([buy, buy2, sell, used, max, ench], i) => {
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.i = String(i);
      row.append(this.icon(buy), this.icon(buy2), this.arrow(), this.icon(sell, ench));
      const left = document.createElement("span");
      left.className = "left";
      left.textContent = used >= max ? `✕ ${STR.tradeOut}` : `${max - used}/${max}`;
      row.appendChild(left);
      if (used >= max) row.classList.add("out");
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (used < max) this.send({ t: "trade", mob: this.mob, i, all: e.shiftKey });
      });
      this.panel.appendChild(row);
    });
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = STR.tradeHint;
    this.panel.appendChild(hint);
    this.refresh();
    this.root.style.display = "flex";
    this.open = true;
  }

  private icon(t: TradeItem | null, ench?: Record<string, number> | null): HTMLElement {
    const el = document.createElement("div");
    el.className = "slot";
    renderSlot(el, t ? { ...stack(t[0], t[1]), ...(ench ? { ench } : {}) } : null);
    return el;
  }

  private arrow(): HTMLElement {
    const a = document.createElement("span");
    a.className = "arrow";
    a.textContent = "➜";
    return a;
  }

  /** Mờ các dòng chưa đủ đồ (theo túi đồ đang có). */
  refresh(): void {
    if (!this.open) return;
    for (const row of this.panel.querySelectorAll<HTMLDivElement>(".row")) {
      const t = this.list[Number(row.dataset.i)];
      if (!t) continue;
      row.classList.toggle("poor", !canAfford(this.inv, { buy: t[0], ...(t[1] ? { buy2: t[1] } : {}), sell: t[2], max: t[4] }));
    }
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.style.display = "none";
    this.send({ t: "tradeClose" });
    this.onClose();
  }

  /** Server đóng (đi xa, sinh vật chết). */
  ended(): void {
    if (!this.open) return;
    this.open = false;
    this.root.style.display = "none";
    this.onClose();
  }
}
