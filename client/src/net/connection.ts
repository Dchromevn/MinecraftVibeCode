// Kết nối WebSocket tới server (cùng địa chỉ trang, đường /ws — Vite chuyển tiếp khi chạy dev).
import { NET, type ClientMsg, type ServerMsg } from "../../../shared/src/index.js";

type Welcome = Extract<ServerMsg, { t: "welcome" }>;

export class Connection {
  private handler: (m: ServerMsg) => void = () => undefined;
  /** Gọi khi mất kết nối. */
  onClose: () => void = () => undefined;

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (e) => this.handler(JSON.parse(String(e.data)) as ServerMsg));
    ws.addEventListener("close", () => this.onClose());
  }

  /** Mở kết nối, gửi tên; trả về kết nối + gói welcome, hoặc ném lỗi (mã lý do: taken, name, version, connect). */
  static open(name: string): Promise<{ conn: Connection; welcome: Welcome; early: ServerMsg[] }> {
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${NET.WS_PATH}`;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const early: ServerMsg[] = []; // gói đến ngay sau welcome (trước khi game gắn bộ xử lý)
      let welcome: Welcome | null = null;
      ws.addEventListener("open", () => ws.send(JSON.stringify({ t: "hello", name, version: NET.PROTOCOL_VERSION } satisfies ClientMsg)));
      ws.addEventListener("error", () => reject(new Error("connect")));
      ws.addEventListener("close", () => reject(new Error("connect")));
      const first = (e: MessageEvent): void => {
        const m = JSON.parse(String(e.data)) as ServerMsg;
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
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Gắn bộ xử lý gói tin (xử lý luôn các gói đã đến trước đó). */
  listen(h: (m: ServerMsg) => void, early: ServerMsg[]): void {
    this.handler = h;
    for (const m of early.splice(0)) h(m);
  }
}
