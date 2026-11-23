// Giao diện bàn phù phép (Giai đoạn 8b2): ô món + ô lưu ly, 3 lựa chọn (mức cấp cần, số lưu ly tốn, một phù phép gợi ý "…?" như
// Minecraft). Lựa chọn tính bằng hàm dùng chung từ hạt giống + số giá sách server gửi; bấm thì server kiểm và phù phép.
import { enchantOffers, roman, xpLevel, type Inventory } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import type { ContainerView } from "./containerViews.js";

export interface EnchantInfo { seed: number; shelves: number }

const CSS = `
#inv .enchant { display: flex; gap: 12px; align-items: flex-start; }
#inv .enchant .eslots { display: flex; gap: 4px; margin-top: 30px; }
#inv .enchant .eslot1 { background-image: url(/icons/lapis_lazuli.png) !important; background-size: 24px !important; background-position: center !important; }
#inv .enchant .offers { display: flex; flex-direction: column; gap: 2px; width: 230px; }
#inv .enchant .offer { height: 36px; display: flex; align-items: center; gap: 6px; padding: 0 6px; background: #8f7d6a; color: #3a2f22;
  border: 2px solid; border-color: #b8a58f #4a3b2c #4a3b2c #b8a58f; cursor: pointer; font-size: 12px; }
#inv .enchant .offer.ok:hover { background: #a6927c; }
#inv .enchant .offer.no { background: #5c5249; color: #8a7f74; cursor: default; }
#inv .enchant .offer .lv { margin-left: auto; color: #80ff20; text-shadow: 1px 1px 0 #233; font-weight: bold; }
#inv .enchant .offer.no .lv { color: #406010; }
#inv .enchant .offer .lz { width: 16px; height: 16px; image-rendering: pixelated; }
`;
let styled = false;

/** Phần trên giao diện: slot(i) tạo ô ext i; info() hạt giống + giá sách; onPick(i) gửi server. */
export function enchantView(inv: Inventory, info: () => EnchantInfo, xp: () => number, slot: (i: number) => HTMLDivElement, onPick: (i: number) => void): ContainerView {
  if (!styled) {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    styled = true;
  }
  const el = document.createElement("div");
  el.className = "container";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = STR.blocks.enchanting_table ?? "";
  const body = document.createElement("div");
  body.className = "enchant";
  const slots = document.createElement("div");
  slots.className = "eslots";
  const s1 = slot(1);
  s1.classList.add("eslot1");
  slots.append(slot(0), s1);
  const offers = document.createElement("div");
  offers.className = "offers";
  const rows = [0, 1, 2].map((i) => {
    const r = document.createElement("div");
    r.className = "offer no";
    r.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (r.classList.contains("ok")) onPick(i);
    });
    offers.appendChild(r);
    return r;
  });
  body.append(slots, offers);
  el.append(label, body);
  let key = "";
  return {
    el,
    update: () => {
      const item = inv.ext[0], lapis = inv.ext[1]?.count ?? 0, i0 = info(), lvl = xpLevel(xp()).level;
      const list = item ? enchantOffers(i0.seed, item.item, i0.shelves) : [];
      const k = `${item?.item}|${i0.seed}|${i0.shelves}|${lapis}|${lvl}`;
      if (k === key) return;
      key = k;
      rows.forEach((r, i) => {
        const o = list[i], first = o ? Object.entries(o.ench)[0] : undefined;
        const ok = !!o && !!first && lvl >= o.level && lapis >= i + 1;
        r.className = `offer ${ok ? "ok" : "no"}`;
        r.innerHTML = o && first
          ? `<img class="lz" src="/icons/lapis_lazuli.png"> ${i + 1} · ${STR.ench[first[0]] ?? first[0]} ${roman(first[1])} …?<span class="lv">${o.level}</span>`
          : "";
        r.title = o && first ? STR.enchantHint.replace("{0}", String(o.level)).replace("{1}", String(i + 1)) : "";
      });
    },
  };
}
