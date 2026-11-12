// Người chơi giả để thử multiplayer: vào server bằng tên, đi vòng tròn trước điểm hồi sinh, vung tay,
// thỉnh thoảng đặt đá cuội cạnh chỗ đứng; hết giờ thì in số gói tin nhận được theo loại.
//   npx tsx tools/bot.mjs [ws://localhost:8080/ws] [số giây = 60] [tên = Bot]
import { NET } from "../shared/src/constants.js";

const url = process.argv[2] ?? `ws://localhost:${NET.DEFAULT_PORT}${NET.WS_PATH}`;
const secs = Number(process.argv[3] ?? 60);
const name = process.argv[4] ?? "Bot";
const ws = new WebSocket(url);
const seen = {};
let spawn = null, step = 0, swing = 0;
const t0 = Date.now();

ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name, version: NET.PROTOCOL_VERSION }));
ws.onerror = () => console.log("không kết nối được", url);
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  seen[m.t] = (seen[m.t] ?? 0) + 1;
  if (m.t === "welcome") {
    spawn = m.spawn;
    console.log("vào game:", JSON.stringify(m));
  }
  if (m.t === "reject") console.log("bị từ chối:", m.reason);
};

const timer = setInterval(() => {
  if (!spawn || ws.readyState !== WebSocket.OPEN) return;
  const t = (Date.now() - t0) / 1000;
  const x = spawn.x + Math.sin(t * 0.8) * 2, z = spawn.z - 5 + Math.cos(t * 0.8) * 2;
  if (++step % 15 === 0) swing++;
  ws.send(JSON.stringify({ t: "move", x, y: spawn.y, z, yaw: t * 0.8, pitch: -0.3, flying: false, sneaking: false, swing, health: 20, dead: false }));
  // mỗi 3 giây: chọn ô hotbar 6 (đá cuội trong bộ đồ thử) và đặt cạnh chỗ đứng
  if (step % 60 === 20) {
    ws.send(JSON.stringify({ t: "inv", seq: step, a: { t: "select", n: 6 } }));
    const hit = { x: Math.floor(spawn.x) + 3, y: Math.floor(spawn.y) - 1, z: Math.floor(spawn.z) - 5, nx: 0, ny: 1, nz: 0 };
    ws.send(JSON.stringify({ t: "use", hit, src: null, sneaking: false, yaw: 0 }));
  }
  if (t > secs) {
    clearInterval(timer);
    console.log("gói đã nhận:", JSON.stringify(seen));
    ws.close();
  }
}, 1000 / NET.MOVE_HZ);
