// Màn hình Cài đặt (menu mở đầu / menu Esc): tầm nhìn, FOV, độ nhạy chuột, độ sáng, hiện FPS, rung màn hình, toàn màn hình.
// Kéo là áp dụng + lưu ngay; Esc hoặc "Xong" để đóng.
import { STR_MENU as M } from "../stringsMenu.js";
import { SETTING_RANGE, saveSettings, settings } from "../settings.js";

type Slider = "viewDistance" | "fov" | "sensitivity" | "brightness";
type Toggle = "showFps" | "shake";

const label: Record<Slider, (v: number) => string> = {
  viewDistance: (v) => M.setViewDistance.replace("{0}", String(v)),
  fov: (v) => M.setFov.replace("{0}", String(v)),
  sensitivity: (v) => M.setSensitivity.replace("{0}", String(Math.round(v * 100))),
  brightness: (v) => (v === 0 ? M.setBrightnessMin : v === 1 ? M.setBrightnessMax : M.setBrightness.replace("{0}", String(Math.round(v * 100)))),
};
const toggleLabel: Record<Toggle, string> = { showFps: M.setShowFps, shake: M.setShake };

const onOff = (on: boolean): string => (on ? M.setOn : M.setOff);
const fullscreen = (): boolean => !!document.fullscreenElement;

export function openSettings(onClose: () => void = () => undefined): void {
  if (document.getElementById("settings")) return;
  const el = document.createElement("div");
  el.id = "settings";
  const sliders = (Object.keys(label) as Slider[]).map((k) => {
    const [lo, hi, step] = SETTING_RANGE[k];
    return `<label class="slider"><span data-l="${k}"></span><input type="range" data-k="${k}" min="${lo}" max="${hi}" step="${step}"></label>`;
  }).join("");
  const toggles = (Object.keys(toggleLabel) as Toggle[]).map((k) => `<button data-t="${k}"></button>`).join("");
  el.innerHTML = `<div class="panel"><h2>${M.settings}</h2><div class="grid">${sliders}${toggles}<button data-t="fullscreen"></button></div>
    <button class="done">${M.done}</button></div>`;
  document.body.appendChild(el);

  const refresh = (): void => {
    for (const k of Object.keys(label) as Slider[]) {
      el.querySelector(`[data-l=${k}]`)!.textContent = label[k](settings[k]);
      el.querySelector<HTMLInputElement>(`[data-k=${k}]`)!.value = String(settings[k]);
    }
    for (const k of Object.keys(toggleLabel) as Toggle[]) el.querySelector(`[data-t=${k}]`)!.textContent = `${toggleLabel[k]}: ${onOff(settings[k])}`;
    el.querySelector("[data-t=fullscreen]")!.textContent = `${M.setFullscreen}: ${onOff(fullscreen())}`;
  };
  el.querySelectorAll<HTMLInputElement>("input[data-k]").forEach((inp) => inp.addEventListener("input", () => {
    settings[inp.dataset.k as Slider] = Number(inp.value);
    saveSettings();
    refresh();
  }));
  el.querySelectorAll<HTMLButtonElement>("button[data-t]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.t!;
    if (k === "fullscreen") {
      const p = fullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      void p.catch(() => undefined).then(refresh);
      return;
    }
    settings[k as Toggle] = !settings[k as Toggle];
    saveSettings();
    refresh();
  }));
  const close = (): void => {
    el.remove();
    document.removeEventListener("keydown", esc, true);
    document.removeEventListener("fullscreenchange", refresh);
    onClose();
  };
  const esc = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    close();
  };
  document.addEventListener("keydown", esc, true);
  document.addEventListener("fullscreenchange", refresh);
  el.querySelector(".done")!.addEventListener("click", close);
  refresh();
}
