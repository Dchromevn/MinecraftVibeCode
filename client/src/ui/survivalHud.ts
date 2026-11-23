// Hotbar 9 ô và các thanh máu / đói / giáp / dưỡng khí phía trên (DOM), màn hình chết.
import { PLAYER, HUNGER, EFFECTS, activeEffects, maxDurability, roman, xpLevel, type Inventory, type PlayerState, type Slot, RIDE } from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { STR_NETHER } from "../stringsNether.js";
import { compassIcon, iconUrl, itemName } from "./itemIcons.js";

/** Vẽ một ô: icon, số lượng, thanh độ bền. */
export function renderSlot(el: HTMLElement, s: Slot): void {
  const ench = s?.ench ? Object.entries(s.ench) : [];
  const needle = s ? compassIcon(s) : null; // (10d2) la bàn: kim quay theo hướng
  const key = s ? `${s.item}|${s.count}|${s.damage}|${ench.join()}|${s.name ?? ""}|${needle ?? ""}` : "";
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = "";
  el.title = s ? [s.name ? `${s.name} (${itemName(s.item)})` : itemName(s.item), ...ench.map(([k, l]) => `  ${STR.ench[k] ?? k} ${roman(l)}`)].join("\n") : ""; // (8b2) phù phép
  el.classList.toggle("glint", ench.length > 0 || s?.item === "enchanted_book" || s?.item === "lodestone_compass");
  if (!s) return;
  const img = document.createElement("img");
  img.src = needle ?? iconUrl(s.item);
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

const RIDE_HINT_MS = 6000;

export class SurvivalHud {
  private readonly hotbar = document.createElement("div");
  private readonly bars = document.createElement("div");
  private readonly slots: HTMLDivElement[] = [];
  private readonly offSlot = document.createElement("div"); // tay trái (6a)
  private readonly death = document.createElement("div");
  private barsKey = "";
  private readonly fxBox = document.createElement("div"); // (7b) hiệu ứng đang có, góc trên phải
  private fxKey = "";
  private readonly jump = document.createElement("div"); // (7d) thanh tích lực nhảy khi cưỡi
  private readonly rideHint = document.createElement("div"); // (8a) gợi ý phím khi vừa lên thú
  private readonly xpBar = document.createElement("div"); // (8b2) thanh kinh nghiệm + cấp
  private rideSeen = 0;
  private rideAt = 0;

  constructor(onRespawn: () => void) {
    this.hotbar.id = "hotbar";
    this.offSlot.className = "slot off";
    this.offSlot.title = STR.offhand;
    this.hotbar.appendChild(this.offSlot);
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
    this.fxBox.style.cssText = "position:fixed;top:8px;right:8px;display:flex;gap:6px;z-index:3;pointer-events:none;font:12px monospace;color:#fff";
    this.jump.style.cssText = "position:fixed;left:50%;bottom:52px;width:364px;height:5px;margin-left:-182px;background:rgba(0,0,0,.5);display:none;z-index:3";
    this.jump.innerHTML = `<div style="height:100%;width:0;background:linear-gradient(90deg,#3a7bd5,#e8c33a)"></div>`;
    this.rideHint.style.cssText = "position:fixed;left:50%;bottom:104px;transform:translateX(-50%);color:#fff;font:15px monospace;" +
      "text-shadow:2px 2px 0 #000;pointer-events:none;display:none;z-index:3;white-space:nowrap";
    this.xpBar.id = "xpbar";
    this.xpBar.innerHTML = `<div class="fill"></div><span></span>`;
    document.body.append(this.bars, this.hotbar, this.death, this.fxBox, this.jump, this.rideHint, this.xpBar);
  }

  setVisible(v: boolean): void {
    this.hotbar.style.display = this.bars.style.display = v ? "" : "none";
  }

  showDeath(v: boolean): void {
    this.death.style.display = v ? "flex" : "none";
  }

  /** Biểu tượng hiệu ứng + thời gian còn lại (cập nhật mỗi giây). */
  private effects(s: PlayerState): void {
    const list = activeEffects(s), key = list.map((e) => `${e.fx}${e.lvl}:${Math.ceil(e.s)}`).join("|");
    if (key === this.fxKey) return;
    this.fxKey = key;
    this.fxBox.innerHTML = list.map((e) => {
      const t = Math.ceil(e.s), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, "0");
      return `<div title="${STR.effects[e.fx] ?? e.fx}" style="background:rgba(0,0,0,.5);padding:3px 5px;text-align:center">` +
        `<img src="/ui/effect_${EFFECTS.ICONS[e.fx]}.png" style="width:24px;height:24px;image-rendering:pixelated;display:block;margin:auto">` +
        `${e.lvl > 1 ? "II " : ""}${mm}:${ss}</div>`;
    }).join("");
  }

  update(inv: Inventory, s: PlayerState): void {
    for (let i = 0; i < 9; i++) {
      renderSlot(this.slots[i]!, inv.main[i]!);
      this.slots[i]!.classList.toggle("sel", i === inv.selected);
    }
    renderSlot(this.offSlot, inv.offhand[0]!);
    this.offSlot.style.visibility = inv.offhand[0] ? "visible" : "hidden";
    this.effects(s);
    this.jump.style.display = s.rideId && s.rideControl && !s.rideDash ? "" : "none";
    const lv = xpLevel(s.xp); // (8b2)
    (this.xpBar.firstChild as HTMLDivElement).style.width = `${lv.progress * 100}%`;
    (this.xpBar.lastChild as HTMLSpanElement).textContent = lv.level > 0 ? String(lv.level) : "";
    this.xpBar.style.visibility = this.jump.style.display === "none" ? "visible" : "hidden";
    if (s.rideId !== this.rideSeen) [this.rideSeen, this.rideAt] = [s.rideId, performance.now()];
    const hint = s.rideId && performance.now() - this.rideAt < RIDE_HINT_MS;
    this.rideHint.style.display = hint ? "" : "none";
    if (hint) this.rideHint.textContent = s.rideBack ? STR.rideHintBack : s.rideDash === 2 ? STR_NETHER.rideHintStrider : !s.rideControl ? STR.rideHintNoSaddle
      : s.rideDash ? STR.rideHintCamel : STR.rideHint;
    (this.jump.firstChild as HTMLDivElement).style.width = `${Math.round((s.rideCharge / RIDE.CHARGE_S) * 100)}%`;
    const armor = inv.armorStats().points;
    const air = s.headInWater || s.air < PLAYER.AIR_S ? Math.ceil((s.air / PLAYER.AIR_S) * 20) : -1;
    const fx = s.hungerFxS > 0; // (7a) hiệu ứng đói: thanh đói màu xanh vàng
    const key = `${Math.ceil(s.health)}|${Math.ceil(s.absorb)}|${s.hunger}|${armor}|${air}|${fx}`;
    if (key === this.barsKey) return;
    this.barsKey = key;
    let html = "";
    if (armor > 0) html += iconRow(armor, 20, "armor", "armor_gone", "left");
    if (s.absorb > 0) html += iconRow(Math.ceil(s.absorb), Math.ceil(s.absorb / 2) * 2, "heart_absorb", null, "left"); // tim vàng (Hấp thụ)
    html += iconRow(Math.ceil(s.health), PLAYER.MAX_HEALTH, s.fxWitherS > 0 ? "heart_wither" : "heart", "heart_gone", "left"); // (10c) Héo: tim đen
    html += iconRow(s.hunger, HUNGER.MAX, fx ? "hunger_fx" : "hunger", fx ? "hunger_fx_gone" : "hunger_gone", "right");
    if (air >= 0) html += iconRow(air, 20, "bubble", null, "right");
    this.bars.innerHTML = html;
    this.bars.title = `${STR.hudHealth} ${s.health.toFixed(1)} · ${STR.hudHunger} ${s.hunger}`;
  }
}
