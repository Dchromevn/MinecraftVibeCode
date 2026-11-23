// Kiểm tra 10d1: bảng đổi vàng (trọng số 459, Tốc độ linh hồn), thuốc / chai / mũi tên quang phổ (công thức, uống, Phát sáng), Tốc
// độ linh hồn (đi nhanh trên đất / cát linh hồn); trên server thử: người lợn đánh người không mặc vàng, tha người mặc vàng; đưa thỏi
// vàng thì ngắm 6 giây rồi ném ra đồ đổi; tự nhặt vàng rơi; mở rương / đánh người lợn thì cả bầy tức; người lợn nỏ bắn tên; vệ binh
// đánh cả người mặc vàng; tránh lửa linh hồn; săn lợn rừng lửa (lợn rừng đánh trả); ở thế giới chính 15 giây thì thành xác sống;
// lợn rừng xác sống đánh cả sinh vật; mũi tên quang phổ làm sinh vật Phát sáng; thuốc kháng lửa ném.
import {
  B, BARTER, MOB_EXTRA, MOB_FLAG, NET, NETHER_SPAWNS, NB, PIGLIN, applyEffect, createPlayer, createSurvival, eat, itemDef, matchGrid, stack,
  stepPlayer, tickSurvival, type CellReader,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { rollBarter } from "../server/src/mobs/brainPiglin.js";
import { check } from "./harness.js";
import { fakeConn, frame, standAt } from "./netHelpers.js";

// ---------- bảng đổi vàng ----------
{
  const total = BARTER.reduce((s, e) => s + e.w, 0);
  let seed = 7;
  const rng = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = 20000, got = new Map<string, number>();
  let soulOk = true;
  for (let i = 0; i < n; i++) {
    const s = rollBarter(rng);
    got.set(s.item, (got.get(s.item) ?? 0) + 1);
    const e = BARTER.find((b) => b.item === s.item)!;
    if (s.count < e.min || s.count > e.max) soulOk = false;
    if (e.ench && !(s.ench?.soul_speed && s.ench.soul_speed >= 1 && s.ench.soul_speed <= 3)) soulOk = false;
  }
  const obs = (got.get("obsidian") ?? 0) / n, book = (got.get("enchanted_book") ?? 0) / n;
  check("bảng đổi vàng: tổng trọng số 459, mọi món có trong game", total === 459 && BARTER.every((e) => !!itemDef(e.item)), `${total}`);
  check("đổi vàng theo trọng số (đá vỏ chai ~8.7%, sách Tốc độ linh hồn ~1.1%), số lượng / cấp phù phép đúng khoảng",
    Math.abs(obs - 40 / 459) < 0.01 && Math.abs(book - 5 / 459) < 0.004 && soulOk, `${(obs * 100).toFixed(1)}% / ${(book * 100).toFixed(2)}%`);
}

// ---------- vật phẩm, công thức, hiệu ứng ----------
{
  const g = (grid: (string | null)[]): string | undefined => matchGrid(grid, 3)?.out.item;
  check("công thức: chai thủy tinh (3 kính hình chữ V), mũi tên quang phổ (4 bụi đá phát sáng + tên → 2)",
    g(["glass", null, "glass", null, "glass", null, null, null, null]) === "glass_bottle" &&
    matchGrid([null, "glowstone_dust", null, "glowstone_dust", "arrow", "glowstone_dust", null, "glowstone_dust", null], 3)?.out.count === 2);
  const s = createSurvival();
  const pot = itemDef("fire_resistance_potion")!.food!;
  eat(s, pot);
  for (const e of pot.effects ?? []) applyEffect(s, e.fx, e.s, e.lvl);
  applyEffect(s, "glowing", 10);
  tickSurvival(s, 1);
  check("uống thuốc kháng lửa: Kháng lửa 3 phút, trả chai; Phát sáng đếm lùi", Math.abs(s.fxFireResS - 179) < 0.01 && pot.returns === "glass_bottle" &&
    Math.abs(s.fxGlowS - 9) < 0.01 && itemDef("fire_resistance_splash_potion")?.use === "throw");
  check("người lợn sinh ở hoang mạc Vực Lửa và rừng đỏ thẫm", NETHER_SPAWNS[NB.WASTES]!.some((e) => e.key === "piglin") && NETHER_SPAWNS[NB.CRIMSON]!.some((e) => e.key === "piglin"));
  // Tốc độ linh hồn: đi 2 giây trên đất linh hồn / cát linh hồn
  const walk = (floor: number, soul: number): number => {
    const cell: CellReader = (_x, y) => (y < 64 ? floor : 0), p = createPlayer(0.5, 64, 0.5);
    p.encSoul = soul;
    for (let i = 0; i < 40; i++) stepPlayer(p, frame({ forward: 1 }), cell);
    return Math.hypot(p.x - 0.5, p.z - 0.5);
  };
  const base = walk(B.SOUL_SOIL, 0), fast = walk(B.SOUL_SOIL, 3), sand = walk(B.SOUL_SAND, 0), sandFast = walk(B.SOUL_SAND, 1);
  check("Tốc độ linh hồn III: nhanh hơn ~60% trên đất linh hồn; cát linh hồn không làm chậm khi có Tốc độ linh hồn",
    fast / base > 1.5 && fast / base < 1.7 && sand < base * 0.6 && sandFast > base * 1.2, `${base.toFixed(2)} → ${fast.toFixed(2)}, cát ${sand.toFixed(2)} → ${sandFast.toFixed(2)}`);
}

// ---------- server thử ----------
const game = new Game({ seed: "kiemtra-10d", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
for (const r of game.realms) r.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(40);
const r0 = game.realms[0]!;
// thế giới chính: người lợn / lợn rừng lửa thành xác sống sau 15 giây
{
  const OX = Math.floor(p.x) + 6, OZ = Math.floor(p.z), OY = 120;
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
    r0.w.setCell(OX + dx, OY - 1, OZ + dz, B.STONE, 0);
    for (let y = OY; y < OY + 4; y++) r0.w.setCell(OX + dx, y, OZ + dz, 0, 0);
  }
  const pg = r0.life.mobs.spawn("piglin", OX + 0.5, OY, OZ + 0.5), hg = r0.life.mobs.spawn("hoglin", OX + 3.5, OY, OZ + 0.5);
  pg.pocket.push(stack("gold_nugget", 5));
  ticks(20 * 14);
  const shaking = (pg.extra() & MOB_EXTRA.ZOMBIFYING) !== 0 && r0.life.mobs.list.includes(pg);
  ticks(20 * 2);
  const zp = r0.life.mobs.list.find((m) => m.def.key === "zombified_piglin"), zg = r0.life.mobs.list.find((m) => m.def.key === "zoglin");
  check("thế giới chính: người lợn / lợn rừng lửa run rồi sau 15 giây thành người lợn xác sống / lợn rừng xác sống (đồ trong túi rơi ra)",
    shaking && !!zp && !!zg && !r0.life.mobs.list.includes(pg) && !r0.life.mobs.list.includes(hg) && r0.items.list.some((e) => e.stack.item === "gold_nugget"));
  for (const m of [...r0.life.mobs.list]) r0.life.mobs.remove(m);
  void hg;
}
game.portals.travel(p);
ticks(60);
const r1 = game.realms[1]!, w = r1.w, mobs = r1.life.mobs;
const X = Math.floor(p.x) + 30, Z = Math.floor(p.z), Y = 70;
const arena = (): void => {
  for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) {
    w.setCell(X + dx, Y - 1, Z + dz, B.NETHERRACK, 0);
    for (let y = Y; y < Y + 12; y++) w.setCell(X + dx, y, Z + dz, 0, 0);
  }
  for (const m of [...mobs.list]) mobs.remove(m);
  r1.archery.list.length = 0;
  r1.items.list.length = 0;
  Object.assign(p.state, { health: 20, dead: false, vy: 0, invulnS: 0, lastHurt: 0, burnS: 0, fxGlowS: 0, fxFireResS: 0 });
  p.inv.armor.fill(null);
  p.inv.main.fill(null);
  standAt(p, X + 0.5, Y, Z + 0.5);
};
const piglin = (dx: number, dz: number, weapon = 1) => Object.assign(mobs.spawn("piglin", X + dx + 0.5, Y, Z + dz + 0.5), { variant: weapon, huntCdS: 999 });
const until = (n: number, ok: () => boolean): boolean => { for (let i = 0; i < n && !ok(); i++) ticks(1); return ok(); };
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(40);
{
  arena();
  piglin(3, 0);
  const hit = until(100, () => p.state.health < 20);
  arena();
  p.inv.armor[0] = stack("gold_helmet");
  const pg = piglin(3, 0);
  ticks(100);
  check("người lợn đánh người không mặc vàng; mặc một món giáp vàng thì không đánh", hit && p.state.health === 20 && !pg.target, `máu ${p.state.health}`);
  // đưa thỏi vàng: ngắm 6 giây (cầm vàng tay trái) rồi ném ra một món đổi
  p.inv.main[0] = stack("gold_ingot", 3);
  p.inv.selected = 0;
  Object.assign(pg.body, { x: X + 0.5, y: Y, z: Z - 1.5, vx: 0, vz: 0 }); // ngay trước mặt (nhìn về −z)
  Object.assign(p, { lookYaw: 0, pitch: 0 });
  ticks(2);
  game.message(f.conn, JSON.stringify({ t: "useMob", id: pg.id }));
  const admiring = pg.admireS > 0 && pg.held?.item === "gold_ingot" && p.inv.main[0]?.count === 2 && (pg.extra() & MOB_EXTRA.ADMIRING) !== 0;
  ticks(20 * 5);
  const still = pg.held !== null && r1.items.list.length === 0;
  ticks(25);
  const out = r1.items.list.find((e) => BARTER.some((b) => b.item === e.stack.item));
  check("đưa thỏi vàng: người lợn cầm ngắm 6 giây rồi ném ra một món trong bảng đổi vàng", admiring && still && !!out && !pg.held, out?.stack.item);
  // tự nhặt thỏi vàng rơi gần đó
  r1.items.list.length = 0;
  r1.items.pop(stack("gold_ingot"), X + 6, Y, Z);
  r1.items.list[0]!.pickupDelay = 0;
  const picked = until(200, () => pg.held?.item === "gold_ingot");
  check("người lợn thấy thỏi vàng rơi thì đi nhặt và ngắm", picked && r1.items.list.length === 0);
  // mở rương gần đó: người lợn thấy thì tức (dù mặc vàng) và đánh
  pg.admireS = 0;
  pg.held = null;
  r1.life.piglinAlarm(p, X + 1, Y, Z + 1, B.CHEST);
  const angry = pg.target === p && pg.angryS > 20;
  const hurt = until(120, () => p.state.health < 20);
  check("mở rương / đào khối vàng gần người lợn: nó tức, đánh cả người mặc giáp vàng", angry && hurt);
}
{
  arena();
  p.inv.armor[0] = stack("gold_helmet");
  const a = piglin(4, 0), b = piglin(-4, 3);
  mobs.hurt(a, 1, "player", { by: p });
  check("đánh một người lợn: người lợn quanh đó cùng tức", a.target === p && b.target === p && b.angryS > 20);
  arena();
  p.inv.armor[0] = stack("gold_helmet");
  mobs.spawn("piglin_brute", X + 3.5, Y, Z + 0.5);
  check("người lợn vệ binh (50 máu, rìu vàng 13) đánh cả người mặc giáp vàng", until(100, () => p.state.health < 20) && 20 - p.state.health > 5, `mất ${20 - p.state.health}`);
}
{
  arena();
  piglin(8, 0, 2);
  const shot = until(120, () => r1.archery.list.some((a) => a.shooter === "mob:piglin"));
  check("người lợn cầm nỏ giữ khoảng cách và bắn tên", shot);
  arena();
  w.setCell(X + 4, Y, Z, B.SOUL_FIRE, 0);
  const pg = piglin(2, 0);
  pg.target = null;
  p.inv.armor[0] = stack("gold_helmet");
  ticks(30);
  const d0 = Math.hypot(pg.x - X - 4.5, pg.z - Z - 0.5);
  check("người lợn tránh lửa linh hồn", pg.panicS > 0 || d0 > 5, `cách ${d0.toFixed(1)}`);
}
{
  arena();
  p.inv.armor[0] = stack("gold_helmet");
  standAt(p, X + 12.5, Y, Z + 12.5);
  const hunters = [piglin(-3, 0), piglin(-3, 2), piglin(-3, -2)];
  for (const h of hunters) h.huntCdS = 0;
  const hog = mobs.spawn("hoglin", X + 3.5, Y, Z + 0.5);
  hog.teleCdS = 999; // không dò nấm cong vênh
  const chase = until(60, () => hunters.some((h) => h.prey === hog));
  const bitten = until(200, () => hog.health < hog.maxHealth);
  const back = until(100, () => !!hog.prey && hunters.includes(hog.prey));
  check("cả bầy người lợn săn lợn rừng lửa; lợn rừng lửa đánh trả", chase && bitten && back, `máu lợn rừng ${hog.health.toFixed(0)}`);
}
{
  arena();
  standAt(p, X + 12.5, Y, Z + 12.5);
  const zg = mobs.spawn("zoglin", X + 0.5, Y, Z + 0.5), cow = mobs.spawn("cow", X + 4.5, Y, Z + 0.5);
  const bit = until(160, () => cow.health < cow.maxHealth);
  standAt(p, X + 2.5, Y, Z + 2.5);
  cow.health = 0.1;
  const hurtP = until(200, () => p.state.health < 20);
  check("lợn rừng xác sống đánh cả sinh vật (bò) và người chơi", bit && hurtP && zg.def.health === 40);
}
{
  arena();
  let now = 1e6;
  r1.archery.clock = () => now;
  const target = mobs.spawn("zombified_piglin", X + 0.5, Y, Z - 9.5);
  Object.assign(p, { lookYaw: 0, pitch: 0.02 });
  p.inv.main[0] = stack("bow");
  p.inv.main[1] = stack("spectral_arrow", 3);
  p.inv.selected = 0;
  game.message(f.conn, JSON.stringify({ t: "draw" }));
  now += 1000;
  game.message(f.conn, JSON.stringify({ t: "shoot", power: 1 }));
  const glow = until(40, () => target.glowS > 0);
  check("mũi tên quang phổ: bắn bằng cung, trúng thì sinh vật Phát sáng (cờ GLOWING)", glow && (target.flags() & MOB_FLAG.GLOWING) !== 0 && p.inv.main[1]?.count === 2);
  arena();
  p.inv.main[0] = stack("fire_resistance_splash_potion");
  p.inv.selected = 0;
  Object.assign(p, { lookYaw: 0, pitch: -1.4 });
  r1.archery.throwHeld(p);
  const res = until(60, () => p.state.fxFireResS > 0);
  check("ném thuốc kháng lửa xuống chân: được Kháng lửa (~2 phút 15 giây)", res && p.state.fxFireResS > 60 && !p.inv.main[0], `${p.state.fxFireResS.toFixed(0)} giây`);
}
void PIGLIN;
