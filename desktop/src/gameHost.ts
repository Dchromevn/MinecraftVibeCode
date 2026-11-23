// Server game của app desktop: chạy thế giới đang chọn; đổi thế giới = lưu + tắt server cũ, chạy thế giới mới trên cùng cổng
// rồi tải lại trang game (kèm ?play= / ?screen= để trang làm tiếp). Trả lời trang game qua IPC (preload.cjs): mã chủ máy,
// mở cho mạng LAN, danh sách thế giới / tạo / xóa / chơi.
import { dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { lanAddresses } from "./lan.js";
import { startServer, type RunningServer } from "./serverProcess.js";
import { S, waitPage } from "./strings.js";
import { Worlds, type WorldKind } from "./worlds.js";

interface HostOptions {
  gameDir: string;
  userDir: string;
  echo: boolean;
  win: () => BrowserWindow | null;
  /** Server chết / không khởi động được: app thoát. */
  onFatal: () => void;
}

const kindOf = (k: unknown): WorldKind => (k === "server" ? "server" : "solo");
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export class GameHost {
  server: RunningServer | null = null;
  /** Thế giới server đang chạy (null = chưa chọn, server không lưu). */
  current: string | null = null;
  readonly worlds: Worlds;
  /** Mã chủ máy (mỗi lần mở app một mã): trang game của app gửi thay mật khẩu khi vào thế giới của mình. */
  private readonly ownerToken = randomBytes(24).toString("hex");

  constructor(private readonly o: HostOptions) {
    this.worlds = new Worlds(o.userDir);
  }

  async start(id: string | null, port?: number): Promise<void> {
    const w = id ? this.worlds.get(id) : null;
    let s: RunningServer;
    try {
      s = await startServer({ gameDir: this.o.gameDir, userDir: this.o.userDir, echo: this.o.echo, ownerToken: this.ownerToken,
        world: w ? { id: w.id, seed: w.seed } : null, port });
    } catch (err) {
      dialog.showErrorBox(S.failTitle, S.failBody(err instanceof Error ? err.message : String(err), join(this.o.userDir, "server.log")));
      return this.o.onFatal();
    }
    this.server = s;
    this.current = w?.id ?? null;
    s.onExit((code) => {
      if (this.server !== s) return;
      dialog.showErrorBox(S.crashTitle, S.crashBody(code, s.logFile));
      this.o.onFatal();
    });
  }

  /** Đổi thế giới rồi tải lại trang game với query (trang đọc để vào luôn / quay về danh sách). between: chạy khi server cũ đã tắt. */
  private async switchTo(id: string | null, query: string, between?: () => Promise<void>): Promise<void> {
    const port = this.server?.port, win = this.o.win();
    if (win && !win.isDestroyed()) void win.loadURL(waitPage(id ? S.opening : S.starting));
    const old = this.server;
    this.server = null;
    await old?.stop();
    await between?.();
    await this.start(id, port);
    const now = this.server as RunningServer | null; // start() vừa gán lại
    if (now && win && !win.isDestroyed()) await win.loadURL(`http://localhost:${now.port}/?${query}`);
  }

  /** Chỉ trả lời trang game của chính app (http://localhost:<cổng server>). */
  private fromGame(e: IpcMainInvokeEvent): boolean {
    if (!this.server) return false;
    try {
      const u = new URL(e.senderFrame?.url ?? "");
      return u.hostname === "localhost" && u.port === String(this.server.port);
    } catch {
      return false;
    }
  }

  registerIpc(): void {
    const on = (ch: string, f: (arg: Record<string, unknown>) => unknown): void =>
      void ipcMain.handle(ch, (e, arg: unknown) => (this.fromGame(e) ? f((arg ?? {}) as Record<string, unknown>) : null));
    on("voxel:info", () => ({ ownerToken: this.ownerToken, port: this.server!.port, world: this.current }));
    on("voxel:lan", (a) => {
      const open = a.open === true;
      this.server!.setLan(open);
      return open ? lanAddresses(this.server!.port) : [];
    });
    on("voxel:worlds", (a) => this.worlds.list(kindOf(a.kind)));
    on("voxel:createWorld", (a) => this.worlds.create(kindOf(a.kind), str(a.name), str(a.seed)));
    on("voxel:deleteWorld", async (a) => {
      const w = this.worlds.get(str(a.id));
      if (!w) return false;
      // đang chạy thế giới này: tắt server rồi mới xóa (server không ghi lại thư mục), trang quay về danh sách
      if (w.id === this.current) await this.switchTo(null, `screen=${w.kind}`, () => this.worlds.remove(w.id));
      else await this.worlds.remove(w.id);
      return true;
    });
    on("voxel:play", (a) => {
      const w = this.worlds.get(str(a.id)), lan = a.lan === true;
      if (!w) return null;
      this.worlds.touch(w.id);
      if (w.id === this.current) {
        this.server!.setLan(lan);
        return { reload: false, addrs: lan ? lanAddresses(this.server!.port) : [] };
      }
      void this.switchTo(w.id, `play=${lan ? "host" : "solo"}`); // trang sẽ được tải lại
      return { reload: true, addrs: [] };
    });
  }
}
