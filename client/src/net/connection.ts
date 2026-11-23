// Kết nối WebSocket tới server (đường /ws — Vite chuyển tiếp khi chạy dev). (9a) server chọn ở menu chính: cùng địa chỉ trang
// hoặc link khác (wsUrl).
import { NET, type ClientMsg, type ServerMsg } from "../../../shared/src/index.js";

type Welcome = Extract<ServerMsg, { t: "welcome" }>;

export class Connection {
  private handler: (m: ServerMsg) => void = () => undefined;
  /** Gọi khi mất kết nối. */
  onClose: () => void = () => undefined;

  /** Gói nhị phân (trạng thái người chơi, vị trí người khác — 5c). */
  binHandler: (buf: ArrayBuffer) => void = () => undefined;
  /** Đếm gói / byte (F3). */
  readonly stats = { inPackets: 0, inBytes: 0, outPackets: 0, outBytes: 0 };

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (e) => {
      this.stats.inPackets++;
      if (typeof e.data === "string") {
        this.stats.inBytes += e.data.length;
        this.handler(JSON.parse(e.data) as ServerMsg);
      } else {
        this.stats.inBytes += (e.data as ArrayBuffer).byteLength;
        this.binHandler(e.data as ArrayBuffer);
      }
    });
    ws.addEventListener("close", () => this.onClose());
  }

  /** Mở kết nối, gửi tên + mật khẩu; trả về kết nối + gói welcome, hoặc ném lỗi (mã lý do: taken, name, version, password, pwshort, connect). */
  static open(url: string, name: string, password: string): Promise<{ conn: Connection; welcome: Welcome; early: ServerMsg[] }> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        return reject(new Error("connect")); // link sai / trang https mở ws://
      }
      ws.binaryType = "arraybuffer";
      const early: ServerMsg[] = []; // gói đến ngay sau welcome (trước khi game gắn bộ xử lý)
      let welcome: Welcome | null = null;
      ws.addEventListener("open", () => ws.send(JSON.stringify({ t: "hello", name, password, version: NET.PROTOCOL_VERSION } satisfies ClientMsg)));
      ws.addEventListener("error", () => reject(new Error("connect")));
      ws.addEventListener("close", () => reject(new Error("connect")));
      const first = (e: MessageEvent): void => {
        if (typeof e.data !== "string") return; // gói nhị phân trước welcome: bỏ
        const m = JSON.parse(e.data) as ServerMsg;
        if (m.t === "reject") return reject(new Error(m.reason));
        if (m.t !== "welcome") {
          early.push(m);
          return;
        }
        welcome = m;
        ws.removeEventListener("message", first);
        const conn = new Connection(ws);
        conn.handler = (msg) => early.push(msg);
        resolve({ conn, welcome, early });
      };
      ws.addEventListener("message", first);
    });
  }

  send(m: ClientMsg): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    const d = JSON.stringify(m);
    this.stats.outPackets++;
    this.stats.outBytes += d.length;
    this.ws.send(d);
  }

  /** (9a) Chủ động đóng (thoát về menu chính): không báo mất kết nối. */
  close(): void {
    this.onClose = () => undefined;
    this.ws.close();
  }

  /** Gửi gói nhị phân (phím bấm). */
  sendBin(buf: ArrayBuffer): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.stats.outPackets++;
    this.stats.outBytes += buf.byteLength;
    this.ws.send(buf);
  }

  /** Gắn bộ xử lý gói tin (xử lý luôn các gói đã đến trước đó). */
  listen(h: (m: ServerMsg) => void, early: ServerMsg[]): void {
    this.handler = h;
    for (const m of early.splice(0)) h(m);
  }
}
