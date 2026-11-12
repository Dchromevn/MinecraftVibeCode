// Hotbar 9 ô và các thanh máu / đói / giáp / dưỡng khí phía trên (DOM), màn hình chết.
import { PLAYER, HUNGER, maxDurability, type Inventory, type PlayerState, type Slot } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { iconUrl, itemName } from "./itemIcons.js";

/** Vẽ một ô: icon, số lượng, thanh độ bền. */
export function renderSlot(el: HTMLElement, s: Slot): void {
  const key = s ? `${s.item}|${s.count}|${s.damage}` : "";
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = "";
  el.title = s ? itemName(s.item) : "";
  if (!s) return;
  const img = document.createElement("img");
  img.src = iconUrl(s.item);
  el.appendChild(img);
  if (s.count > 1) {
    const c = document.createElement("span");
    c.className = "cnt";
    c.textContent = String(s.count);
    el.appendChild(c);
  }
  const max = maxDurability(s.item);
  if (max > 0 && s.damage > 0) {
    const f = Math.max(0, 1 - s.damage / max);
    const bar = document.createElement("div");
    bar.className = "dur";
    bar.innerHTML = `<i style="width:${f * 100}%;background:hsl(${f * 120},90%,45%)"></i>`;
    el.appendChild(bar);
  }
}

/** Hàng 10 biểu tượng (mỗi biểu tượng = 2 điểm, nửa biểu tượng = 1). */
function iconRow(value: number, max: number, full: string, empty: string | null, cls: string): string {
  let html = `<div class="row ${cls}">`;
  for (let i = 0; i < max / 2; i++) {
    const v = Math.max(0, Math.min(2, value - i * 2));
    const clip = v >= 2 ? "" : v >= 1 ? "clip-path:inset(0 50% 0 0)" : "display:none";
    html += `<div class="ic">${empty ? `<img src="/ui/${empty}.png">` : ""}<img src="/ui/${full}.png" style="${clip}"></div>`;
  }
  return html + "</div>";
}

export class SurvivalHud {
  private readonly hotbar = document.createElement("div");
  private readonly bars = document.createElement("div");
  private readonly slots: HTMLDivElement[] = [];
  private readonly death = document.createElement("div");
  private barsKey = "";

  constructor(onRespawn: () => void) {
    this.hotbar.id = "hotbar";
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("div");
      s.className = "slot";
      this.slots.push(s);
      this.hotbar.appendChild(s);
    }
    this.bars.id = "bars";
    this.death.id = "death";
    this.death.innerHTML = `<div>${STR.youDied}</div>`;
    const btn = document.createElement("button");
    btn.textContent = STR.respawn;
    btn.onclick = onRespawn;
    this.death.appendChild(btn);
    document.body.append(this.bars, this.hotbar, this.death);
  }

  setVisible(v: boolean): void {
    this.hotbar.style.display = this.bars.style.display = v ? "" : "none";
  }

  showDeath(v: boolean): void {
    this.death.style.display = v ? "flex" : "none";
  }

  update(inv: Inventory, s: PlayerState): void {
    for (let i = 0; i < 9; i++) {
      renderSlot(this.slots[i]!, inv.main[i]!);
      this.slots[i]!.classList.toggle("sel", i === inv.selected);
    }
    const armor = inv.armorStats().points;
    const air = s.headInWater || s.air < PLAYER.AIR_S ? Math.ceil((s.air / PLAYER.AIR_S) * 20) : -1;
    const key = `${Math.ceil(s.health)}|${s.hunger}|${armor}|${air}`;
    if (key === this.barsKey) return;
    this.barsKey = key;
    let html = "";
    if (armor > 0) html += iconRow(armor, 20, "armor", "armor_gone", "left");
    html += iconRow(Math.ceil(s.health), PLAYER.MAX_HEALTH, "heart", "heart_gone", "left");
    html += iconRow(s.hunger, HUNGER.MAX, "hunger", "hunger_gone", "right");
    if (air >= 0) html += iconRow(air, 20, "bubble", null, "right");
    this.bars.innerHTML = html;
    this.bars.title = `${STR.hudHealth} ${s.health.toFixed(1)} · ${STR.hudHunger} ${s.hunger}`;
  }
}
