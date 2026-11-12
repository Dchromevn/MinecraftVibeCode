// Server (Giai đoạn 5a): một cổng phục vụ cả trang game đã build (client/dist) và WebSocket /ws.
//   npm run dev   — server cổng 8080, client chạy bằng Vite (chuyển tiếp /ws sang đây)
//   npm run host  — build rồi chạy server; mở http://localhost:8080 hoặc chia sẻ bằng npm run share
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { WebSocketServer } from "ws";
import { NET } from "../../shared/src/index.js";
import { findPath, loadConfig } from "./config.js";
import { Game } from "./game.js";

const cfg = loadConfig();
const game = new Game(cfg);
// chạy bằng tsx (server/src) hoặc bản build (server/dist/server/src)
const dist = findPath("../../client/dist", "../../../../client/dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".wasm": "application/wasm",
};

const http = createServer((req, res) => {
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
  if (!(req.url ?? "").startsWith(NET.WS_PATH)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    const conn = { send: (d: string) => ws.readyState === ws.OPEN && ws.send(d), close: () => ws.close() };
    ws.on("message", (data) => game.message(conn, data.toString()));
    ws.on("close", () => game.disconnect(conn));
    ws.on("error", (err) => console.error("[server] lỗi kết nối:", err.message));
  });
});

http.listen(cfg.port, () => {
  console.log(`[server] seed "${cfg.seed}", cổng ${cfg.port}${dist ? `, phục vụ ${dist}` : " (chưa có client/dist)"}`);
  console.log(`[server] điểm hồi sinh ${game.spawn.x.toFixed(0)}, ${game.spawn.y}, ${game.spawn.z.toFixed(0)}${cfg.debug ? " · chế độ thử: bật" : ""}`);
});
game.start();
