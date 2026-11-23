// Menu Esc (Giai đoạn 9a): hiện khi chuột được thả ra mà không mở giao diện nào khác — Tiếp tục / Thoát về menu chính, kèm bảng phím.
// Game nhiều người nên không dừng thế giới. Bảng mất kết nối có nút về menu chính.
import { STR } from "../strings.js";
import { STR_MENU as M } from "../stringsMenu.js";
import { hostShare } from "../net/desktop.js";
import { openSettings } from "./settingsScreen.js";

/** Về menu chính: tải lại trang không kèm tham số (không tự vào lại bằng ?name=). */
export function backToMenu(): void {
  location.href = location.pathname;
}

export class PauseMenu {
  private readonly el: HTMLDivElement;
  private shown = false;

  constructor(resume: () => void, quit: () => void) {
    this.el = document.createElement("div");
    this.el.id = "pause";
    this.el.innerHTML = `<div class="panel"><h2>${M.pauseTitle}</h2><button data-a="resume">${M.resume}</button>
      <button data-a="settings">${M.settings}</button><button data-a="quit">${M.quit}</button><div class="share"></div><pre></pre></div>`;
    // app desktop, đang "Tạo server": nhắc địa chỉ cho bạn bè
    this.el.querySelector(".share")!.textContent = hostShare.addrs.length ? M.pauseShare.replace("{0}", hostShare.addrs.join(" · ")) : "";
    this.el.querySelector("pre")!.textContent = STR.clickToControl.split("\n").slice(1).join("\n");
    this.el.querySelector("[data-a=resume]")!.addEventListener("click", resume);
    this.el.querySelector("[data-a=quit]")!.addEventListener("click", quit);
    this.el.querySelector("[data-a=settings]")!.addEventListener("click", () => openSettings());
    this.el.addEventListener("click", (e) => e.target === this.el && resume()); // bấm ra ngoài khung: chơi tiếp
    document.body.appendChild(this.el);
  }

  setVisible(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.style.display = on ? "flex" : "none";
  }
}

/** Mất kết nối: bảng báo + nút về menu chính (tự kết nối lại để Giai đoạn 9b). */
export function showDisconnected(): void {
  if (document.getElementById("disconnected")) return;
  const el = document.createElement("div");
  el.id = "disconnected";
  el.textContent = M.disconnected;
  const b = document.createElement("button");
  b.textContent = M.backToMenu;
  b.addEventListener("click", backToMenu);
  el.appendChild(b);
  document.body.appendChild(el);
  document.exitPointerLock();
}
