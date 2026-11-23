// Kiểm tra 6a: sát thương theo bảng vũ khí + giáp, hồi đòn, miễn sát thương, chí mạng, đẩy lùi, tầm đánh, tường
// chắn, bù trễ (tua lại vị trí), PvP tắt, vùng an toàn (đánh + đào), chết → thông báo + rơi đồ, chat + lệnh.
import { B, COMBAT, NET, armorReduce, attackStrength, weaponStats, xpLevel, type ServerMsg } from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import type { ServerPlayer } from "../server/src/player.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---- bảng vũ khí ----
check("sát thương: tay 1, kiếm kim cương 7, rìu kim cương 6 (= kiếm − 1), cuốc sắt 4, xẻng gỗ 2.5",
  weaponStats(null).damage === 1 && weaponStats("diamond_sword").damage === 7 && weaponStats("diamond_axe").damage === 6 &&
  weaponStats("iron_pickaxe").damage === 4 && weaponStats("wood_shovel").damage === 2.5 && weaponStats("bread").damage === 1);
check("tốc độ đánh: tay 4, kiếm 1.6, rìu đá 0.8, rìu kim cương 1",
  weaponStats(null).speed === 4 && weaponStats("iron_sword").speed === 1.6 && weaponStats("stone_axe").speed === 0.8 && weaponStats("diamond_axe").speed === 1);
check("hồi đòn: đánh ngay = 20%, đủ 0.625 giây với kiếm = 100%",
  Math.abs(attackStrength(0, 1.6) - 0.2) < 0.01 && attackStrength(0.625, 1.6) === 1 && attackStrength(0.3, 1.6) < 0.5);

// ---- server: hai người đứng trên không, xa điểm hồi sinh, "boss" là quản trị viên ----
const game = new Game({ seed: "danh", port: 0, spawn: "fixed", debug: true, world: "c", admins: ["boss"], dataDir: null });
let now = 100000;
game.combat.clock = () => now;
game.chat.clock = () => now;
const join = (name: string) => {
  const f = fakeConn();
  game.message(f.conn, JSON.stringify({ t: "hello", name, password: "matkhau", version: NET.PROTOCOL_VERSION }));
  return { f, p: game.online().find((o) => o.name === name)! };
};
const A = join("an"), V = join("binh"), boss = join("boss");
const sp = game.spawn, X = Math.floor(sp.x) + 60, Z = Math.floor(sp.z), Y = 110;
const setup = (): void => {
  standAt(A.p, X + 0.5, Y, Z + 0.5);
  standAt(V.p, X + 0.5, Y, Z - 1.5); // trước mặt A 2 block (A nhìn về −Z: yaw 0)
  Object.assign(V.p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0 });
  V.p.deathHandled = false;
  A.p.lookYaw = 0;
  A.p.pitch = 0;
  A.p.sprinting = false;
  V.p.hist.length = 0;
  A.p.inv.main[A.p.inv.selected] = { item: "diamond_sword", count: 1, damage: 0 };
  V.p.inv.armor.fill(null);
};
setup();
for (let i = 0; i < 80; i++) game.tick(); // nạp chunk quanh hai người
setup();
const hit = (lag = 0): void => game.message(A.f.conn, JSON.stringify({ t: "attack", id: V.p.id, lag }));
const wait = (s: number): void => {
  now += s * 1000;
  V.p.state.invulnS = Math.max(0, V.p.state.invulnS - s);
};

wait(1);
hit();
check("đánh đủ lực bằng kiếm kim cương: mất 7 máu", Math.abs(V.p.state.health - 13) < 1e-6, `máu ${V.p.state.health}`);
check("đẩy lùi: bị đẩy ra xa người đánh (về −Z)", V.p.state.vz < -1);
check("kiếm mất 1 độ bền", A.p.inv.held?.damage === 1);
check("người khác thấy gói trúng đòn", boss.f.msgs.some((m) => m.t === "hurt" && m.id === V.p.id));
hit();
check("đánh ngay lần nữa (đang miễn sát thương, lực 20%): không mất thêm máu", Math.abs(V.p.state.health - 13) < 1e-6);
for (let i = 0; i < 6; i++) {
  wait(0.1); // bấm liên tục mỗi 0.1 giây: mỗi nhát đặt lại hồi đòn
  hit();
}
const afterSpam = V.p.state.health;
check("bấm liên tục 0.6 giây (mỗi 0.1 s): tổng chỉ mất ~2 máu thay vì 7", afterSpam > 13 - 7 * 0.35 && afterSpam < 13, `máu ${afterSpam.toFixed(2)}`);

// chí mạng: đang rơi xuống
setup();
wait(1);
Object.assign(A.p.state, { onGround: false, vy: -3, fallDist: 1 });
hit();
check("chí mạng khi đang rơi: ×1.5 (10.5 máu)", Math.abs(V.p.state.health - (20 - 7 * COMBAT.CRIT_MULTIPLIER)) < 1e-6, `máu ${V.p.state.health}`);
check("gói trúng đòn báo chí mạng", boss.f.msgs.some((m) => m.t === "hurt" && m.crit));

// giáp
setup();
["helmet", "chestplate", "leggings", "boots"].forEach((k, i) => (V.p.inv.armor[i] = { item: `diamond_${k}`, count: 1, damage: 0 }));
const st = V.p.inv.armorStats();
Object.assign(V.p.state, { armorPoints: st.points, armorToughness: st.toughness });
wait(1);
hit();
const want = 20 - armorReduce(7, st.points, st.toughness);
check("giáp kim cương giảm sát thương theo công thức, giáp mất độ bền",
  Math.abs(V.p.state.health - want) < 1e-6 && V.p.inv.armor.every((s) => (s?.damage ?? 0) === 1), `máu ${V.p.state.health.toFixed(2)} / cần ${want.toFixed(2)}`);
V.p.state.armorPoints = V.p.state.armorToughness = 0;

// quản trị viên đang bay (như chế độ sáng tạo): không bị đánh
setup();
V.p.flying = true;
wait(1);
hit();
check("người đang bay (quản trị viên): không bị đánh", V.p.state.health === 20);
V.p.flying = false;

// tầm, tường
setup();
standAt(V.p, X + 0.5, Y, Z - 4.5);
wait(1);
hit();
check("ngoài tầm (4 block): không trúng", V.p.state.health === 20);
setup();
game.ticker.acc.setCell(X, Y + 1, Z - 1, B.STONE, 0);
game.ticker.acc.setCell(X, Y, Z - 1, B.STONE, 0);
wait(1);
hit();
check("có tường đá chắn: không trúng", V.p.state.health === 20);
game.ticker.acc.setCell(X, Y + 1, Z - 1, B.AIR, 0);
game.ticker.acc.setCell(X, Y, Z - 1, B.AIR, 0);

// bù trễ: 200 ms trước mục tiêu còn trong tầm, giờ đã chạy ra 5 block
setup();
for (let i = 0; i < 20; i++) {
  now += 50;
  V.p.state.z = Z - 1.5 - (i >= 16 ? (i - 15) * 1 : 0); // 4 tick cuối chạy ra xa
  game.combat.record([V.p]);
}
check("mục tiêu hiện ở xa (ngoài tầm)", Z + 0.5 - V.p.state.z > 4);
hit(0);
check("không bù trễ (lag 0): trượt", V.p.state.health === 20);
hit(260); // người đánh thấy hình cũ 260 ms (tối đa tua 250)
check("bù trễ: thấy hình cũ 250 ms thì vẫn trúng", V.p.state.health < 20);
setup();
for (let i = 0; i < 20; i++) {
  now += 50;
  V.p.state.z = Z - 1.5 - (i >= 8 ? 4 : 0); // đã ra xa từ 600 ms trước
  game.combat.record([V.p]);
}
wait(1);
hit(1000);
check("không tua quá 250 ms (gửi lag 1000 vẫn trượt)", V.p.state.health === 20);

// PvP tắt; cạnh điểm hồi sinh (vùng an toàn đã bỏ 2026-11-23) vẫn đánh / đào được
setup();
game.combat.pvp = false;
wait(1);
hit();
check("PvP tắt: không mất máu, người đánh được báo", V.p.state.health === 20 && A.f.msgs.some((m) => m.t === "chat" && m.kind === "error" && m.key === "pvpDisabled"));
game.combat.pvp = true;
standAt(A.p, sp.x, Y, sp.z + 0.5);
standAt(V.p, sp.x, Y, sp.z - 1.5);
wait(4);
hit();
check("cạnh điểm hồi sinh (đã bỏ vùng an toàn): vẫn mất máu", V.p.state.health < 20, `${V.p.state.health}`);
const gx = Math.floor(sp.x), gz = Math.floor(sp.z) + 3;
game.ticker.acc.setCell(gx, Y - 1, gz, B.STONE, 0);
standAt(A.p, gx + 0.5, Y, gz + 1.5);
A.p.state.onGround = true;
game.message(A.f.conn, JSON.stringify({ t: "digStart", x: gx, y: Y - 1, z: gz }));
const realNow = Date.now;
Date.now = () => realNow() + 60000;
game.message(A.f.conn, JSON.stringify({ t: "dig", x: gx, y: Y - 1, z: gz }));
Date.now = realNow;
check("cạnh điểm hồi sinh: người thường đào được", (game.w.getCell(gx, Y - 1, gz) & 255) !== B.STONE);

// chết: thông báo + rơi đồ
setup();
V.p.state.health = 3;
V.p.inv.main[0] = { item: "diamond", count: 5, damage: 0 };
const items0 = game.items.list.length;
wait(1);
hit();
const death = boss.f.msgs.find((m) => m.t === "chat" && m.kind === "death") as { key: string; args: string[] } | undefined;
check("bị đánh chết: chết, rơi đồ, mọi người thấy \"binh bị an hạ gục\"",
  V.p.state.dead && game.items.list.length > items0 && death?.key === "diePlayer" && death.args.join() === "binh,an");
setup();
V.p.lastAttacker = { name: "an", at: now };
V.p.state.hurtSrc = 1; // rơi
game.chat.death(V.p);
check("rơi chết ngay sau khi bị đánh: \"bị an đánh rơi xuống chết\"",
  boss.f.msgs.some((m) => m.t === "chat" && m.kind === "death" && m.key === "dieFallBy"));

// chat + lệnh
const said = (f: ReturnType<typeof fakeConn>, pred: (m: ServerMsg) => boolean): boolean => f.msgs.some(pred);
game.message(A.f.conn, JSON.stringify({ t: "chat", text: "  xin chào  " }));
check("tin chat tới mọi người (đã cắt khoảng trắng)", said(boss.f, (m) => m.t === "chat" && m.kind === "chat" && m.from === "an" && m.text === "xin chào"));
for (let i = 0; i < 8; i++) game.message(A.f.conn, JSON.stringify({ t: "chat", text: `spam ${i}` }));
check("chống spam: quá 5 tin / 4 giây bị chặn", said(A.f, (m) => m.t === "chat" && m.kind === "error" && m.key === "slowDown"));
now += 10000;
game.message(A.f.conn, JSON.stringify({ t: "chat", text: "/pvp off" }));
check("người thường dùng /pvp: bị từ chối", game.combat.pvp && said(A.f, (m) => m.t === "chat" && m.kind === "error" && m.key === "notAdmin"));
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/pvp off" }));
check("quản trị viên /pvp off: tắt PvP, báo mọi người", !game.combat.pvp && said(A.f, (m) => m.t === "chat" && m.kind === "info" && m.key === "pvpOff"));
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/pvp on" }));
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/tp an" }));
const bp = boss.p;
check("/tp an: quản trị viên tới chỗ an, client nhận gói tp", Math.hypot(bp.x - A.p.x, bp.z - A.p.z) < 1e-6 && said(boss.f, (m) => m.t === "tp"));
now += 5000; // chat chống spam
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/tp 1000 90 -2000" }));
check("/tp x y z: tới đúng tọa độ", Math.abs(bp.x - 1000.5) < 1e-6 && Math.abs(bp.y - 90) < 1e-6 && Math.abs(bp.z + 1999.5) < 1e-6);
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/tp ~10 ~" }));
check("/tp x z (dấu ~): tới cột x + 10, đứng trên mặt đất", Math.abs(bp.x - 1010.5) < 1e-6 && Math.abs(bp.z + 1999.5) < 1e-6 && bp.y > 1 && bp.y !== 90);
now += 5000;
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/give binh emerald 70" }));
const emeralds = V.p.inv.main.reduce((n, s) => n + (s?.item === "emerald" ? s.count : 0), 0);
check("/give binh emerald 70: binh có 70 ngọc lục bảo (túi đầy thì rơi ra)", emeralds === 70 || game.items.list.some((e) => e.stack.item === "emerald"));
now += 5000; // chống spam: tối đa 5 tin / 4 giây (cả lệnh)
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/give binh khong_co 1" }));
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/time set day" }));
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/abc" }));
check("lệnh sai: báo vật phẩm không có, lệnh lạ; /time set day (7a) đặt giờ, báo mọi người",
  ["badItem", "unknownCmd"].every((k) => said(boss.f, (m) => m.t === "chat" && m.kind === "error" && m.key === k)) &&
  said(A.f, (m) => m.t === "chat" && m.kind === "info" && m.key === "timeSet") && game.clock.time % 24000 === 1000);
now += 5000;
{ // /xp: cộng điểm, cộng cấp, đặt, bớt; người thường không dùng được
  const xpCmd = (text: string): number => (game.message(boss.f.conn, JSON.stringify({ t: "chat", text })), V.p.state.xp);
  V.p.state.xp = 0;
  const pts = xpCmd("/xp binh 7"), lv = xpCmd("/xp binh 30L"), set = xpCmd("/xp binh set 5L"), neg = xpCmd("/xp binh -999");
  now += 5000;
  A.p.state.xp = 0;
  game.message(A.f.conn, JSON.stringify({ t: "chat", text: "/xp an 100L" }));
  const bad = A.p.state.xp;
  check("/xp: binh 7 → cấp 1; 30L → cấp 31; set 5L → đúng 55 điểm; -999 → 0; người thường bị từ chối",
    pts === 7 && xpLevel(lv).level === 31 && set === 55 && neg === 0 && bad === 0 &&
    said(boss.f, (m) => m.t === "chat" && m.kind === "info" && m.key === "xpSet") && said(A.f, (m) => m.t === "chat" && m.kind === "error" && m.key === "notAdmin"),
    `${pts} ${lv} ${set} ${neg} ${bad}`);
}
now += 5000;
game.message(boss.f.conn, JSON.stringify({ t: "chat", text: "/kick binh" }));
check("/kick binh: đóng kết nối của binh, báo mọi người", V.f.closed && said(A.f, (m) => m.t === "chat" && m.kind === "info" && m.key === "kicked"));
