// Giai đoạn 0: mở cổng WebSocket và ghi log khi có kết nối.
import { WebSocketServer } from "ws";
import { NET } from "../../shared/src/index.js";

const port = Number(process.env.PORT ?? NET.DEFAULT_PORT);
const wss = new WebSocketServer({ port });

let nextId = 1;

wss.on("listening", () => {
  console.log(`[server] WebSocket đang lắng nghe ở cổng ${port}`);
});

wss.on("connection", (socket, req) => {
  const id = nextId++;
  const addr = req.socket.remoteAddress ?? "?";
  console.log(`[server] client #${id} kết nối từ ${addr} (tổng ${wss.clients.size})`);

  socket.on("message", (data) => {
    console.log(`[server] client #${id} gửi ${data.toString().length} byte`);
  });

  socket.on("close", () => {
    console.log(`[server] client #${id} ngắt kết nối (còn ${wss.clients.size})`);
  });

  socket.on("error", (err) => {
    console.error(`[server] client #${id} lỗi:`, err.message);
  });
});

wss.on("error", (err) => {
  console.error("[server] lỗi WebSocketServer:", err.message);
});
