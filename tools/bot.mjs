// Người chơi giả để thử multiplayer: vào server bằng tên, gửi phím bấm (5c: đi tới + xoay dần nên đi vòng tròn),
// vung tay, thỉnh thoảng đặt đá cuội cạnh chỗ đứng; hết giờ thì in số gói tin nhận được theo loại.
//   npx tsx tools/bot.mjs [ws://localhost:8080/ws] [số giây = 60] [tên = Bot]
import { NET, PLAYER, binType, encodeInput } from "../shared/src/index.js";

const url = process.argv[2] ?? `ws://localhost:${NET.DEFAULT_PORT}${NET.WS_PATH}`;
const secs = Number(process.argv[3] ?? 60);
const name = process.argv[4] ?? "Bot";
const ws = new WebSocket(url);
ws.binaryType = "arraybuffer";
const seen = {};
const BIN_NAME = { 2: "bin:state", 3: "bin:players" };
let spawn = null, step = 0, swing = 0, seq = 0, yaw = 0;
const t0 = Date.now();
const perSend = Math.round(PLAYER.PHYSICS_HZ / NET.MOVE_HZ);

ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name, password: "bot123", version: NET.PROTOCOL_VERSION }));
ws.onerror = () => console.log("không kết nối được", url);
ws.onmessage = (e) => {
  if (typeof e.data !== "string") {
    const k = BIN_NAME[binType(e.data)] ?? "bin:?";
    seen[k] = (seen[k] ?? 0) + 1;
    return;
  }
  const m = JSON.parse(e.data);
  seen[m.t] = (seen[m.t] ?? 0) + 1;
  if (m.t === "welcome") {
    spawn = m.spawn;
    console.log("vào game:", m.name ?? name, "id", m.id, "spawn", JSON.stringify(m.spawn));
  }
  if (m.t === "reject") console.log("bị từ chối:", m.reason);
};

const timer = setInterval(() => {
  if (!spawn || ws.readyState !== WebSocket.OPEN) return;
  const t = (Date.now() - t0) / 1000;
  if (++step % 15 === 0) swing++;
  // mỗi lần gửi: đúng số bước vật lý của 1/MOVE_HZ giây (gửi nhiều hơn server cũng bỏ)
  const frames = [];
  for (let i = 0; i < perSend; i++) {
    yaw += 0.8 / PLAYER.PHYSICS_HZ;
    frames.push({ forward: 1, strafe: 0, jump: false, sneak: false, sprint: false, yaw, respawn: false, eat: false });
  }
  ws.send(encodeInput({ firstSeq: seq + 1, frames, pitch: -0.3, yaw, swing, fly: null }));
  seq += perSend;
  // mỗi 3 giây: chọn ô hotbar 6 (đá cuội trong bộ đồ thử) và đặt cạnh điểm hồi sinh
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
