// Màn hình đầu của app desktop: Chơi một mình (danh sách thế giới) / Chơi nhiều người (Tạo server: danh sách server của bạn —
// tách khỏi thế giới chơi một mình · Vào server của người khác) / Cài đặt / Thoát. Chủ máy vào bằng mã chủ máy, không cần mật khẩu.
// Chọn thế giới khác thế giới server đang chạy: app lưu, chạy lại server rồi tải lại trang với ?play=solo|host (vào luôn) —
// xóa thế giới đang chạy thì ?screen=solo|server (về danh sách).
import { STR } from "../strings.js";
import { STR_MENU as M } from "../stringsMenu.js";
import { applyMenuBackground, drawLogo, loadStone } from "../ui/menuBackground.js";
import { openSettings } from "../ui/settingsScreen.js";
import { Connection } from "./connection.js";
import { hostShare, type DesktopApi, type WorldInfo, type WorldKind } from "./desktop.js";
import { joinGame, rememberedName } from "./joinScreen.js";
import { wsUrl } from "./serverList.js";
import { showWorldList } from "./worldList.js";

type Joined = Awaited<ReturnType<typeof Connection.open>>;

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const choice = (a: string, label: string, hint: string): string =>
  `<button class="big" data-a="${a}">${label}</button><div class="hint">${hint}</div>`;

export function startDesktop(api: DesktopApi, params: URLSearchParams): Promise<Joined> {
  return new Promise((resolve) => {
    const box = document.createElement("div");
    box.id = "join";
    applyMenuBackground(box);
    document.body.appendChild(box);
    const stone = loadStone();
    const splash = M.splashes[Math.floor(Math.random() * M.splashes.length)] ?? "";

    const render = (html: string, acts: Record<string, () => void>, panel = true): void => {
      box.innerHTML = panel ? `<div class="panel menu">${html}</div>` : html;
      box.querySelectorAll<HTMLButtonElement>("[data-a]").forEach((b) => b.addEventListener("click", () => acts[b.dataset.a!]?.()));
    };

    /** Màn hình mở đầu: logo + dòng chữ vàng + nút lớn, phiên bản ở góc. */
    const home = (): void => {
      render(`<div class="title"><div class="logo"><div class="splash"></div></div>
        <button class="tbtn" data-a="solo">${M.solo}</button><button class="tbtn" data-a="multi">${M.multi}</button>
        <div class="trow"><button class="tbtn" data-a="settings">${M.settings}</button><button class="tbtn" data-a="quit">${M.quitGame}</button></div>
        </div><div class="ver"></div>`, { solo: () => worlds("solo"), multi, settings: () => openSettings(), quit: () => window.close() }, false);
      box.querySelector(".splash")!.textContent = splash;
      box.querySelector(".ver")!.textContent = M.version.replace("{0}", __APP_VERSION__);
      void stone.then((img) => box.querySelector(".logo")?.prepend(drawLogo(STR.title, 8, img)));
    };

    function multi(): void {
      render(`<h2>${M.multi}</h2>${choice("host", M.host, M.hostHint)}${choice("other", M.joinOther, M.joinOtherHint)}
        <button data-a="back">${M.back}</button>`, {
        host: () => worlds("server"),
        other: () => {
          void api.setLan(false);
          box.remove();
          void joinGame(params, { showThis: false, onBack: () => (document.body.appendChild(box), multi()) }).then(resolve);
        },
        back: home,
      });
    }

    /** Danh sách thế giới (solo) / server của bạn (server). */
    const worlds = (kind: WorldKind): void =>
      void showWorldList({ api, kind, box, render, onPlay: (w, name) => void play(w, kind === "server", name), onBack: kind === "solo" ? home : multi });

    /** Thông báo + nút quay lại (đang mở / đang vào / lỗi). */
    const status = (text: string, back: () => void): void => render(`<h2>${M.opening}</h2><div class="msg">${esc(text)}</div>
      <button data-a="back">${M.back}</button>`, { back });

    async function play(w: WorldInfo, lan: boolean, name: string): Promise<void> {
      status(M.opening, home);
      const r = await api.play(w.id, lan);
      if (!r) return status(STR.joinErrors.connect ?? "", home);
      if (r.reload) return; // app đổi thế giới rồi tải lại trang với ?play=
      if (lan) share(r.addrs);
      else enter(name, false);
    }

    /** "Tạo server" đã mở: địa chỉ gửi bạn bè + vào thế giới / đóng server. */
    function share(addrs: string[]): void {
      const list = addrs.length
        ? addrs.map((a) => `<div class="addr"><b>${esc(a)}</b><button data-a="copy" data-v="${esc(a)}">${M.copy}</button></div>`).join("")
        : `<div class="err">${M.shareNone}</div>`;
      render(`<h2>${M.serverOpen}</h2><div class="sub">${M.shareTitle}</div>${list}<div class="tip">${M.shareTip}</div>
        <button class="big" data-a="enter">${M.enterWorld}</button><button data-a="close">${M.closeServer}</button>`, {
        enter: () => enter(rememberedName(), true, addrs),
        close: () => void api.setLan(false).then(multi),
      });
      box.querySelectorAll<HTMLButtonElement>("[data-a=copy]").forEach((b) => b.addEventListener("click", () => {
        void navigator.clipboard?.writeText(b.dataset.v ?? "").then(() => (b.textContent = M.copied));
      }));
    }

    /** Vào thế giới trên máy (server app đang chạy) bằng mã chủ máy. */
    async function enter(name: string, lan: boolean, addrs: string[] = []): Promise<void> {
      const back = lan ? () => share(addrs) : home;
      status(STR.joinConnecting, back);
      const info = await api.info();
      if (!info || !/^[A-Za-z0-9_]+$/.test(name)) return status(STR.joinErrors[info ? "name" : "connect"] ?? "", back);
      Connection.open(wsUrl(""), name, info.ownerToken).then(
        (r) => {
          hostShare.addrs = lan ? addrs : [];
          box.remove();
          resolve(r);
        },
        (e: unknown) => status(STR.joinErrors[e instanceof Error ? e.message : "connect"] ?? STR.joinErrors.connect ?? "", back),
      );
    }

    // sau khi app đổi thế giới / xóa thế giới đang chạy: làm tiếp
    const next = params.get("play"), screen = params.get("screen");
    history.replaceState(null, "", location.pathname); // bỏ ?play= (tải lại / về menu không vào lại)
    if (next === "solo") void enter(rememberedName(), false);
    else if (next === "host") void api.setLan(true).then(share);
    else if (screen === "solo" || screen === "server") worlds(screen);
    else home();
  });
}
