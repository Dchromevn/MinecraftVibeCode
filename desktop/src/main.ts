// App desktop (Electron): khởi động server game trong máy rồi mở cửa sổ chơi trỏ tới server đó.
// Bạn bè vẫn vào được qua mạng LAN / npm run share như bản web (server nghe mọi địa chỉ).
import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, type RunningServer } from "./serverProcess.js";
import { S, waitPage } from "./strings.js";

const here = dirname(fileURLToPath(import.meta.url));
// bản đóng gói: resources/game; chạy thử (npm run desktop): desktop/stage/game
const gameDir = app.isPackaged ? join(process.resourcesPath, "game") : join(here, "..", "game");

let win: BrowserWindow | null = null;
let server: RunningServer | null = null;
let quitting = false;

function guardKeysAndLinks(w: BrowserWindow): void {
  w.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      w.setFullScreen(!w.isFullScreen());
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
    if (!server || new URL(url).port === String(server.port)) return;
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
    await server?.stop();
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
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  guardKeysAndLinks(win);
  win.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    void shutdown();
  });
  void win.loadURL(waitPage(S.starting));

  const userDir = app.getPath("userData");
  try {
    server = await startServer({ gameDir, userDir, echo: !app.isPackaged });
  } catch (err) {
    dialog.showErrorBox(S.failTitle, S.failBody(err instanceof Error ? err.message : String(err), join(userDir, "server.log")));
    app.exit(1);
    return;
  }
  const s = server;
  s.onExit((code) => {
    dialog.showErrorBox(S.crashTitle, S.crashBody(code, s.logFile));
    quitting = true;
    app.exit(1);
  });
  if (!win.isDestroyed()) await win.loadURL(`http://localhost:${s.port}/`);
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
