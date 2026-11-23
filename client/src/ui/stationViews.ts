// Giao diện đe và đá mài (Giai đoạn 8b3): hai ô vào + ô kết quả xem trước (tính bằng hàm dùng chung như server), ô đặt tên (đe), giá
// bằng cấp kinh nghiệm (đỏ nếu không đủ / "quá đắt"). Bấm ô kết quả: server tính lại rồi đưa kết quả vào túi.
import { anvilResult, grindResult, smithResult, xpLevel, type Inventory, type ItemStack } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import type { ContainerView } from "./containerViews.js";
import { renderSlot } from "./survivalHud.js";

const CSS = `
#inv .station { display: flex; align-items: center; gap: 8px; margin: 8px 0 0 20px; }
#inv .station .plus { font-size: 20px; }
#inv .stname { width: 200px; font: 14px monospace; background: #333; color: #fff; border: 2px solid #111; padding: 2px 4px; margin: 0 0 6px 20px; }
#inv .station-cost { margin: 6px 0 0 20px; color: #3a8d1c; font-weight: bold; min-height: 18px; }
#inv .station-cost.bad { color: #c03030; }
#inv .station .out { cursor: pointer; }
`;
let styled = false;
const div = (cls: string, text = ""): HTMLDivElement => {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  return d;
};

export function stationView(kind: "anvil" | "grindstone" | "smithing", inv: Inventory, xp: () => number, admin: () => boolean, slot: (i: number) => HTMLDivElement,
  take: (name: string) => void): ContainerView {
  if (!styled) {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    styled = true;
  }
  const el = div("container");
  el.appendChild(div("label", (kind === "anvil" ? STR.blocks.anvil : kind === "smithing" ? STR.blocks.smithing_table : STR.blocks.grindstone) ?? ""));
  const name = document.createElement("input");
  name.className = "stname";
  name.maxLength = 35;
  name.placeholder = STR.anvilName;
  name.addEventListener("keydown", (e) => e.stopPropagation()); // gõ tên không mở / đóng túi đồ
  if (kind === "anvil") el.appendChild(name);
  const row = div("station"), out = div("slot result out"), cost = div("station-cost");
  if (kind === "smithing") row.append(slot(0), slot(1), slot(2), div("arrow", "➜"), out); // (10d2) khuôn, đồ kim cương, thỏi netherite
  else row.append(slot(0), div("plus", "+"), slot(1), div("arrow", "➜"), out);
  el.append(row, cost);
  let preview: ItemStack | null = null, ok = false, lastLeft: ItemStack | null = null;
  out.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (preview && ok) take(name.value === (inv.ext[0]?.name ?? "") ? "" : name.value);
  });
  return {
    el,
    update: () => {
      const a = inv.ext[0] ?? null, b = inv.ext[1] ?? null;
      if (kind === "anvil") {
        if (a?.item !== lastLeft?.item || a?.name !== lastLeft?.name) name.value = a?.name ?? ""; // đổi món: hiện tên hiện có
        lastLeft = a;
        const r = anvilResult(a, b, name.value === (a?.name ?? "") ? "" : name.value), lvl = xpLevel(xp()).level;
        preview = r.out;
        ok = !!r.out && (admin() || (!r.tooExpensive && lvl >= r.cost));
        cost.textContent = r.out ? (r.tooExpensive ? STR.anvilTooExpensive : STR.anvilCost.replace("{0}", String(r.cost))) : "";
        cost.className = `station-cost${ok ? "" : " bad"}`;
      } else if (kind === "smithing") {
        preview = smithResult(a, b, inv.ext[2] ?? null);
        ok = !!preview;
        cost.textContent = "";
      } else {
        const r = grindResult(a, b, () => 0.5);
        preview = r.out;
        ok = !!r.out;
        cost.textContent = r.out && r.xp > 0 ? STR.grindXp : "";
        cost.className = "station-cost";
      }
      renderSlot(out, preview);
    },
  };
}
