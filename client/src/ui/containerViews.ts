// Phần trên của giao diện khi mở rương (3 hoặc 6 hàng) hoặc lò nung (nguyên liệu, lửa, nhiên liệu,
// mũi tên tiến độ, thành phẩm). Ô thuộc vùng "ext" của túi đồ (tham chiếu tới dữ liệu block).
import { FURNACE, type FurnaceEntity } from "../../../shared/src/index.js";

export interface ContainerView {
  el: HTMLDivElement;
  /** Vẽ lại phần động (thanh lửa, tiến độ). */
  update(): void;
}

const div = (cls: string, text = ""): HTMLDivElement => {
  const d = document.createElement("div");
  d.className = cls;
  if (text) d.textContent = text;
  return d;
};

/** Rương: size ô (27 hoặc 54), mỗi hàng 9. */
export function chestView(title: string, size: number, slot: (i: number) => HTMLDivElement): ContainerView {
  const el = div("container");
  const grid = div("grid g9");
  for (let i = 0; i < size; i++) grid.appendChild(slot(i));
  el.append(div("label", title), grid);
  return { el, update: () => undefined };
}

/** Lò nung: ô 0 nguyên liệu, 1 nhiên liệu, 2 thành phẩm. */
export function furnaceView(title: string, e: FurnaceEntity, slot: (i: number) => HTMLDivElement): ContainerView {
  const el = div("container");
  const body = div("furnace");
  const left = div("fcol");
  const fire = div("fire");
  const fireFg = document.createElement("img");
  fireFg.src = "/icons/furnace_fire.png";
  fire.innerHTML = `<img src="/icons/furnace_fire_bg.png">`;
  fire.appendChild(fireFg);
  left.append(slot(0), fire, slot(1));
  const arrow = div("progress");
  const fill = div("fill");
  arrow.appendChild(fill);
  const out = slot(2);
  out.classList.add("result");
  body.append(left, arrow, out);
  el.append(div("label", title), body);
  return {
    el,
    update: () => {
      const burn = e.burnMax > 0 ? e.burnLeft / e.burnMax : 0;
      fireFg.style.clipPath = `inset(${(1 - burn) * 100}% 0 0 0)`;
      fill.style.width = `${Math.min(1, e.cook / FURNACE.SMELT_TIME_S) * 100}%`;
    },
  };
}
