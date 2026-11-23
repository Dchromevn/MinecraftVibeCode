// Kiểm tra 8b (người dùng chọn 2026-11-15: bỏ điềm xấu / cướp làng): tiền đồn kẻ cướp (tháp canh + rương, lồng tiểu linh / người
// sắt, không gần làng), kẻ cướp sinh ở tiền đồn, bắn nỏ, đội tuần tra (đội trưởng đeo cờ dẫn, lính theo), tiểu linh nhặt đồ mang
// về, nỏ của người chơi (lên dây rồi bắn).
import {
  B, CROSSBOW, NET, OUTPOST, PILLAGER, STRUCTURE_LOOT, VILLAGE, outpostAt, resetVillageCustoms, seedFromString, stack, structureLootAt,
  villageAt, worldOf, type VillagePlan, TerrainSampler,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { spawnPatrol } from "../server/src/mobs/illagers.js";
import { loadStructures } from "../server/src/structFile.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

loadStructures();
resetVillageCustoms();
const s = new TerrainSampler(seedFromString("dat-moi-mbgwo2"));
const outs: VillagePlan[] = [];
for (let rx = -8; rx <= 8; rx++) for (let rz = -8; rz <= 8; rz++) {
  const o = outpostAt(s, rx, rz);
  if (o) outs.push(o);
}
check("có tiền đồn kẻ cướp (vùng 32 × 32 chunk, 20%, biome như làng)", outs.length >= 4, `${outs.length} tiền đồn`);
const tower = (o: VillagePlan) => o.pieces.find((p) => p.t.loot.some((l) => l[3] === "pillager_outpost"));
check("mỗi tiền đồn có tháp canh với rương đồ ở đỉnh", outs.every((o) => {
  const t = tower(o);
  if (!t) return false;
  const [x, y, z] = worldOf(t, t.t.loot[0]![0], t.t.loot[0]![1], t.t.loot[0]![2]);
  return structureLootAt(s, x, y, z) === "pillager_outpost" && !!STRUCTURE_LOOT.pillager_outpost && y > o.pieces[0]!.y + 10;
}));
check("không có tiền đồn trong 10 chunk quanh làng", outs.every((o) => {
  const span = VILLAGE.SPACING * 16, r = OUTPOST.VILLAGE_EXCLUSION_CHUNKS * 16;
  for (let rx = Math.floor((o.x - r) / span); rx <= Math.floor((o.x + r) / span); rx++)
    for (let rz = Math.floor((o.z - r) / span); rz <= Math.floor((o.z + r) / span); rz++) {
      const v = villageAt(s, rx, rz);
      if (v && Math.abs(v.x - o.x) <= r && Math.abs(v.z - o.z) <= r) return false;
    }
  return true;
}));
{
  let overlap = 0, feats = 0;
  for (const o of outs) {
    const seen = new Set<string>();
    for (const p of o.pieces) {
      if (p.terrain || p === o.pieces[0] || p.t.size[1] > 10) continue;
      feats++;
      for (let i = 0; i < p.t.cells.length; i += 4) {
        const [x, , z] = worldOf(p, p.t.cells[i]!, 0, p.t.cells[i + 2]!), k = `${x},${z}`;
        if (seen.has(k + "#" + o.pieces.indexOf(p))) continue;
        if ([...seen].some((q) => q.startsWith(k + "#"))) overlap++;
        seen.add(k + "#" + o.pieces.indexOf(p));
      }
    }
  }
  check("lều, lồng, bia tập bắn trên nền phụ không chồng lên nhau", feats > 5 && overlap === 0, `${feats} món, chồng ${overlap}`);
}
check("có lồng nhốt tiểu linh / người sắt trong các tiền đồn",
  outs.some((o) => o.pieces.some((p) => p.t.mobs?.some((m) => m[3] === "allay"))) && outs.some((o) => o.pieces.some((p) => p.t.mobs?.some((m) => m[3] === "iron_golem"))));

// ---- server ----
const game = new Game({ seed: "dat-moi-mbgwo2", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!, mobs = game.life.mobs;
p.inv.main.fill(null);
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
{
  const o = outs.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0]!;
  standAt(p, o.x + 30.5, s.column(o.x + 30, o.z).height + 1, o.z + 0.5);
  p.flying = true;
  ticks(200);
  mobs.list.splice(0);
  const il = game.life.illagers;
  for (let i = 0; i < 10; i++) il.tick([p], OUTPOST.SPAWN_TRY_S + 0.01);
  const pil = mobs.list.filter((m) => m.def.key === "pillager");
  check("người chơi tới gần tiền đồn: kẻ cướp sinh trên nền tiền đồn (cả ban ngày), tối đa 6",
    pil.length > 0 && pil.length <= OUTPOST.SPAWN_MAX && pil.every((m) => o.cols.has((Math.floor(m.x) + 32768) * 65536 + (Math.floor(m.z) + 32768))), `${pil.length} con`);
  game.life.spawner.structureMobs(o.x >> 4, o.z >> 4);
  p.flying = false;
}
// sân thử phẳng
const X = Math.floor(p.x) + 200, Z = Math.floor(p.z), Y = 110;
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(120);
for (let dx = -30; dx <= 30; dx++) for (let dz = -30; dz <= 30; dz++) {
  game.w.setCell(X + dx, Y - 1, Z + dz, B.STONE, 0);
  for (let y = Y; y < Y + 6; y++) game.w.setCell(X + dx, y, Z + dz, 0, 0);
}
ticks(20);
mobs.list.splice(0);
{
  const pil = mobs.spawn("pillager", X + 8.5, Y, Z + 0.5);
  const hp = p.state.health;
  let shot = false;
  for (let i = 0; i < 120; i++) {
    game.tick();
    if (game.archery.list.some((a) => a.shooter === "mob:pillager" && a.dmg >= PILLAGER.DAMAGE[0] && a.dmg <= PILLAGER.DAMAGE[1])) shot = true;
  }
  check("kẻ cướp bắn nỏ vào người chơi (3–5 sát thương)", shot && p.state.health < hp, `máu ${p.state.health}`);
  mobs.remove(pil);
  p.state.health = 20;
}
{
  const host = game.life.illagers.host, leader = spawnPatrol(host, X + 20, Z)!;
  const crew = mobs.list.filter((m) => m.leader === leader);
  check("đội tuần tra 2–5 tên: đội trưởng (đeo cờ) có điểm đến, lính đi theo", !!leader && leader.variant === 1 && !!leader.patrolTo &&
    crew.length >= 1 && crew.length <= 4);
  p.flying = true; // không bị nhắm
  const x0 = leader.x, z0 = leader.z;
  ticks(100);
  check("đội trưởng đi về điểm đến, lính bám theo", Math.hypot(leader.x - x0, leader.z - z0) > 3 && crew.every((m) => Math.hypot(m.x - leader.x, m.z - leader.z) < 10));
  p.flying = false;
  for (const m of [...mobs.list]) mobs.remove(m);
}
{
  const al = mobs.spawn("allay", X + 0.5, Y + 1, Z - 2);
  Object.assign(al.body, { x: X + 0.5, y: Y + 0.5, z: Z - 2 });
  al.hist.length = 0;
  p.lookYaw = 0;
  p.pitch = -0.2;
  p.inv.main[p.inv.selected] = stack("wheat", 1);
  game.message(f.conn, JSON.stringify({ t: "useMob", id: al.id }));
  check("đưa món cho tiểu linh: nó cầm món đó, nhận mình là chủ", al.held?.item === "wheat" && al.owner === "An" && !p.inv.held);
  game.items.pop(stack("wheat", 5), X + 10, Y, Z + 8);
  game.items.pop(stack("cobble", 3), X + 9, Y, Z + 8);
  for (const e of game.items.list) e.pickupDelay = 0;
  let got = false, back = false;
  for (let i = 0; i < 400 && !back; i++) {
    game.tick();
    if ((al.bag?.count ?? 0) >= 5) got = true;
    if (got && !al.bag) back = true;
  }
  const near = game.items.list.find((e) => e.stack.item === "wheat" && Math.hypot(e.x - p.x, e.z - p.z) < 4) || p.inv.count("wheat") >= 5;
  check("tiểu linh bay đi nhặt món giống thế (bỏ qua món khác) rồi mang về thả cạnh mình", got && back && !!near &&
    game.items.list.some((e) => e.stack.item === "cobble"));
  Object.assign(al.body, { x: X + 0.5, y: Y + 0.5, z: Z - 2 });
  al.hist.length = 0;
  p.inv.main[p.inv.selected] = null;
  game.message(f.conn, JSON.stringify({ t: "useMob", id: al.id }));
  check("tay không chuột phải: lấy lại món đã đưa", !al.held && p.inv.count("wheat") >= 1);
  mobs.remove(al);
}
{
  let now = 1e6;
  game.archery.clock = () => now;
  p.inv.main.fill(null);
  p.inv.main[p.inv.selected] = stack("crossbow", 1);
  p.inv.add(stack("arrow", 3));
  game.message(f.conn, JSON.stringify({ t: "draw" }));
  now += 500;
  game.message(f.conn, JSON.stringify({ t: "shoot", power: 1 }));
  check("nỏ: lên dây chưa đủ 1.25 giây thì chưa được", p.inv.held?.item === "crossbow" && p.inv.count("arrow") === 3);
  now += CROSSBOW.CHARGE_S * 1000;
  game.message(f.conn, JSON.stringify({ t: "shoot", power: 1 }));
  check("nỏ: đủ 1.25 giây → đã lên dây, tốn 1 mũi tên", p.inv.held?.item === "crossbow_loaded" && p.inv.count("arrow") === 2);
  const n = game.archery.list.length;
  game.message(f.conn, JSON.stringify({ t: "shoot", power: 1 }));
  const a = game.archery.list[game.archery.list.length - 1];
  check("nỏ đã lên dây: bấm là bắn (tên nhanh, 6–11 sát thương), nỏ mòn 1", game.archery.list.length === n + 1 && !!a &&
    a.dmg >= CROSSBOW.DAMAGE[0] && a.dmg <= CROSSBOW.DAMAGE[1] && Math.hypot(a.vx, a.vy, a.vz) > 60 && p.inv.held?.item === "crossbow" && p.inv.held.damage === 1);
}
