// Chạy server game (server/dist) trong tiến trình con: chính file electron.exe ở chế độ Node (ELECTRON_RUN_AS_NODE).
// Thế giới + config.json + nhật ký nằm trong thư mục dữ liệu người dùng (%APPDATA%/Voxel Survival), không ghi vào thư mục cài.
import { spawn, type ChildProcess } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const DEFAULT_PORT = 8080;
const PORT_TRIES = 20; // cổng bận (đang chạy npm run dev...) thì thử cổng kế tiếp
const READY_TIMEOUT_MS = 90_000;
const STOP_TIMEOUT_MS = 30_000; // lưu thế giới lớn có thể lâu
const STATUS_PATH = "/status"; // = NET.STATUS_PATH (shared)

export interface ServerPaths {
  /** Thư mục chứa server/, client/dist, node_modules/ws (bản đóng gói: resources/game). */
  gameDir: string;
  /** Thư mục dữ liệu người dùng. */
  userDir: string;
  /** In log server ra terminal (chạy thử bằng npm run desktop). */
  echo: boolean;
}

export interface RunningServer {
  port: number;
  logFile: string;
  /** Gọi khi server tự thoát (không phải do stop()). */
  onExit: (cb: (code: number | null) => void) => void;
  /** Lưu thế giới rồi tắt. */
  stop: () => Promise<void>;
}

function portFree(port: number): Promise<boolean> {
  return new Promise((done) => {
    const s = createServer();
    s.once("error", () => done(false));
    s.listen(port, () => s.close(() => done(true)));
  });
}

async function pickPort(first: number): Promise<number> {
  for (let p = first; p < first + PORT_TRIES; p++) if (await portFree(p)) return p;
  throw new Error(`Không có cổng trống trong khoảng ${first}–${first + PORT_TRIES - 1}`);
}

/** config.json của người dùng: lần đầu chép từ bản mặc định đi kèm. */
function userConfig(paths: ServerPaths): { file: string; port: number } {
  const file = join(paths.userDir, "config.json");
  if (!existsSync(file)) copyFileSync(join(paths.gameDir, "server", "config.json"), file);
  let port = DEFAULT_PORT;
  try {
    const c = JSON.parse(readFileSync(file, "utf8")) as { port?: unknown };
    if (typeof c.port === "number") port = c.port;
  } catch {
    // config hỏng: server sẽ báo lỗi trong nhật ký
  }
  return { file, port };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function waitReady(port: number, child: ChildProcess): Promise<void> {
  const end = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`Server thoát ngay khi khởi động (mã ${child.exitCode})`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}${STATUS_PATH}`);
      if (r.ok) return;
    } catch {
      // chưa mở cổng
    }
    await sleep(300);
  }
  throw new Error("Server khởi động quá lâu");
}

export async function startServer(paths: ServerPaths): Promise<RunningServer> {
  mkdirSync(paths.userDir, { recursive: true });
  const cfg = userConfig(paths);
  const port = await pickPort(cfg.port);
  const logFile = join(paths.userDir, "server.log");
  const log = createWriteStream(logFile, { flags: "w" });
  const child = spawn(process.execPath, [join(paths.gameDir, "server", "dist", "server", "src", "index.js")], {
    cwd: paths.gameDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      DATA_DIR: join(paths.userDir, "data"),
      CONFIG_FILE: cfg.file,
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    windowsHide: true,
  });
  for (const s of [child.stdout, child.stderr]) {
    s?.on("data", (d: Buffer) => {
      log.write(d);
      if (paths.echo) process.stdout.write(d);
    });
  }

  let stopping = false;
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  try {
    await waitReady(port, child);
  } catch (err) {
    child.kill();
    throw err;
  }
  return {
    port,
    logFile,
    onExit: (cb) => void exited.then((code) => !stopping && cb(code)),
    stop: async () => {
      if (child.exitCode !== null) return;
      stopping = true;
      child.send("shutdown");
      const t = await Promise.race([exited.then(() => "ok"), sleep(STOP_TIMEOUT_MS).then(() => "timeout")]);
      if (t === "timeout") child.kill();
      log.end();
    },
  };
}
