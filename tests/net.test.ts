// Kiểm tra 5c: server tự tính di chuyển từ phím bấm — client đoán trước ra đúng trạng thái server; gửi dồn phím
// không chạy nhanh hơn được; người thường gửi "đang bay" bị bỏ qua; đào phải đủ thời gian; hồi sinh / ăn đi theo
// bước vật lý; gói nhị phân mã hóa / giải mã đúng.
import {
  B, BIN, COMBAT, NET, binType, isFullSolid, createPlayer, decodeInput, decodeState, encodeState, type PlayerState, type ServerMsg,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import type { ServerPlayer } from "../server/src/player.js";
import { Prediction } from "../client/src/player/prediction.js";
import { check } from "./harness.js";
import { fakeConn, flyPacket, frame, inputPacket, standAt } from "./netHelpers.js";

// "boss" là quản trị viên, "lan" là người thường
const game = new Game({ seed: "mang", port: 0, spawn: "fixed", debug: true, world: "n", admins: ["boss"], dataDir: null });
let now = 0;
game.movement.clock = () => now; // đồng hồ giả: số bước được chạy không phụ thuộc tốc độ máy chạy test
const lan = fakeConn(), boss = fakeConn();
const hello = (f: ReturnType<typeof fakeConn>, name: string): void =>
  game.message(f.conn, JSON.stringify({ t: "hello", name, password: "matkhau1", version: NET.PROTOCOL_VERSION }));
hello(lan, "lan");
hello(boss, "boss");
const send = (f: ReturnType<typeof fakeConn>, m: object): void => game.message(f.conn, JSON.stringify(m));
const P = (name: string): ServerPlayer => game.online().find((p) => p.name === name)!;
const sp = game.spawn, X = Math.floor(sp.x), Z = Math.floor(sp.z);
const cx = X >> 4, cz = Z >> 4, add: number[] = [];
for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) add.push(cx + dx, cz + dz);
send(lan, { t: "sub", add, remove: [] });
for (let i = 0; i < 40; i++) game.tick();
const lp = P("lan");
standAt(lp, sp.x, sp.y, sp.z);
for (let i = 0; i < 40; i++) game.tick();
now += 2000; // 2 giây: nạp đầy số bước được chạy
const lastState = (f: ReturnType<typeof fakeConn>) => {
  for (let i = f.bins.length - 1; i >= 0; i--) if (binType(f.bins[i]!) === BIN.STATE) return decodeState(f.bins[i]!);
  return null;
};

// ---- gói nhị phân ----
{
  const pkt = decodeInput(inputPacket(7, [frame({ forward: 1, jump: true, yaw: 1.25 }), frame({ strafe: -1, sneak: true, eat: true })], -0.5));
  const st = createPlayer(1.5, 70.25, -3.75);
  st.health = 13.5;
  st.onGround = true;
  const back = decodeState(encodeState(42, st));
  check("gói phím bấm mã hóa / giải mã đúng",
    !!pkt && pkt.firstSeq === 7 && pkt.frames.length === 2 && pkt.frames[0]!.jump && pkt.frames[0]!.yaw === 1.25 &&
    pkt.frames[1]!.strafe === -1 && pkt.frames[1]!.sneak && pkt.frames[1]!.eat && !pkt.fly && pkt.pitch === -0.5);
  check("gói trạng thái mã hóa / giải mã đúng", !!back && back.seq === 42 && back.state.x === 1.5 && back.state.health === 13.5 && back.state.onGround);
  check("gói hỏng bị bỏ", decodeInput(new ArrayBuffer(5)) === null && decodeState(new ArrayBuffer(3)) === null);
}

// ---- đoán trước khớp server ----
{
  const pred = new Prediction((x, y, z) => game.w.getCell(x, y, z));
  const mine: PlayerState = { ...lp.state };
  const frames = [];
  for (let i = 0; i < 40; i++) {
    const f = frame({ forward: 1, sprint: i > 5, jump: i % 13 === 0, yaw: 0.3 + i * 0.01 });
    pred.step(mine, f);
    frames.push({ ...f, yaw: Math.fround(f.yaw) });
  }
  game.message(lan.conn, inputPacket(1, frames));
  game.tick();
  const st = lastState(lan);
  const moved = Math.hypot(mine.x - sp.x, mine.z - sp.z);
  check("server chạy đúng các bước client gửi (đoán trước khớp, không phải sửa)",
    !!st && st.seq === 40 && moved > 1 && pred.reconcile(st.seq, st.state) === null, `đi ${moved.toFixed(2)} ô`);
  // gửi lại gói cũ (mất gói, gửi trùng): server không chạy lại
  const x0 = lp.state.x;
  game.message(lan.conn, inputPacket(1, frames));
  check("bước trùng / cũ không chạy lại", lp.state.x === x0 && lp.lastSeq === 40);
}

// ---- chống chạy nhanh: gửi dồn quá nhiều bước ----
{
  standAt(lp, sp.x, sp.y + 60, sp.z); // trên cao: 200 bước rơi xa hơn hẳn 60 bước
  lp.budget = 30;
  lp.budgetAt = now;
  const cell = (x: number, y: number, z: number): number => game.w.getCell(x, y, z);
  const pred = new Prediction(cell), ref = new Prediction(cell);
  const mine: PlayerState = { ...lp.state }, allowed: PlayerState = { ...lp.state };
  const budget = Math.floor(lp.budget);
  const frames = [];
  for (let i = 0; i < 200; i++) {
    const f = frame({ forward: 1, sprint: true, yaw: 0 });
    pred.step(mine, f);
    if (i < budget) ref.step(allowed, f);
    frames.push(f);
  }
  game.message(lan.conn, inputPacket(41, frames));
  check("gửi 200 bước cùng lúc: server chỉ chạy số bước được phép",
    budget === 30 && lp.state.x === allowed.x && lp.state.y === allowed.y && lp.state.y > mine.y + 1,
    `${budget} bước, server y ${lp.state.y.toFixed(2)} / client y ${mine.y.toFixed(2)}`);
  game.tick();
  const st = lastState(lan)!;
  check("client gian lận bị server sửa lại vị trí", pred.reconcile(st.seq, st.state) !== null);
  // đi bộ 2 phút, đồng hồ client nhanh hơn server 1,5%, gói tới lệch nhịp: không bước nào bị bỏ (server khớp
  // đúng client đoán trước — bỏ một bước là lệch vị trí)
  standAt(lp, sp.x, sp.y, sp.z);
  lp.budget = NET.INPUT_BURST;
  lp.budgetAt = now;
  const walker = new Prediction(cell), me: PlayerState = { ...lp.state };
  let seq = lp.lastSeq + 1;
  for (let t = 0; t < 2400; t++) {
    now += 50 / 1.015 + (t % 7 === 0 ? 40 : t % 7 === 1 ? -40 : 0); // gói dồn cục / tới sớm
    const fs = [0, 1, 2].map((i) => frame({ forward: 1, yaw: Math.fround(((t * 3 + i) % 900) * 0.007) })); // đi vòng
    for (const f of fs) walker.step(me, f);
    game.message(lan.conn, inputPacket(seq, fs));
    seq += 3;
  }
  check("đồng hồ client nhanh 1,5%, gói lệch nhịp: không bước nào bị bỏ (server khớp client)",
    lp.state.x === me.x && lp.state.z === me.z && Math.hypot(me.x - sp.x, me.z - sp.z) > 1,
    `server ${lp.state.x.toFixed(3)},${lp.state.z.toFixed(3)} / client ${me.x.toFixed(3)},${me.z.toFixed(3)}`);
  lp.reset(sp.x, sp.y, sp.z); // đi vòng 2 phút có thể đã chết đuối
  lp.deathHandled = false;
}

// ---- bay: chỉ quản trị viên ----
{
  standAt(lp, sp.x, sp.y, sp.z);
  const y0 = lp.state.y;
  game.message(lan.conn, flyPacket(sp.x + 30, sp.y + 50, sp.z));
  check("người thường gửi \"đang bay\": bỏ qua", lp.state.y === y0 && lp.state.x === sp.x && !lp.flying);
  game.message(boss.conn, flyPacket(sp.x + 3, sp.y + 20, sp.z));
  const bp = P("boss");
  check("quản trị viên bay: server nhận vị trí", bp.flying && bp.state.y === sp.y + 20 && bp.admin);
}

// ---- đào phải đủ thời gian (ngoài vùng an toàn quanh điểm hồi sinh — 6a) ----
{
  const X = Math.floor(sp.x) + COMBAT.SAFE_ZONE_RADIUS + 4;
  let y = 120;
  while (!isFullSolid(game.w.getCell(X, y, Z) & 255) && y > 0) y--;
  standAt(lp, X + 0.5, y + 1, Z + 0.5);
  lp.state.onGround = true; // đứng trên đất (trên không: đào chậm gấp 5)
  lp.state.headInWater = false;
  lp.inv.selected = 8;
  lp.inv.main[8] = null; // tay không
  const id0 = game.w.getCell(X, y, Z) & 255;
  const realNow = Date.now;
  let fake = realNow();
  Date.now = () => fake;
  try {
    lan.msgs.length = 0;
    send(lan, { t: "dig", x: X, y, z: Z });
    const noStart = (game.w.getCell(X, y, Z) & 255) === id0 && lan.msgs.some((m) => m.t === "blocks");
    send(lan, { t: "digStart", x: X, y, z: Z });
    fake += 50;
    send(lan, { t: "dig", x: X, y, z: Z });
    const tooFast = (game.w.getCell(X, y, Z) & 255) === id0;
    send(lan, { t: "digStart", x: X, y, z: Z });
    fake += 20000;
    send(lan, { t: "dig", x: X, y, z: Z });
    const ok = (game.w.getCell(X, y, Z) & 255) === B.AIR;
    check("đào không báo bắt đầu: bị từ chối, server gửi lại block", noStart);
    check("đào quá nhanh (50 ms): bị từ chối", tooFast);
    check("đào đủ thời gian: phá được", ok, `block ${id0}`);
  } finally {
    Date.now = realNow;
  }
}

// ---- hồi sinh, ăn đi theo bước vật lý ----
{
  standAt(lp, sp.x + 5, sp.y + 30, sp.z + 5);
  Object.assign(lp.state, { health: 0, dead: true });
  lp.deathHandled = true;
  let seq = lp.lastSeq + 1;
  game.message(lan.conn, inputPacket(seq++, [frame({ respawn: true })]));
  check("hồi sinh: về điểm hồi sinh, đầy máu",
    !lp.state.dead && lp.state.health === 20 && Math.abs(lp.state.x - sp.x) < 1 && Math.abs(lp.state.z - sp.z) < 1);
  lp.inv.main[8] = { item: "apple", count: 2, damage: 0 };
  lp.state.hunger = 10;
  game.message(lan.conn, inputPacket(seq++, [frame({ eat: true })]));
  check("ăn: tăng đói, trừ một quả táo", lp.state.hunger > 10 && lp.inv.main[8]?.count === 1);
  lp.state.hunger = 20;
  game.message(lan.conn, inputPacket(seq++, [frame({ eat: true })]));
  check("no rồi thì không ăn được", lp.inv.main[8]?.count === 1);
}

// ---- người chơi khác nhận vị trí (gói nhị phân) ----
{
  boss.bins.length = 0;
  for (let i = 0; i < 5; i++) game.tick();
  check("người chơi khác nhận gói vị trí", boss.bins.some((b) => binType(b) === BIN.PLAYERS));
  check("đồ cầm / giáp gửi bằng gói look", boss.msgs.some((m: ServerMsg) => m.t === "look"));
}
