// Cài đặt của người chơi (màn hình Cài đặt ở menu mở đầu / menu Esc): lưu localStorage trên máy, các module đọc thẳng `settings`.
// Đây là tùy chọn hiển thị / điều khiển, không phải thông số gameplay (không đổi luật game, server không biết).
import { PLAYER, WORLD } from "../../shared/src/index.js";

export interface Settings {
  viewDistance: number; // chunk
  fov: number; // độ (góc nhìn dọc gốc, chạy nhanh / kéo cung vẫn đổi theo tỉ lệ)
  sensitivity: number; // hệ số độ nhạy chuột (1 = mặc định)
  brightness: number; // 0..1: nâng ánh sáng tối thiểu chỗ tối
  showFps: boolean;
  shake: boolean; // lắc camera khi đi + rung khi trúng đòn
}

/** Giới hạn thanh kéo: [min, max, bước]. */
export const SETTING_RANGE = {
  viewDistance: [WORLD.VIEW_DISTANCE_MIN, WORLD.VIEW_DISTANCE_MAX, 1],
  fov: [50, 110, 1],
  sensitivity: [0.1, 2, 0.05],
  brightness: [0, 1, 0.05],
} as const;

/** Độ sáng 100%: ánh sáng tối thiểu (0..1) của khối ở chỗ tối nhất. */
export const BRIGHTNESS_MAX_LIGHT = 0.25;
/** Độ nhạy chuột gốc (rad / điểm ảnh) khi hệ số = 1. */
export const BASE_SENSITIVITY = 0.002;

const KEY = "voxel.settings";
const DEFAULTS: Settings = {
  viewDistance: WORLD.VIEW_DISTANCE_DEFAULT, fov: PLAYER.FOV, sensitivity: 1, brightness: 0, showFps: false, shake: true,
};

const clamp = (v: unknown, [lo, hi]: readonly [number, number, number], d: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

function load(): Settings {
  let raw: Partial<Record<keyof Settings, unknown>> = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as typeof raw;
  } catch {
    // trình duyệt chặn / dữ liệu hỏng: dùng mặc định
  }
  return {
    viewDistance: clamp(raw.viewDistance, SETTING_RANGE.viewDistance, DEFAULTS.viewDistance),
    fov: clamp(raw.fov, SETTING_RANGE.fov, DEFAULTS.fov),
    sensitivity: clamp(raw.sensitivity, SETTING_RANGE.sensitivity, DEFAULTS.sensitivity),
    brightness: clamp(raw.brightness, SETTING_RANGE.brightness, DEFAULTS.brightness),
    showFps: typeof raw.showFps === "boolean" ? raw.showFps : DEFAULTS.showFps,
    shake: typeof raw.shake === "boolean" ? raw.shake : DEFAULTS.shake,
  };
}

export const settings: Settings = load();
const listeners: (() => void)[] = [];

/** Gọi khi cài đặt đổi (game đang chạy áp dụng ngay, ví dụ tầm nhìn). */
export function onSettingsChange(f: () => void): void {
  listeners.push(f);
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // không lưu được: vẫn dùng trong phiên này
  }
  for (const f of listeners) f();
}

/** Ô đếm FPS ở góc màn hình (bật trong Cài đặt). */
export function showFpsLabel(fps: number): void {
  let el = document.getElementById("fps");
  if (!settings.showFps) return void el?.remove();
  if (!el) {
    el = document.createElement("div");
    el.id = "fps";
    document.body.appendChild(el);
  }
  el.textContent = `${fps} FPS`;
}
