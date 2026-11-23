// Kiểm tra 7a: giờ trong ngày, gói sinh vật, vật lý / tìm đường, quái đuổi đánh, bộ xương bắn, nắng đốt, người chơi đánh
// sinh vật + rơi đồ, tỉa lông, vắt sữa, phối giống, trứng, giường (đặt điểm hồi sinh, ngủ, tua sáng), sinh quái ban đêm,
// sinh động vật khi tạo chunk, cất / nạp động vật theo chunk.
import {
  B, DAY, NET, canSleepAt, decodeMobs, encodeMobs, mobIndex, skyDarken, sunBurnsAt,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { PathFinder } from "../server/src/mobs/pathfind.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---- giờ ----
check("giờ: trưa sáng hẳn, nửa đêm trời trừ 11 mức", skyDarken(6000) === 0 && skyDarken(18000) === 11 && skyDarken(1000) <= 1);
check("ngủ được ban đêm, không ngủ được ban ngày", canSleepAt(13000) && canSleepAt(DAY.TICKS + 20000) && !canSleepAt(6000) && !canSleepAt(23500));
check("nắng đốt xác sống ban ngày, ban đêm không", sunBurnsAt(6000) && sunBurnsAt(23500) && !sunBurnsAt(18000));

// ---- gói sinh vật ----
const enc = decodeMobs(encodeMobs([{ id: 70000, kind: 3, flags: 5, variant: 14, x: 1.5, y: 64, z: -3.25, yaw: 1, pitch: -0.3, extra: 0 }], [5, 9]));
check("gói MOBS mã hóa / giải mã", !!enc && enc.up[0]!.id === 70000 && enc.up[0]!.variant === 14 && Math.abs(enc.up[0]!.yaw - 1) < 0.03 &&
  Math.abs(enc.up[0]!.pitch + 0.3) < 0.02 && enc.gone.join() === "5,9");

// ---- server: sàn đá trên không xa điểm hồi sinh ----
const game = new Game({ seed: "sinhvat", port: 0, spawn: "fixed", debug: true, world: "m", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false; // tắt sinh tự nhiên khi kiểm từng việc
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const sp = game.spawn, X = Math.floor(sp.x) + 70, Z = Math.floor(sp.z), Y = 100;
let PX = X + 0.5, PZ = Z + 0.5, PY = Y;
const stand = (): void => {
  standAt(p, PX, PY, PZ);
  Object.assign(p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0, hunger: 20 });
  p.deathHandled = false;
};
stand();
for (let i = 0; i < 90; i++) game.tick();
const set = (x: number, y: number, z: number, id: number): void => void game.w.setCell(x, y, z, id, 0);
for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) set(X + dx, Y - 1, Z + dz, B.STONE);
for (let i = 0; i < 40; i++) game.tick(); // ánh sáng sàn
const mobs = game.life.mobs;
const clear = (): void => void mobs.list.splice(0);
clear();
const ticks = (n: number): void => {
  for (let i = 0; i < n; i++) {
    stand();
    game.tick();
  }
};

// ---- vật lý, tìm đường ----
const cow0 = mobs.spawn("cow", X + 5.5, Y + 3, Z + 5.5);
ticks(30);
check("sinh vật rơi xuống đứng trên sàn", Math.abs(cow0.y - Y) < 0.01 && cow0.body.onGround, `y ${cow0.y}`);
for (let dz = -3; dz <= 3; dz++) for (let dy = 0; dy < 3; dy++) set(X + 3, Y + dy, Z + dz, B.STONE); // tường chắn
const pf = new PathFinder((x, y, z) => game.w.getCell(x, y, z));
const path = pf.find({ x: X, y: Y, z: Z }, { x: X + 6, y: Y, z: Z }, 2);
check("tìm đường vòng qua tường", !!path && path.length > 6 && path[path.length - 1]!.x === X + 6 && path.every((n) => n.x !== X + 3 || Math.abs(n.z - Z) > 3),
  `${path?.length} nút`);
for (let dz = -3; dz <= 3; dz++) for (let dy = 0; dy < 3; dy++) set(X + 3, Y + dy, Z + dz, B.AIR);
clear();

// ---- quái đuổi đánh ban đêm ----
game.clock.set(DAY.SET_MIDNIGHT);
const z1 = mobs.spawn("zombie", X + 6.5, Y, Z + 0.5);
let minH = 20;
for (let i = 0; i < 120; i++) {
  game.tick();
  minH = Math.min(minH, p.health);
  if (p.health < 20) break;
}
check("xác sống đuổi tới và đánh người chơi (3 máu)", minH <= 17.01 && minH >= 16.9, `máu thấp nhất ${minH}, xác sống cách ${Math.hypot(z1.x - p.x, z1.z - p.z).toFixed(1)}`);
check("thông báo chết sẽ ghi tên sinh vật", p.lastAttacker?.name === "mob:zombie");
clear();
stand();

// ---- bộ xương bắn tên ----
const sk = mobs.spawn("skeleton", X + 0.5, Y, Z + 10.5);
let shot = false;
for (let i = 0; i < 100 && !shot; i++) {
  stand();
  Object.assign(p.state, { invulnS: 0 });
  game.tick();
  shot = game.archery.list.some((a) => a.mobOwner === sk.id);
}
let hitByArrow = false;
for (let i = 0; i < 40 && !hitByArrow; i++) {
  game.tick();
  hitByArrow = p.health < 20;
}
check("bộ xương giương cung bắn tên trúng người chơi", shot && hitByArrow, `bắn ${shot}, máu ${p.health}`);
clear();

// ---- nắng đốt ----
game.clock.set(DAY.SET_NOON);
const z2 = mobs.spawn("zombie", X + 8.5, Y, Z + 8.5);
ticks(30);
check("ban ngày dưới trời: xác sống bốc cháy, mất máu", z2.burnS > 0 && (z2.health < 20 || z2.fireT > 0));
clear();

// ---- người chơi đánh sinh vật, rơi đồ ----
const cow = mobs.spawn("cow", X + 0.5, Y, Z - 1.5);
p.lookYaw = 0;
p.pitch = -0.35;
p.inv.main[p.inv.selected] = { item: "diamond_sword", count: 1, damage: 0 };
let now = 1e6;
game.life.interact.clock = () => now;
p.lastAttackAt = 0;
cow.body.vx = cow.body.vz = 0;
game.message(f.conn, JSON.stringify({ t: "hitMob", id: cow.id, lag: 0 }));
check("đánh bò bằng kiếm kim cương: mất 7 máu, bò chạy", Math.abs(cow.health - 3) < 1e-6 && cow.panicS > 0, `máu ${cow.health}`);
now += 1000;
cow.invulnS = 0;
Object.assign(cow.body, { x: X + 0.5, y: Y, z: Z - 1.5 });
cow.hist.length = 0;
game.message(f.conn, JSON.stringify({ t: "hitMob", id: cow.id, lag: 0 }));
const itemsBefore = game.items.list.length;
check("bò chết: rơi thịt bò sống (và có thể da)", cow.dead && game.items.list.slice(itemsBefore - 3).some((e) => e.stack.item === "beef") ||
  game.items.list.some((e) => e.stack.item === "beef"));
ticks(25);
check("xác biến mất sau 1 giây", !mobs.list.includes(cow));

// ---- bộ xương, nhện rơi đồ (cung cũ 8.5%) ----
{
  const got: Record<string, number> = {};
  let worn = true;
  for (let n = 0; n < 300; n++) {
    const before = game.items.list.length;
    const m = mobs.spawn(n % 2 ? "spider" : "skeleton", X + 4.5, Y, Z + 4.5);
    mobs.hurt(m, 100, "player", { by: p });
    for (const e of game.items.list.slice(before)) {
      got[e.stack.item] = (got[e.stack.item] ?? 0) + e.stack.count;
      if (e.stack.item === "bow" && !(e.stack.damage > 0)) worn = false;
    }
  }
  game.items.list.splice(0);
  clear();
  check("bộ xương rơi xương + tên, thỉnh thoảng cung đã mòn; nhện rơi sợi tơ + mắt nhện",
    (got.bone ?? 0) > 100 && (got.arrow ?? 0) > 100 && (got.bow ?? 0) >= 3 && (got.bow ?? 0) <= 35 && worn && (got.string ?? 0) > 100 && (got.spider_eye ?? 0) > 20,
    JSON.stringify(got));
}

// ---- tỉa lông, vắt sữa ----
const sheep = mobs.spawn("sheep", X + 0.5, Y, Z - 1.5, { variant: 14 });
p.pitch = -0.4;
p.inv.main[p.inv.selected] = { item: "shears", count: 1, damage: 0 };
game.message(f.conn, JSON.stringify({ t: "useMob", id: sheep.id }));
check("tỉa lông cừu đỏ: rơi len đỏ, kéo mất độ bền", sheep.sheared && game.items.list.some((e) => e.stack.item === "red_wool") && p.inv.held?.damage === 1);
mobs.remove(sheep);
const cow2 = mobs.spawn("cow", X + 0.5, Y, Z - 1.5);
p.inv.main[p.inv.selected] = { item: "bucket", count: 1, damage: 0 };
game.message(f.conn, JSON.stringify({ t: "useMob", id: cow2.id }));
check("vắt sữa bò bằng xô: có xô sữa", p.inv.held?.item === "milk_bucket");

// ---- phối giống ----
const cow3 = mobs.spawn("cow", X + 1.5, Y, Z - 1.5);
p.inv.main[p.inv.selected] = { item: "wheat", count: 5, damage: 0 };
for (const c of [cow2, cow3]) {
  Object.assign(c.body, { x: X + 0.5, y: Y, z: Z - 1.5 });
  game.message(f.conn, JSON.stringify({ t: "useMob", id: c.id }));
}
check("cho bò ăn lúa mì: muốn phối giống, trừ lúa mì", cow2.loveS > 0 && cow3.loveS > 0 && p.inv.held?.count === 3);
ticks(100);
const baby = mobs.list.find((m) => m.def.key === "cow" && m.baby);
check("hai con gặp nhau đẻ một bê con, chờ 5 phút mới phối tiếp", !!baby && cow2.breedCdS > 200 && cow3.breedCdS > 200);
clear();

// ---- trứng ----
game.life.interact.eggLanded(X + 2.5, Y, Z + 2.5);
let hatched = 0;
for (let i = 0; i < 400; i++) game.life.interact.eggLanded(X + 2.5, Y, Z + 2.5);
hatched = mobs.list.filter((m) => m.def.key === "chicken" && m.baby).length;
check("trứng: khoảng 1/8 nở gà con", hatched > 25 && hatched < 110, `${hatched} con / 401 trứng`);
clear();

// ---- giường ----
p.inv.main[p.inv.selected] = { item: "red_bed", count: 1, damage: 0 };
game.message(f.conn, JSON.stringify({ t: "use", hit: { x: X + 3, y: Y - 1, z: Z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 }));
let bed: { x: number; z: number } | null = null;
for (let dx = -3; dx <= 3 && !bed; dx++) for (let dz = -3; dz <= 3 && !bed; dz++) if ((game.w.getCell(X + dx, Y, Z + dz) & 255) === B.BED) bed = { x: X + dx, z: Z + dz };
check("đặt giường", !!bed);
game.clock.set(DAY.SET_DAY);
f.msgs.length = 0;
game.message(f.conn, JSON.stringify({ t: "use", hit: { x: bed!.x, y: Y, z: bed!.z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 }));
check("ban ngày bấm giường: đặt điểm hồi sinh nhưng không ngủ", !!p.spawnPoint && !p.sleeping &&
  f.msgs.some((m) => m.t === "chat" && "key" in m && m.key === "noSleepDay") && f.msgs.some((m) => m.t === "chat" && "key" in m && m.key === "spawnSet"));
game.clock.set(DAY.SET_NIGHT + 500);
const zNear = mobs.spawn("zombie", bed!.x + 3.5, Y, bed!.z + 0.5);
f.msgs.length = 0;
game.message(f.conn, JSON.stringify({ t: "use", hit: { x: bed!.x, y: Y, z: bed!.z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 }));
check("có quái gần: không ngủ được", !p.sleeping && f.msgs.some((m) => m.t === "chat" && "key" in m && m.key === "noSleepMobs"));
mobs.remove(zNear);
game.message(f.conn, JSON.stringify({ t: "use", hit: { x: bed!.x, y: Y, z: bed!.z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 }));
check("ban đêm, không có quái: nằm xuống", !!p.sleeping && f.msgs.some((m) => m.t === "sleep" && m.on));
const day0 = Math.floor(game.clock.time / DAY.TICKS);
for (let i = 0; i < 110; i++) game.tick();
check("một mình nằm đủ 5 giây: tua sang sáng, tự dậy", Math.floor(game.clock.time / DAY.TICKS) === day0 + 1 && game.clock.time % DAY.TICKS < 100 && !p.sleeping);
const r = game.clock.respawnPos(p);
check("hồi sinh cạnh giường", Math.hypot(r.x - (bed!.x + 0.5), r.z - (bed!.z + 0.5)) <= 3.5, `${r.x},${r.y},${r.z}`);
game.w.setCell(bed!.x, Y, bed!.z, B.AIR, 0);
const r2 = game.clock.respawnPos(p);
check("giường mất: về điểm hồi sinh thế giới", r2 === game.spawn && p.spawnPoint === null);

// ---- sinh quái ban đêm: đi tới vùng mới (chunk mới tạo có động vật), đứng trên mặt đất ----
game.life.spawning = true;
PX = sp.x + 400;
PZ = sp.z + 400;
PY = 127;
for (let i = 0; i < 80; i++) {
  stand();
  game.tick();
}
for (let y = 126; y > 1; y--) if (game.w.getCell(Math.floor(PX), y, Math.floor(PZ)) > 0) {
  PY = y + 1;
  break;
}
game.clock.set(DAY.SET_MIDNIGHT);
const spawnDist: number[] = [], spawn0 = mobs.spawn.bind(mobs);
mobs.spawn = (k, x, y, z, o) => {
  if (k === "zombie" || k === "skeleton" || k === "spider") spawnDist.push(Math.hypot(x - p.x, y - p.y, z - p.z));
  return spawn0(k, x, y, z, o);
};
for (let i = 0; i < 400; i++) {
  stand();
  game.clock.time = DAY.SET_MIDNIGHT;
  game.tick();
}
const hostile = mobs.list.filter((m) => m.def.hostile && !m.dead);
check("ban đêm quái sinh quanh người chơi (24–128 block, tối đa 30)", hostile.length > 0 && hostile.length <= 30 + 4 &&
  spawnDist.every((d) => d >= 23.9), `${hostile.length} quái, gần nhất lúc sinh ${Math.min(...spawnDist).toFixed(1)} block`);
mobs.spawn = spawn0;
const animals = mobs.list.filter((m) => !m.def.hostile).length + [...mobs.parked.values()].reduce((s, l) => s + l.length, 0);
check("chunk mới tạo có đàn động vật", animals > 0 && game.life.spawner.populated.size > 50, `${animals} con, ${game.life.spawner.populated.size} chunk`);

// ---- cất / nạp động vật ----
const saved = game.life.save();
const pig = saved.mobs!.find((m) => m.key === "pig") ?? saved.mobs![0] ?? mobs.spawn("pig", X + 0.5, Y, Z + 0.5).toSave();
mobs.list.splice(0);
mobs.parked.clear();
game.life.load({ blocks: [], items: [], mobs: [pig] });
mobs.chunkLoaded(Math.floor(pig.x) >> 4, Math.floor(pig.z) >> 4);
check("động vật lưu rồi nạp lại hoạt động khi chunk tải", mobs.list.some((m) => m.def.key === pig.key && Math.abs(m.x - pig.x) < 1e-6));
check("mã loài dùng chung client / server", mobIndex("zombie") === 0 && mobIndex("chicken") === 6);
