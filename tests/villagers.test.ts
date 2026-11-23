// Kiểm tra 8a (phần 2 — sinh vật làng trên server): đổi đồ (trừ / cộng đồ, hết hàng, đồng bộ hai người, bổ sung hàng), dân làng bị
// xác sống giết ~50% thành dân làng xác sống, chữa bằng táo vàng, xác sống săn dân làng, người sắt đánh quái + hất lên, giận người
// đánh dân làng, mèo thuần bằng cá, quái nổ tránh mèo, bật lửa vào quái nổ thì nổ ngay, thương nhân + 2 lạc đà, lạc đà lướt / 2 chỗ
// ngồi, lệnh /structure save, dân làng trong làng có nghề theo bàn nghề.
import {
  B, CAMEL, NET, TRADES, VILLAGERS, VILLAGER_PROFS, ZOMBIE_VILLAGER, createPlayer, stepPlayer, customStructures, resetVillageCustoms,
  type InputFrame, type ServerMsg,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { setVillager } from "../server/src/mobs/villagers.js";
import { check } from "./harness.js";
import { fakeConn, frame, standAt } from "./netHelpers.js";

// ---- vật lý lạc đà: lướt ----
{
  const s = createPlayer(0.5, 64 + 1.9, 0.5);
  Object.assign(s, { rideId: 9, rideSeat: 1.9, rideW: 1.7, rideH: 2.375, rideSpeed: CAMEL.SPEED, rideControl: 1, rideDash: 1, onGround: true });
  const flat = (_x: number, y: number): number => (y < 64 ? B.STONE : 0);
  stepPlayer(s, frame({ jump: true }) as InputFrame, flat);
  for (let i = 0; i < 20; i++) stepPlayer(s, frame() as InputFrame, flat);
  const z1 = -s.z;
  stepPlayer(s, frame({ jump: true }) as InputFrame, flat);
  check("lạc đà: Space lướt ~4 block về trước, phải chờ mới lướt lại", z1 > 3 && z1 < 6.5 && s.rideDashCd > 0 && Math.abs(-s.z - z1) < 0.5, z1.toFixed(2));
}

resetVillageCustoms();
const game = new Game({ seed: "lang8a", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const fa = fakeConn(), fb = fakeConn();
game.message(fa.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
game.message(fb.conn, JSON.stringify({ t: "hello", name: "Binh", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const [p, q] = game.online() as [ReturnType<Game["online"]>[0], ReturnType<Game["online"]>[0]];
const mobs = game.life.mobs, vil = game.life.villagers;
const X = Math.floor(game.spawn.x) + 60, Z = Math.floor(game.spawn.z), Y = 100;
const set = (x: number, y: number, z: number, id: number): void => void game.w.setCell(x, y, z, id, 0);
standAt(p, X + 0.5, Y, Z + 0.5);
standAt(q, X + 1.5, Y, Z + 0.5);
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(90);
for (let dx = -20; dx <= 20; dx++) for (let dz = -20; dz <= 20; dz++) {
  set(X + dx, Y - 1, Z + dz, B.STONE);
  for (let y = Y; y < Y + 5; y++) set(X + dx, y, Z + dz, B.AIR);
}
ticks(20);
mobs.list.splice(0);
p.inv.main.fill(null);
q.inv.main.fill(null);
p.lookYaw = q.lookYaw = 0;
p.pitch = q.pitch = -0.3;
const use = (who: typeof p, f: typeof fa, id: number, item: string | null, count = 1): void => {
  who.inv.main[who.inv.selected] = item ? { item, count, damage: 0 } : null;
  game.message(f.conn, JSON.stringify({ t: "useMob", id }));
};
const place = (m: { body: { x: number; y: number; z: number }; hist: unknown[] }, dz = -2): void => {
  Object.assign(m.body, { x: X + 0.5, y: Y, z: Z + dz });
  m.hist.length = 0;
};
const last = <T extends ServerMsg["t"]>(f: typeof fa, t: T): Extract<ServerMsg, { t: T }> | undefined =>
  f.msgs.filter((m): m is Extract<ServerMsg, { t: T }> => m.t === t).pop();

// ---- đổi đồ ----
const farmer = mobs.spawn("villager", X + 0.5, Y, Z - 2);
setVillager(farmer, 0, VILLAGER_PROFS.indexOf("farmer"));
place(farmer);
use(p, fa, farmer.id, null);
standAt(q, X + 0.5, Y, Z + 0.5);
use(q, fb, farmer.id, null);
standAt(q, X + 1.5, Y, Z + 0.5);
p.inv.main[p.inv.selected] = null;
p.inv.add({ item: "wheat", count: 64, damage: 0 });
const t0 = last(fa, "trades");
check("chuột phải dân làng (nông dân): mở bảng đổi đồ 2–4 giao dịch, trả ngọc lục bảo",
  !!t0 && t0.list.length >= 2 && t0.list.length <= 4 && t0.list[0]![0][0] === "wheat" && t0.list[0]![2][0] === "emerald" && p.trading === farmer.id);
game.message(fa.conn, JSON.stringify({ t: "trade", mob: farmer.id, i: 0, all: false }));
check("đổi 20 lúa → 1 ngọc lục bảo (server trừ / cộng đồ)", p.inv.count("wheat") === 44 && p.inv.count("emerald") === 1);
check("người khác đang mở cùng dân làng thấy số lần còn lại cập nhật (đồng bộ)", last(fb, "trades")?.list[0]![3] === 1);
game.message(fa.conn, JSON.stringify({ t: "trade", mob: farmer.id, i: 0, all: true }));
check("Shift: đổi tới khi hết đồ", p.inv.count("wheat") === 4 && p.inv.count("emerald") === 3);
p.inv.add({ item: "wheat", count: 64 * 6, damage: 0 });
game.message(fa.conn, JSON.stringify({ t: "trade", mob: farmer.id, i: 0, all: true }));
const max = TRADES.farmer[0]!.max;
check("hết hàng sau số lần tối đa; đủ đồ cũng không đổi được nữa", farmer.vill!.uses[0] === max && p.inv.count("emerald") === max);
farmer.vill!.restockS = 0.01;
ticks(2);
check("dân làng bổ sung hàng sau một lúc", (farmer.vill!.uses[0] ?? 0) === 0 && last(fa, "trades")?.list[0]![3] === 0);
Object.assign(p.state, { x: X + 0.5 + VILLAGERS.TRADE_R + 3 });
ticks(2);
check("đi xa dân làng: bảng đổi đồ đóng", p.trading === 0 && fa.msgs.some((m) => m.t === "tradeEnd"));
standAt(p, X + 0.5, Y, Z + 0.5);
const nit = mobs.spawn("villager", X + 0.5, Y, Z - 2);
setVillager(nit, 0, 1);
place(nit);
fa.msgs.length = 0;
use(p, fa, nit.id, null);
check("dân làng ngốc: không có gì để đổi", !last(fa, "trades"));
mobs.remove(nit);

// ---- xác sống và dân làng ----
let conv = 0;
for (let i = 0; i < 200; i++) {
  const v = mobs.spawn("villager", X + 5.5, Y, Z + 5.5), z = mobs.spawn("zombie", X + 6.5, Y, Z + 5.5);
  setVillager(v, 2, VILLAGER_PROFS.indexOf("librarian"));
  mobs.hurt(v, 100, "other", { byMob: z });
  if (mobs.list.some((m) => m.def.key === "zombie_villager" && m.vill?.prof === v.vill!.prof && !m.dead)) conv++;
  for (const m of [...mobs.list]) if (m !== farmer) mobs.remove(m);
}
check("dân làng bị xác sống giết: ~50% thành dân làng xác sống (giữ nghề)", Math.abs(conv / 200 - ZOMBIE_VILLAGER.CONVERT_CHANCE) < 0.12, `${conv}/200`);
const zv = mobs.spawn("zombie_villager", X + 0.5, Y, Z - 2);
zv.vill = { type: 1, prof: VILLAGER_PROFS.indexOf("armorer"), uses: [], restockS: 0 };
place(zv);
use(p, fa, zv.id, "golden_apple");
check("cho dân làng xác sống táo vàng: bắt đầu chữa (tốn táo)", zv.cureS > 0 && p.inv.count("golden_apple") === 0);
zv.cureS = 0.02;
ticks(2);
const cured = mobs.list.find((m) => m.def.key === "villager" && m.vill?.prof === VILLAGER_PROFS.indexOf("armorer"));
check("chữa xong: thành dân làng, giữ nghề", !!cured && !mobs.list.includes(zv));
if (cured) mobs.remove(cured);
{
  const v = mobs.spawn("villager", X + 8.5, Y, Z + 0.5), z = mobs.spawn("zombie", X - 6.5, Y, Z + 0.5);
  setVillager(v, 0, 2);
  standAt(p, X + 0.5, Y, Z + 15.5); // người chơi ở xa ngoài tầm nhìn bức tường? xác sống không thấy người: săn dân làng
  p.flying = q.flying = true;
  ticks(40);
  check("xác sống không có người chơi để đuổi: đuổi theo dân làng", z.prey?.def.key === "villager" && Math.abs(z.x - (X - 6.5)) > 1,
    `${z.prey?.def.key} ${(z.x - (X - 6.5)).toFixed(2)} ${z.target?.name} ${z.dead}`);
  p.flying = q.flying = false;
  mobs.remove(v);
  mobs.remove(z);
  standAt(p, X + 0.5, Y, Z + 0.5);
}

// ---- người sắt ----
{
  const g = mobs.spawn("iron_golem", X + 4.5, Y, Z + 4.5), z = mobs.spawn("zombie", X + 6.5, Y, Z + 4.5);
  g.home = { x: X + 4.5, y: Y, z: Z + 4.5 };
  z.target = null;
  p.flying = true;
  let tossed = false;
  const hp = z.health;
  for (let i = 0; i < 80 && !tossed; i++) {
    game.tick();
    if (z.body.vy > 3) tossed = true;
  }
  check("người sắt đánh quái tới gần (7–21 sát thương, hất lên)", g.prey === z && z.health <= hp - 7 && tossed, `máu ${z.health}`);
  p.flying = false;
  mobs.remove(z);
  const v = mobs.spawn("villager", X + 0.5, Y, Z - 2);
  setVillager(v, 0, 2);
  place(v);
  game.message(fa.conn, JSON.stringify({ t: "hitMob", id: v.id, lag: 0 }));
  check("đánh dân làng: người sắt gần đó giận người đánh", g.target === p);
  g.target = null;
  mobs.remove(v);
  mobs.remove(g);
}

// ---- mèo ----
{
  const cat = mobs.spawn("cat", X + 0.5, Y, Z - 2);
  place(cat);
  let n = 0;
  while (!cat.owner && n < 40) {
    place(cat);
    use(p, fa, cat.id, "cod");
    n++;
  }
  check("mèo hoang thuần bằng cá sống (1/3 mỗi con); thuần xong ngồi, chủ là mình", cat.owner === "An" && cat.sitting && n > 0, `${n} con cá`);
  const cr = mobs.spawn("creeper", X + 2.5, Y, Z - 2);
  cr.target = p;
  Object.assign(cat.body, { x: X + 4.5, z: Z - 2 });
  ticks(20);
  check("quái nổ tránh xa mèo (không xì, chạy khỏi mèo)", cr.fuseS === 0 && cr.x < X + 2.5 - 0.5 && !cr.dead, cr.x.toFixed(2));
  mobs.remove(cat);
  // bật lửa vào quái nổ: nổ ngay (người dùng yêu cầu)
  place(cr, -3);
  p.inv.main[p.inv.selected] = { item: "flint_and_steel", count: 1, damage: 0 };
  game.message(fa.conn, JSON.stringify({ t: "hitMob", id: cr.id, lag: 0 }));
  ticks(2);
  check("đánh quái nổ bằng bật lửa: nổ ngay", !mobs.list.includes(cr));
  p.state.health = 20;
  standAt(p, X + 0.5, Y, Z + 0.5);
  ticks(2);
}

// ---- thương nhân lang thang ----
{
  const tr = vil.spawnTrader(X + 0.5, Y, Z - 2);
  const llamas = mobs.list.filter((m) => m.def.key === "trader_llama");
  ticks(5);
  check("thương nhân lang thang + 2 lạc đà dắt theo (dây không đứt)", llamas.length === 2 && llamas.every((l) => l.leash && "m" in l.leash && l.leash.m === tr));
  place(tr);
  fa.msgs.length = 0;
  use(p, fa, tr.id, null);
  check("thương nhân bán 6 món (5 thường + 1 hiếm) lấy ngọc lục bảo", last(fa, "trades")?.list.length === 6 && last(fa, "trades")!.list.every((t) => t[0][0] === "emerald"));
  tr.lifeS = 0.01;
  ticks(2);
  check("hết thời gian: thương nhân đi cùng 2 lạc đà", !mobs.list.includes(tr) && !mobs.list.some((m) => m.def.key === "trader_llama"));
  p.trading = 0;
}

// ---- lạc đà: 2 người ----
{
  const camel = mobs.spawn("camel", X + 0.5, Y, Z - 2);
  place(camel);
  use(p, fa, camel.id, "saddle");
  use(p, fa, camel.id, null);
  Object.assign(camel.body, { x: X + 0.5, z: Z - 2 });
  camel.hist.length = 0;
  standAt(q, X + 0.5, Y, Z + 0.5);
  use(q, fb, camel.id, null);
  check("lạc đà: có yên thì lái được ngay (không cần thuần); người thứ hai ngồi sau",
    p.state.rideId === camel.id && p.state.rideControl === 1 && p.state.rideDash === 1 && q.state.rideId === camel.id && q.state.rideBack === 1 && camel.passenger === q,
    `p ${p.state.rideId} ${p.state.rideControl} q ${q.state.rideId} ${camel.saddled} ${camel.id} ${p.x - camel.x} ${p.z - camel.z}`);
  p.state.x += 3;
  ticks(1);
  check("người ngồi sau đi theo lạc đà", Math.abs(q.x - (camel.x + Math.sin(camel.yaw) * CAMEL.BACK_OFF)) < 0.05 && Math.abs(q.y - camel.y - CAMEL.BACK_SEAT) < 0.05);
  q.state.rideId = 0;
  q.state.rideBack = 0;
  p.state.rideId = 0;
  ticks(2);
  mobs.remove(camel);
}

// ---- /structure save ----
{
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) for (let y = 0; y < 4; y++) {
    const wall = x === 0 || x === 4 || z === 0 || z === 4 || y === 0 || y === 3;
    set(X + 10 + x, Y + y, Z + 10 + z, wall ? B.COBBLE : B.AIR);
  }
  game.message(fa.conn, JSON.stringify({ t: "chat", text: `/structure save nha_thu ${X + 10} ${Y} ${Z + 10} ${X + 14} ${Y + 3} ${Z + 14}` }));
  check("/structure save (quản trị viên): lưu nhà, mọi người nhận danh sách mới",
    customStructures().some((c) => c.name === "nha_thu") && !!last(fb, "customs")?.list.some((c) => c.name === "nha_thu"));
  game.message(fa.conn, JSON.stringify({ t: "chat", text: `/structure save nha_thu ${X} ${Y} ${Z} ${X + 4} ${Y + 3} ${Z + 4}` }));
  check("/structure save trùng tên: báo lỗi", fa.msgs.some((m) => m.t === "chat" && "key" in m && m.key === "structFail"));
  resetVillageCustoms();
}

// ---- (sửa lỗi người dùng báo) cho thú đang cưỡi ăn ----
{
  standAt(p, X + 0.5, Y, Z + 0.5);
  const h = mobs.spawn("horse", X + 0.5, Y, Z - 2);
  place(h);
  Object.assign(h, { owner: "An", saddled: true });
  use(p, fa, h.id, null);
  h.health = h.maxHealth - 10;
  p.pitch = 0.4; // nhìn lên trời: tia không trúng ngựa
  fa.msgs.length = 0;
  use(p, fa, h.id, "hay_block");
  check("đang cưỡi: cầm thức ăn (khối rơm) chuột phải → ngựa ăn, hồi máu, có tim", p.state.rideId === h.id && h.health === h.maxHealth &&
    fa.msgs.some((m) => m.t === "fx" && m.kind === "hearts"));
  p.state.rideId = 0;
  p.pitch = -0.3;
  ticks(2);
}
