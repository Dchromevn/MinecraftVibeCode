// Server (Giai đoạn 5a): một cổng phục vụ cả trang game đã build (client/dist) và WebSocket /ws.
//   npm run dev   — server cổng 8080, client chạy bằng Vite (chuyển tiếp /ws sang đây)
//   npm run host  — build rồi chạy server; mở http://localhost:8080 hoặc chia sẻ bằng npm run share
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { WebSocketServer } from "ws";
import { NET } from "../../shared/src/index.js";
import { Access, lanMessage } from "./access.js";
import { findPath, loadConfig } from "./config.js";
import { Game } from "./game.js";
import { GenPool } from "./genPool.js";

const cfg = loadConfig();
// giả lập mạng (5c, F3): FAKE_LAG_MS = ping tăng thêm (mỗi chiều trễ một nửa); FAKE_LOSS_PCT = % gói nhị phân bị mất
const LAG = Math.max(0, Number(process.env.FAKE_LAG_MS ?? 0)) / 2;
const LOSS = Math.min(90, Math.max(0, Number(process.env.FAKE_LOSS_PCT ?? 0))) / 100;
if (LAG || LOSS) console.log(`[server] giả lập mạng: ping +${LAG * 2} ms, mất ${LOSS * 100}% gói nhị phân`);
const game = new Game(cfg);
const pool = new GenPool(game.seed, NET.GEN_WORKERS); // sinh chunk / ánh sáng ở luồng phụ: luồng chính không đứng hình (ping ổn định)
for (const r of game.realms) r.w.pool = pool; // (10a) dùng chung cho cả hai cõi (việc sinh mang theo cõi)
game.customs.syncWorkers(); // (8a) nhà tự lưu cho luồng sinh chunk
// chạy bằng tsx (server/src) hoặc bản build (server/dist/server/src)
const dist = findPath("../../client/dist", "../../../../client/dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".wasm": "application/wasm",
};

const access = new Access(!!cfg.localOnly);

const http = createServer((req, res) => {
  if (!access.allowed(req.socket.remoteAddress)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if ((req.url ?? "").split("?")[0] === NET.STATUS_PATH) {
    // (9a) trạng thái cho danh sách server ở menu chính (trang ở địa chỉ khác cũng đọc được)
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ version: NET.PROTOCOL_VERSION, players: game.online().length }));
    return;
  }
  if (!dist) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server đang chạy. Chưa có bản build của client: chạy npm run host (hoặc dùng npm run dev rồi mở cổng 5173).");
    return;
  }
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]!);
  let file = normalize(join(dist, url));
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ noServer: true });
http.on("upgrade", (req, socket, head) => {
  if (!(req.url ?? "").startsWith(NET.WS_PATH) || !access.allowed(req.socket.remoteAddress)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    access.track(ws, req.socket.remoteAddress);
    const out = (d: string | ArrayBuffer): void => void (ws.readyState === ws.OPEN && ws.send(d));
    const conn = {
      send: (d: string | ArrayBuffer): void => {
        if (typeof d !== "string" && LOSS > 0 && Math.random() < LOSS) return; // giả lập mất gói (chỉ gói nhị phân thường xuyên)
        if (LAG > 0) setTimeout(() => out(d), LAG);
        else out(d);
      },
      close: () => ws.close(),
    };
    ws.on("message", (data, isBinary) => {
      const buf = data as Buffer;
      const msg: string | ArrayBuffer = isBinary ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer : buf.toString();
      if (typeof msg !== "string" && LOSS > 0 && Math.random() < LOSS) return;
      if (LAG > 0) setTimeout(() => game.message(conn, msg), LAG);
      else game.message(conn, msg);
    });
    ws.on("close", () => game.disconnect(conn));
    ws.on("error", (err) => console.error("[server] lỗi kết nối:", err.message));
  });
});

http.listen(cfg.port, () => {
  console.log(`[server] thế giới "${cfg.world}", seed "${game.seedText}", cổng ${cfg.port}${dist ? `, phục vụ ${dist}` : " (chưa có client/dist)"}`);
  console.log(`[server] điểm hồi sinh ${game.spawn.x.toFixed(0)}, ${game.spawn.y}, ${game.spawn.z.toFixed(0)}${cfg.debug ? " · chế độ thử: bật" : ""}`);
  console.log(`[server] lưu tại ${game.storage.dir ?? "(không lưu)"} · bật sẵn chế độ quản trị: ${cfg.admins.length ? cfg.admins.join(", ") : "không ai"} (ai cũng gõ /admin được)`);
});
game.start();

// tắt server (Ctrl+C, npm run dev khởi động lại khi sửa code): lưu hết rồi mới thoát
let stopping = false;
function stop(): void {
  if (stopping) return;
  stopping = true;
  try {
    game.saveAll();
    console.log("[server] đã lưu thế giới, tắt server");
  } catch (err) {
    console.error("[server] lỗi khi lưu:", err);
  }
  process.exit(0);
}
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"] as const) process.on(sig, stop);
// app desktop qua kênh IPC: tắt (Windows không có tín hiệu tắt êm cho tiến trình con); mở / đóng cho máy khác
process.on("message", (m) => {
  if (m === "shutdown") return stop();
  const lan = lanMessage(m);
  if (lan !== null) access.setOpen(lan);
});
