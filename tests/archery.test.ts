// Kiểm tra 6b: lực kéo cung, sát thương theo tốc độ, mũi tên bay / cắm vào block, server đo thời gian kéo, trúng người
// (chí mạng khi kéo đủ lực, đẩy lùi), khiên chặn tên, nhặt lại tên đã cắm, PvP tắt, thông báo chết vì tên, vệt quét kiếm.
import { B, NET, arrowDamage, bowPower, stack, stepArrow, type ServerMsg } from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

check("lực kéo: 0 giây = 0, 0.5 giây ≈ 42%, 1 giây trở lên = 100%",
  bowPower(0) === 0 && Math.abs(bowPower(0.5) - 0.4167) < 0.001 && bowPower(1) === 1 && bowPower(3) === 1);
check("sát thương: tên bay nhanh nhất 6, kéo đủ lực (chí mạng) 9, tên chậm ít nhất 2",
  arrowDamage(60, false) === 6 && arrowDamage(60, true) === 9 && arrowDamage(5, false) === 2);
{
  const ground = (x: number, y: number, z: number): number => (y < 64 ? B.STONE : 0);
  const a = { x: 0.5, y: 66, z: 0.5, vx: 30, vy: 0, vz: 0, stuck: false };
  let n = 0;
  while (!a.stuck && n++ < 100) stepArrow(a, ground);
  check("tên bắn ngang rơi dần theo trọng lực rồi cắm xuống đất", a.stuck && a.y >= 63.9 && a.y < 64.2 && a.x > 5, `x ${a.x.toFixed(1)} y ${a.y.toFixed(2)}`);
}

// ---- server ----
const game = new Game({ seed: "cung", port: 0, spawn: "fixed", debug: true, world: "a", admins: [], adminAll: true, dataDir: null });
let now = 300000;
game.combat.clock = game.archery.clock = game.chat.clock = () => now;
const join = (name: string) => {
  const f = fakeConn();
  game.message(f.conn, JSON.stringify({ t: "hello", name, password: "matkhau", version: NET.PROTOCOL_VERSION }));
  return { f, p: game.online().find((o) => o.name === name)! };
};
const A = join("an"), V = join("binh");
const X = Math.floor(game.spawn.x) + 60, Z = Math.floor(game.spawn.z), Y = 110;
const setup = (): void => {
  for (const q of [A, V]) {
    Object.assign(q.p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0, vx: 0, vy: 0, vz: 0 });
    q.p.deathHandled = false;
    q.p.inv.main.fill(null);
    q.p.inv.offhand[0] = null;
    q.p.blocking = false;
    q.p.drawing = false;
  }
  standAt(A.p, X + 0.5, Y, Z + 0.5);
  standAt(V.p, X + 0.5, Y, Z - 9.5); // trước mặt 10 block
  A.p.lookYaw = 0;
  A.p.pitch = 0;
  A.p.inv.selected = 0;
  A.p.inv.main[0] = stack("bow");
  A.p.inv.main[1] = stack("arrow", 5);
  game.archery.list.length = 0;
};
const msg = (m: object): void => game.message(A.f.conn, JSON.stringify(m));
const fly = (): void => {
  for (let i = 0; i < 40 && game.archery.list.some((a) => !a.stuck); i++) game.archery.tick();
};
setup();
for (let i = 0; i < 80; i++) game.tick();

setup();
msg({ t: "shoot", power: 1 });
check("thả cung khi chưa báo kéo: không bắn", game.archery.list.length === 0 && A.p.inv.main[1]?.count === 5);
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
check("kéo đủ 1 giây rồi thả: có 1 mũi tên, trừ 1 tên trong túi, cung mất 1 độ bền",
  game.archery.list.length === 1 && A.p.inv.main[1]?.count === 4 && A.p.inv.main[0]?.damage === 1);
fly();
check("tên kéo đủ lực trúng người cách 10 block: chí mạng 9 máu, bị đẩy về phía sau",
  V.p.state.health === 11 && V.p.state.vz < -1 && game.archery.list.length === 0 && V.f.msgs.some((m) => m.t === "hurt" && m.crit),
  `máu ${V.p.state.health}`);

setup();
msg({ t: "draw" });
now += 200;
msg({ t: "shoot", power: 1 }); // client gian lận: báo đủ lực sau 0.2 giây
const a0 = game.archery.list[0];
check("kéo 0.2 giây mà báo đủ lực: server chỉ cho lực theo thời gian thật", !!a0 && Math.hypot(a0.vx, a0.vy, a0.vz) < 16 && !a0.crit);

setup();
A.p.inv.main[1] = null;
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
check("hết tên: không bắn được", game.archery.list.length === 0);

// khiên chặn tên, người bắn không bị đẩy lùi
setup();
V.p.inv.offhand[0] = stack("shield");
V.p.lookYaw = Math.PI; // nhìn về phía người bắn
V.p.blocking = true;
V.p.blockSince = now - 1000;
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
fly();
check("khiên chặn tên: không mất máu, khiên mất 1 + 9 độ bền, người bắn không bị đẩy",
  V.p.state.health === 20 && V.p.inv.offhand[0]?.damage === 10 && A.p.state.vz === 0);

// tên cắm vào tường, đi lại gần thì nhặt được
setup();
for (let y = Y - 1; y <= Y + 3; y++) game.ticker.acc.setCell(X, y, Z - 4, B.STONE, 0);
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
fly();
const stuck = game.archery.list[0];
check("tên cắm vào tường đá", !!stuck?.stuck && stuck.z > Z - 4 && stuck.z < Z - 2.9, stuck ? `z ${stuck.z.toFixed(2)}` : "không có");
standAt(A.p, X + 0.5, Y, Z - 2.5);
game.archery.tick();
check("đi lại gần tên đã cắm: nhặt lại được", game.archery.list.length === 0 && A.p.inv.count("arrow") === 5);
for (let y = Y - 1; y <= Y + 3; y++) game.ticker.acc.setCell(X, y, Z - 4, B.AIR, 0);

// PvP tắt
setup();
game.combat.pvp = false;
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
fly();
check("PvP tắt: tên không gây sát thương", V.p.state.health === 20);
game.combat.pvp = true;

// chết vì tên
setup();
V.p.state.health = 3;
msg({ t: "draw" });
now += 1000;
msg({ t: "shoot", power: 1 });
fly();
const death = A.f.msgs.find((m) => m.t === "chat" && m.kind === "death") as { key: string; args: string[] } | undefined;
check("bị bắn chết: thông báo \"binh bị an bắn chết\"", V.p.state.dead && death?.key === "dieArrow" && death.args.join() === "binh,an");

// vệt quét kiếm
setup();
standAt(V.p, X + 0.5, Y, Z - 1.5);
A.p.inv.main[0] = stack("diamond_sword");
A.p.state.onGround = true;
now += 1000;
game.message(A.f.conn, JSON.stringify({ t: "attack", id: V.p.id, lag: 0 }));
check("đòn quét kiếm: người xung quanh nhận hiệu ứng vệt quét", V.f.msgs.some((m: ServerMsg) => m.t === "fx" && m.kind === "sweep"));
