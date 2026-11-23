// Kiểm tra 7d: vật lý cưỡi (tốc độ riêng, tích lực nhảy, bước lên 1 block, xuống thú, thú mất máu khi rơi > 3), cưỡi / hất xuống /
// thuần / yên / rương / phối giống ra la, dây dắt (đi theo, đứt khi xa, buộc cọc), đoàn lạc đà, gói vị trí người chơi có id thú cưỡi.
import {
  B, NET, RIDE, SPAWN_RULES, createPlayer, decodePlayers, encodePlayers, stepPlayer, type InputFrame, type PlayerState,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, frame, standAt } from "./netHelpers.js";

// ---- vật lý ----
const flat = (wall = false) => (x: number, y: number, z: number): number =>
  y < 64 ? B.STONE : wall && z <= -10 && y === 64 ? B.STONE : 0;
const rider = (control = 1): PlayerState => {
  const s = createPlayer(0.5, 64 + RIDE.SEAT.horse!, 0.5);
  Object.assign(s, { rideId: 7, rideSeat: RIDE.SEAT.horse, rideW: 1.4, rideH: 1.6, rideSpeed: 10, rideJump: 4, rideControl: control, onGround: true });
  return s;
};
{
  const s = rider(), t = rider(0);
  for (let i = 0; i < 120; i++) for (const p of [s, t]) stepPlayer(p, frame({ forward: 1 }) as InputFrame, flat());
  check("cưỡi có yên: đi nhanh theo tốc độ con thú (~10 block/giây); không yên: đứng yên", -s.z > 14 && -s.z < 21 && Math.abs(t.z - 0.5) < 0.01, `${(-s.z).toFixed(1)}`);
  const j = rider();
  for (let i = 0; i < 60; i++) stepPlayer(j, frame({ jump: true }) as InputFrame, flat());
  let top = 0;
  for (let i = 0; i < 90; i++) {
    stepPlayer(j, frame() as InputFrame, flat());
    top = Math.max(top, j.y - j.rideSeat - 64);
  }
  check("giữ phím nhảy 1 giây rồi thả: ngựa nhảy cao ~4 block (đủ lực)", top > 3.5 && top < 4.5, top.toFixed(2));
  const w = rider();
  for (let i = 0; i < 120; i++) stepPlayer(w, frame({ forward: 1 }) as InputFrame, flat(true));
  check("đi vào bậc cao 1 block: ngựa bước lên", w.y - w.rideSeat >= 64.99 && w.z < -11, `y ${(w.y - w.rideSeat).toFixed(2)}`);
  const d = rider();
  stepPlayer(d, frame({ sneak: true }) as InputFrame, flat());
  check("Shift: xuống ngựa, đứng cạnh ngựa trên mặt đất", d.rideId === 0 && Math.abs(d.y - 64) < 0.01 && Math.hypot(d.x - 0.5, d.z - 0.5) > 1);
  const f = rider();
  f.y += 6;
  f.onGround = false;
  for (let i = 0; i < 120; i++) stepPlayer(f, frame() as InputFrame, flat());
  check("rơi 6 block: thú mất 3 máu (an toàn 3 block), người cưỡi không mất máu", f.rideHurt === 3 && f.health === 20, `${f.rideHurt}`);
}
{
  const b = decodePlayers(encodePlayers([{ id: 3, x: 1, y: 2, z: 3, yaw: 0, pitch: 0, sneaking: false, dead: false, swing: 0, ride: 123456 }]));
  check("gói vị trí người chơi mang id thú đang cưỡi", b[0]?.ride === 123456);
  check("đồng cỏ sinh ngựa, lừa", (SPAWN_RULES.ANIMAL_BIOMES.plains!.horse ?? 0) > 0 && (SPAWN_RULES.ANIMAL_BIOMES.plains!.donkey ?? 0) > 0);
}

// ---- server ----
const game = new Game({ seed: "cuoi7d", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!, mobs = game.life.mobs;
const X = Math.floor(game.spawn.x) + 60, Z = Math.floor(game.spawn.z), Y = 100;
const set = (x: number, y: number, z: number, id: number): void => void game.w.setCell(x, y, z, id, 0);
standAt(p, X + 0.5, Y, Z + 0.5);
for (let i = 0; i < 90; i++) game.tick();
for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) {
  set(X + dx, Y - 1, Z + dz, B.STONE);
  for (let y = Y; y < Y + 4; y++) set(X + dx, y, Z + dz, B.AIR);
}
for (let i = 0; i < 20; i++) game.tick();
mobs.list.splice(0);
p.lookYaw = 0;
p.pitch = -0.3;
const use = (id: number, item: string | null, count = 1): void => {
  p.inv.main[p.inv.selected] = item ? { item, count, damage: 0 } : null;
  game.message(f.conn, JSON.stringify({ t: "useMob", id }));
};
const near = (m: { body: { x: number; y: number; z: number }; hist: unknown[] }): void => {
  if (!p.state.rideId) standAt(p, X + 0.5, Y, Z + 0.5);
  Object.assign(m.body, { x: X + 0.5, y: Y, z: Z - 2 });
  m.hist.length = 0;
};
const ticks = (n: number): void => {
  for (let i = 0; i < n; i++) game.tick();
};

// cưỡi ngựa chưa thuần: bị hất xuống, độ thuần +5
const horse = mobs.spawn("horse", X + 0.5, Y, Z - 2);
near(horse);
use(horse.id, null);
check("chuột phải tay không: lên ngựa (người ngồi trên lưng)", p.state.rideId === horse.id && horse.rider === p && Math.abs(p.y - horse.y - RIDE.SEAT.horse!) < 0.01);
ticks(Math.ceil(RIDE.BUCK_MAX_S * 20) + 2);
check("ngựa chưa thuần (độ thuần 0): hất người xuống, độ thuần +5", p.state.rideId === 0 && !horse.rider && horse.temper === RIDE.TEMPER_BUCK && !horse.owner);
near(horse);
use(horse.id, "golden_apple", 1);
check("cho ăn táo vàng: độ thuần +10", horse.temper === RIDE.TEMPER_BUCK + 10);
horse.temper = 100;
near(horse);
use(horse.id, null);
ticks(Math.ceil(RIDE.BUCK_MAX_S * 20) + 2);
check("độ thuần 100: ngựa thuần (chủ là mình), vẫn trên lưng nhưng chưa có yên thì chưa điều khiển được",
  horse.owner === "An" && p.state.rideId === horse.id && p.state.rideControl === 0);
p.state.sneaking = true;
game.message(f.conn, JSON.stringify({ t: "rideInv" })); // không có rương: không mở gì
p.state.sneaking = false;
// xuống, đặt yên, lên lại: điều khiển được; thân ngựa theo người cưỡi; ngựa mất máu khi rơi
Object.assign(p.state, { rideId: 0 });
ticks(2);
near(horse);
use(horse.id, "saddle");
use(horse.id, null);
check("đặt yên rồi cưỡi: điều khiển được, tốc độ / độ nhảy là của con ngựa",
  horse.saddled && p.state.rideControl === 1 && p.state.rideSpeed === horse.rideSpeed && horse.rideSpeed >= 4.7 && horse.rideSpeed <= 14.2);
p.state.x += 3;
const hp = horse.health;
p.state.rideHurt = 4;
ticks(1);
check("thân ngựa theo người cưỡi; sát thương rơi của thú trừ vào ngựa", Math.abs(horse.x - p.state.x) < 0.01 && horse.health === hp - 4);
game.disconnect(f.conn);
check("thoát game khi đang cưỡi: xuống ngựa trước khi lưu", p.state.rideId === 0);
const f2 = fakeConn();
game.message(f2.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p2 = game.online()[0]!;
ticks(2);
check("ngựa không còn người cưỡi sau khi người đó thoát", !horse.rider);
mobs.list.splice(0);

// lừa: rương 15 ô; ngựa + lừa (thuần, táo vàng) → la
{
  const q = p2;
  standAt(q, X + 0.5, Y, Z + 0.5);
  q.lookYaw = 0;
  q.pitch = -0.3;
  const u = (id: number, item: string | null): void => {
    q.inv.main[q.inv.selected] = item ? { item, count: 1, damage: 0 } : null;
    game.message(f2.conn, JSON.stringify({ t: "useMob", id }));
  };
  const donkey = mobs.spawn("donkey", X + 0.5, Y, Z - 2);
  donkey.owner = "An";
  u(donkey.id, "chest");
  q.state.sneaking = true;
  u(donkey.id, null);
  q.state.sneaking = false;
  check("lừa đã thuần: đặt rương (15 ô), Shift + chuột phải mở rương của lừa",
    donkey.chest?.length === RIDE.CHEST_SLOTS && q.container?.slots === donkey.chest);
  donkey.chest![0] = { item: "diamond", count: 3, damage: 0 };
  game.containers.close(q);
  const h2 = mobs.spawn("horse", X + 1.5, Y, Z - 2);
  h2.owner = "An";
  for (const m of [donkey, h2]) {
    Object.assign(m.body, { x: X + 0.5, y: Y, z: Z - 2 });
    m.hist.length = 0;
    u(m.id, "golden_apple");
  }
  ticks(100);
  const mule = mobs.list.find((m) => m.def.key === "mule" && m.baby);
  check("ngựa + lừa đã thuần, cho táo vàng: đẻ la con", !!mule);
  const before = game.items.list.length;
  mobs.hurt(donkey, 100, "player", { by: q });
  const dropped = game.items.list.slice(before).map((e) => e.stack.item);
  check("lừa chết: rơi rương và đồ trong rương", dropped.includes("chest") && dropped.includes("diamond"), dropped.join(","));
  mobs.list.splice(0);
}

// dây dắt
{
  const q = p2;
  const u = (id: number, item: string | null): void => {
    q.inv.main[q.inv.selected] = item ? { item, count: 5, damage: 0 } : null;
    game.message(f2.conn, JSON.stringify({ t: "useMob", id }));
  };
  standAt(q, X + 0.5, Y, Z + 0.5);
  const cow = mobs.spawn("cow", X + 0.5, Y, Z - 2);
  u(cow.id, "lead");
  check("dây dắt vào bò: bò bị dắt, tốn 1 dây", !!cow.leash && "p" in cow.leash && q.inv.held?.count === 4);
  for (let i = 0; i < 100; i++) {
    standAt(q, X + 8.5, Y, Z + 0.5);
    game.tick();
  }
  check("người đi xa 8 block: bò đi theo (còn cách < 5)", Math.hypot(cow.x - q.x, cow.z - q.z) < 5, Math.hypot(cow.x - q.x, cow.z - q.z).toFixed(1));
  set(X + 10, Y, Z + 3, B.FENCE);
  game.life.leashes.useFence(q, X + 10, Y, Z + 3);
  for (let i = 0; i < 60; i++) {
    standAt(q, X - 8.5, Y, Z + 0.5);
    game.tick();
  }
  check("buộc vào hàng rào: bò ở lại quanh cọc", !!cow.leash && "x" in cow.leash && Math.hypot(cow.x - X - 10.5, cow.z - Z - 3.5) < 4);
  game.life.leashes.useFence(q, X + 10, Y, Z + 3);
  standAt(q, X + 0.5, Y, Z + 0.5);
  Object.assign(cow.body, { x: X - 14, z: Z });
  const before = game.items.list.length;
  ticks(2);
  check("lấy lại từ cọc rồi đi quá 10 block: dây đứt, rơi dây", !cow.leash && game.items.list.slice(before).some((e) => e.stack.item === "lead"));
  // đoàn lạc đà
  const l1 = mobs.spawn("llama", X + 0.5, Y, Z - 2), l2 = mobs.spawn("llama", X + 2.5, Y, Z - 3), l3 = mobs.spawn("llama", X + 4.5, Y, Z - 4);
  u(l1.id, "lead");
  ticks(2);
  check("dắt một lạc đà: lạc đà gần đó nối đuôi thành đoàn", !!l2.leash && !!l3.leash && "m" in l2.leash! && "m" in l3.leash!);
  u(l1.id, null);
  ticks(2);
  check("tháo dây con đầu: đoàn tan", !l1.leash && !l2.leash && !l3.leash);
}
