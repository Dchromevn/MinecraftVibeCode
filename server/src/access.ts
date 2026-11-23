// Ai được vào server. App desktop (ACCESS=local): "Chơi một mình" — chỉ máy này (địa chỉ loopback); "Tạo server" — mở cho máy
// khác (LAN / VPN). Chạy bằng npm run dev / host thì luôn mở như trước.
import type { WebSocket } from "ws";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const isLocal = (addr: string | undefined): boolean => LOOPBACK.has(addr ?? "");

export class Access {
  private open: boolean;
  /** Kết nối từ máy khác: đóng hết khi chuyển về "chỉ máy này". */
  private readonly remote = new Set<WebSocket>();

  constructor(localOnly: boolean) {
    this.open = !localOnly;
  }

  allowed(addr: string | undefined): boolean {
    return this.open || isLocal(addr);
  }

  track(ws: WebSocket, addr: string | undefined): void {
    if (isLocal(addr)) return;
    this.remote.add(ws);
    ws.on("close", () => this.remote.delete(ws));
  }

  setOpen(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    console.log(open ? "[server] mở cho máy khác vào (Tạo server)" : "[server] chỉ máy này vào được (Chơi một mình)");
    if (!open) for (const ws of this.remote) ws.close();
  }
}

/** Gói IPC từ app desktop: { t: "lan", open }. */
export function lanMessage(m: unknown): boolean | null {
  if (typeof m !== "object" || m === null) return null;
  const o = m as { t?: unknown; open?: unknown };
  return o.t === "lan" ? o.open === true : null;
}
