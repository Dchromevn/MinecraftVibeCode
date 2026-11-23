// Màn hình khi nằm giường (Giai đoạn 7a): tối dần, chữ "Đang ngủ...", nút "Rời giường" (hoặc nhấn Shift). Server báo nằm /
// dậy bằng gói "sleep"; bấm rời giường thì gửi "wake".
import { STR } from "../strings.js";

export class SleepOverlay {
  private readonly el = document.createElement("div");
  open = false;

  constructor(private readonly onLeave: () => void, private readonly relock: () => void) {
    this.el.id = "sleep";
    this.el.style.cssText =
      "position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:18vh;" +
      "background:rgba(8,10,30,0.75);color:#fff;font:20px monospace;z-index:6;transition:background 2s";
    const text = document.createElement("div");
    text.textContent = STR.sleepingText;
    const btn = document.createElement("button");
    btn.textContent = STR.leaveBed;
    btn.style.cssText = "margin-top:16px;padding:8px 20px;font:16px monospace;cursor:pointer";
    btn.onclick = () => this.onLeave();
    this.el.append(text, btn);
    document.body.appendChild(this.el);
    document.addEventListener("keydown", (e) => {
      if (this.open && (e.code === "ShiftLeft" || e.code === "ShiftRight")) this.onLeave();
    });
  }

  show(on: boolean): void {
    if (on === this.open) return;
    this.open = on;
    this.el.style.display = on ? "flex" : "none";
    if (on) document.exitPointerLock();
    else this.relock();
  }
}
