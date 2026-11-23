// App desktop (Electron): chạy server game trong máy (gameHost.ts — thế giới đang chọn) rồi mở cửa sổ chơi trỏ tới server đó.
// Trang game nói chuyện với app qua preload.cjs: danh sách thế giới, tạo / xóa / chơi, mở cho mạng LAN ("Tạo server").
import { app, BrowserWindow, Menu, shell } from "electron";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GameHost } from "./gameHost.js";
import { S, waitPage } from "./strings.js";

const here = dirname(fileURLToPath(import.meta.url));
// bản đóng gói: resources/game; chạy thử (npm run desktop): desktop/stage/game
const gameDir = app.isPackaged ? join(process.resourcesPath, "game") : join(here, "..", "game");

let win: BrowserWindow | null = null;
let quitting = false;
let host: GameHost | null = null;

function guardKeysAndLinks(w: BrowserWindow): void {
  w.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      // toàn màn hình kiểu trang web: khớp nút "Toàn màn hình" trong Cài đặt của game
      const js = "document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()";
      void w.webContents.executeJavaScript(js, true).catch(() => w.setFullScreen(!w.isFullScreen()));
      e.preventDefault();
    } else if (input.key === "F12") {
      w.webContents.toggleDevTools();
      e.preventDefault();
    }
  });
  // link ngoài (http/https) mở bằng trình duyệt của máy, không mở cửa sổ mới trong app
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  w.webContents.on("will-navigate", (e, url) => {
    const s = host?.server;
    if (!s || new URL(url).port === String(s.port)) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });
}

/** Đóng cửa sổ / thoát app: lưu thế giới trước rồi mới thoát. */
async function shutdown(): Promise<void> {
  if (quitting) return;
  quitting = true;
  if (win && !win.isDestroyed()) void win.loadURL(waitPage(S.saving));
  try {
    await host?.server?.stop();
  } finally {
    app.exit(0);
  }
}

async function boot(): Promise<void> {
  Menu.setApplicationMenu(null); // bỏ thanh menu (Alt không bật menu giữa trận)
  win = new BrowserWindow({
    width: 1280,
    height: 760,
    title: S.title,
    ...(existsSync(join(here, "icon.png")) ? { icon: join(here, "icon.png") } : {}), // logo khối cỏ
    backgroundColor: "#1b1b1b",
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: join(here, "preload.cjs") },
  });
  guardKeysAndLinks(win);
  win.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    void shutdown();
  });
  void win.loadURL(waitPage(S.starting));

  host = new GameHost({
    gameDir, userDir: app.getPath("userData"), echo: !app.isPackaged, win: () => win,
    onFatal: () => {
      quitting = true;
      app.exit(1);
    },
  });
  host.registerIpc();
  await host.start(host.worlds.last()?.id ?? null); // mở sẵn thế giới chơi gần nhất (chưa có: server không lưu)
  if (host.server && !win.isDestroyed()) await win.loadURL(`http://localhost:${host.server.port}/`);
}

// chỉ một cửa sổ app: hai server cùng ghi một thế giới sẽ hỏng dữ liệu
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.on("before-quit", (e) => {
    if (quitting) return;
    e.preventDefault();
    void shutdown();
  });
  void app.whenReady().then(boot);
}
