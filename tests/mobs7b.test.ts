// Kiểm tra 7b: hiệu ứng (độc, chậm, yếu, sữa), vụ nổ (tia, sát thương), quái nổ, TNT, kẻ hư không, khối nhầy tách, xác khô /
// nhện hang gây hiệu ứng, bộ xương băng, phù thủy, ngọc hư không, lồng sinh quái, đá nhiễm → mọt đá, bóng ma đêm, sinh thế giới.
import {
  B, ChunkGenerator, DAY, NET, applyEffect, createPlayer, eat, explosionBlocks, explosionDamage, FOODS, stepPlayer, type InputFrame,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, frame, standAt } from "./netHelpers.js";

// ---- hiệu ứng ----
{
  const s = createPlayer(0, 70, 0);
  s.hunger = 17; // không tự hồi máu
  applyEffect(s, "poison", 30);
  const air = (): number => 0;
  for (let i = 0; i < 60 * 31; i++) stepPlayer(s, frame() as InputFrame, (_x, y) => (y < 70 ? 3 : air()));
  check("độc: mất máu dần nhưng dừng ở 1 máu, hết 30 giây thì hết độc", s.health === 1 && s.fxPoisonS === 0, `máu ${s.health}`);
  const a = createPlayer(0, 70, 0), b = createPlayer(0, 70, 0);
  applyEffect(b, "slowness", 10);
  for (let i = 0; i < 120; i++) for (const p of [a, b]) stepPlayer(p, frame({ forward: 1 }) as InputFrame, (_x, y) => (y < 70 ? 3 : 0));
  check("chậm: đi được ít hơn 15%", Math.abs(-b.z / -a.z - 0.85) < 0.03, `${(-a.z).toFixed(2)} / ${(-b.z).toFixed(2)}`);
  applyEffect(b, "weakness", 10);
  eat(b, FOODS.milk_bucket!);
  check("xô sữa: hết mọi hiệu ứng", b.fxSlowS === 0 && b.fxWeakS === 0 && b.fxPoisonS === 0);
}

// ---- vụ nổ (dùng chung) ----
{
  const solid = (_x: number, y: number): number => (y < 64 ? B.DIRT : 0);
  const rng = Math.random;
  const holes = explosionBlocks(solid, 0.5, 64, 0.5, 3, rng);
  const obs = explosionBlocks((_x, y) => (y < 64 ? B.OBSIDIAN : 0), 0.5, 64, 0.5, 3, rng);
  const stone = explosionBlocks((_x, y) => (y < 64 ? B.STONE : 0), 0.5, 64, 0.5, 3, rng);
  check("nổ sức 3: đất thủng hố lớn, đá chỉ vỡ ít (sức chống nổ 6), đá vỏ chai không vỡ", holes.length >= 20 && stone.length <= 6 && obs.length === 0, `đất ${holes.length}, đá ${stone.length}`);
  check("sát thương nổ: quái nổ sát mặt 43, TNT 57", explosionDamage(3, 1) === 43 && explosionDamage(4, 1) === 57);
}

// ---- server ----
const game = new Game({ seed: "quai7b", port: 0, spawn: "fixed", debug: true, world: "b", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!, mobs = game.life.mobs;
const sp = game.spawn, X = Math.floor(sp.x) + 80, Z = Math.floor(sp.z), Y = 100;
const stand = (): void => {
  standAt(p, X + 0.5, Y, Z + 0.5);
  Object.assign(p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0, hunger: 20, fxPoisonS: 0, fxSlowS: 0, hungerFxS: 0 });
  p.deathHandled = false;
};
stand();
for (let i = 0; i < 90; i++) game.tick();
const set = (x: number, y: number, z: number, id: number): void => void game.w.setCell(x, y, z, id, 0);
const floor = (): void => {
  for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) set(X + dx, Y - 1, Z + dz, B.STONE);
};
floor();
for (let i = 0; i < 40; i++) game.tick();
const clear = (): void => void mobs.list.splice(0);
clear();
game.clock.set(DAY.SET_MIDNIGHT);
const ticks = (n: number, keep = true): void => {
  for (let i = 0; i < n; i++) {
    if (keep) stand();
    game.tick();
  }
};

// quái nổ
const c = mobs.spawn("creeper", X + 5.5, Y, Z + 0.5);
let boom = false, minH = 20;
for (let i = 0; i < 160 && !boom; i++) {
  game.tick();
  minH = Math.min(minH, p.health);
  boom = !mobs.list.includes(c);
}
let holes = 0;
for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) if (game.w.getCell(X + dx, Y - 1, Z + dz) === B.AIR) holes++;
check("quái nổ đuổi tới, xì rồi nổ: người chơi mất nhiều máu, sàn thủng", boom && minH < 12 && holes > 0, `máu ${minH}, ${holes} ô thủng`);
check("thông báo chết / kẻ gây nổ là quái nổ", p.lastAttacker?.name === "mob:creeper");
floor();
stand();
game.explosions.mobGriefing = false;
const c2 = mobs.spawn("creeper", X + 3.5, Y, Z + 0.5);
for (let i = 0; i < 160 && mobs.list.includes(c2); i++) game.tick();
holes = 0;
for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) if (game.w.getCell(X + dx, Y - 1, Z + dz) === B.AIR) holes++;
check("mobGriefing tắt: quái nổ vẫn nổ nhưng không phá block", !mobs.list.includes(c2) && holes === 0);
game.explosions.mobGriefing = true;
clear();

// TNT
stand();
set(X + 4, Y, Z, B.TNT);
p.inv.main[p.inv.selected] = { item: "flint_and_steel", count: 1, damage: 0 };
p.lookYaw = -Math.PI / 2;
game.message(f.conn, JSON.stringify({ t: "use", hit: { x: X + 4, y: Y, z: Z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 }));
check("bật lửa châm TNT: khối TNT thành TNT đang cháy ngòi", game.w.getCell(X + 4, Y, Z) === B.AIR && game.explosions.primed.length === 1 && f.msgs.some((m) => m.t === "tnt"));
ticks(30);
check("chưa hết ngòi 4 giây thì chưa nổ", game.explosions.primed.length === 1);
ticks(60);
let crater = 0;
for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (game.w.getCell(X + 4 + dx, Y - 1, Z + dz) === B.AIR) crater++;
check("TNT nổ sau 4 giây: hố lớn", game.explosions.primed.length === 0 && crater >= 8, `${crater} ô`);
floor();
for (let i = 0; i < 20; i++) game.tick();
const dropped = game.items.list.filter((e) => e.stack.item === "cobble").reduce((s, e) => s + e.stack.count, 0);
check("TNT: block bị phá rơi đủ", dropped >= crater * 0.8, `${dropped} đá cuội`);
game.items.list.splice(0);

// kẻ hư không
stand();
const em = mobs.spawn("enderman", X + 0.5, Y, Z - 6.5);
p.lookYaw = 0;
p.pitch = Math.atan2(em.eyeY - (Y + 1.62), 6.5);
ticks(10);
check("nhìn vào mặt kẻ hư không: nó tức", em.target === p);
const before = { x: em.x, z: em.z };
p.inv.main[p.inv.selected] = { item: "bow", count: 1, damage: 0 };
game.archery.list.push({ id: 999, x: X + 0.5, y: Y + 2, z: Z - 2, vx: 0, vy: 0, vz: -40, stuck: false, owner: p.id, shooter: "An", crit: false, age: 1, mobOwner: 0, dmg: 0, pickup: true, kind: "arrow" });
em.body.x = X + 0.5; em.body.z = Z - 6.5;
game.archery.tick();
check("bắn tên vào kẻ hư không: nó dịch chuyển đi, không mất máu", em.health === 40 && Math.hypot(em.x - before.x, em.z - before.z) > 1);
clear();

// khối nhầy tách
const sl = mobs.spawn("slime", X + 3.5, Y, Z + 3.5, { variant: 4 });
check("khối nhầy to: 16 máu", sl.health === 16 && Math.abs(sl.width - 2.04) < 1e-6);
mobs.hurt(sl, 100, "player", { by: p });
const smaller = mobs.list.filter((m) => m.def.key === "slime" && !m.dead && m.variant === 2);
check("khối nhầy to chết: tách 2–4 con cỡ vừa", smaller.length >= 2 && smaller.length <= 4);
clear();

// hiệu ứng khi bị đánh
stand();
const hk = mobs.spawn("husk", X + 1.5, Y, Z + 0.5);
ticks(30, false);
check("xác khô đánh trúng: bị đói", p.state.hungerFxS > 0);
mobs.remove(hk);
stand();
const cs = mobs.spawn("cave_spider", X + 1.5, Y, Z + 0.5);
for (let i = 0; i < 40 && p.state.fxPoisonS <= 0; i++) game.tick();
check("nhện hang cắn: trúng độc", p.state.fxPoisonS > 0);
mobs.remove(cs);
stand();
const st = mobs.spawn("stray", X + 0.5, Y, Z + 10.5);
for (let i = 0; i < 160 && p.state.fxSlowS <= 0; i++) {
  Object.assign(p.state, { invulnS: 0, health: 20 });
  game.tick();
}
check("tên bộ xương băng: bị chậm", p.state.fxSlowS > 0);
mobs.remove(st);
stand();
const wi = mobs.spawn("witch", X + 0.5, Y, Z + 6.5);
let witched = false;
for (let i = 0; i < 200 && !witched; i++) {
  game.tick();
  witched = p.health < 20 || p.state.fxPoisonS > 0 || p.state.fxSlowS > 0 || p.state.fxWeakS > 0;
}
check("phù thủy ném bình trúng người chơi", witched && f.msgs.some((m) => m.t === "fx" && m.kind === "splash"));
mobs.remove(wi);
clear();

// ngọc hư không
stand();
p.inv.main[p.inv.selected] = { item: "ender_pearl", count: 2, damage: 0 };
p.lookYaw = 0;
p.pitch = 0.2;
game.archery.clock = () => 1e7;
game.message(f.conn, JSON.stringify({ t: "use", hit: null, src: null, sneaking: false, yaw: 0 }));
for (let i = 0; i < 60 && game.archery.list.length; i++) game.tick();
check("ném ngọc hư không: dịch chuyển tới chỗ ngọc rơi, không mất máu", Math.hypot(p.x - X - 0.5, p.z - Z - 0.5) > 5 && p.health === 20 && p.inv.held?.count === 1,
  `cách ${Math.hypot(p.x - X - 0.5, p.z - Z - 0.5).toFixed(1)}, máu ${p.health}`);

// lồng sinh quái
stand();
set(X + 4, Y, Z + 4, B.SPAWNER);
game.life.cages.scan((X + 4) >> 4, (Z + 4) >> 4);
for (let i = 0; i < 20 * 45; i++) {
  stand();
  game.clock.time = DAY.SET_MIDNIGHT;
  game.tick();
  if (mobs.list.some((m) => m.def.key === "cave_spider")) break;
}
check("lồng sinh quái: có người gần thì sinh nhện hang", mobs.list.some((m) => m.def.key === "cave_spider"), `${game.life.cages.count} lồng`);
clear();
game.w.setCell(X + 4, Y, Z + 4, B.SPAWNER, 1); // lồng xác sống
game.life.cages.scan((X + 4) >> 4, (Z + 4) >> 4);
for (let i = 0; i < 20 * 45 && !mobs.list.some((m) => m.def.key === "zombie"); i++) {
  stand();
  game.clock.time = DAY.SET_MIDNIGHT;
  game.tick();
}
check("lồng xác sống: sinh xác sống", mobs.list.some((m) => m.def.key === "zombie"));
set(X + 4, Y, Z + 4, B.AIR);
clear();

// đá nhiễm
stand();
set(X - 2, Y, Z, B.INFESTED_STONE);
p.inv.main[p.inv.selected] = { item: "diamond_pickaxe", count: 1, damage: 0 };
p.flying = true; // quản trị viên đang bay: đào tức thì (bỏ qua đo thời gian đào)
game.message(f.conn, JSON.stringify({ t: "dig", x: X - 2, y: Y, z: Z }));
p.flying = false;
check("phá đá nhiễm: ra mọt đá", mobs.list.some((m) => m.def.key === "silverfish") && game.w.getCell(X - 2, Y, Z) === B.AIR);
set(X - 4, Y, Z, B.INFESTED_STONE);
set(X - 5, Y, Z, B.INFESTED_STONE);
const sf = mobs.list.find((m) => m.def.key === "silverfish");
if (sf) mobs.hurt(sf, 1, "player", { by: p });
check("đánh mọt đá: mọt trong đá nhiễm quanh đó chui ra", mobs.list.filter((m) => m.def.key === "silverfish").length >= 3);
clear();

// bóng ma đêm
game.life.spawning = true;
p.awakeS = 4000;
p.phantomS = 0;
standAt(p, X + 0.5, Y, Z + 0.5);
game.life.spawner.phantoms([p], DAY.SET_MIDNIGHT, 0.05);
check("thức 3 ngày, ban đêm ngoài trời: bóng ma đêm xuất hiện trên cao", mobs.list.some((m) => m.def.key === "phantom" && m.y > p.y + 15));
game.life.spawning = false;
clear();

// sinh thế giới: lồng sinh quái trong hầm mỏ, đá nhiễm ở núi
{
  const gen = new ChunkGenerator(12345);
  let infested = 0, dungeon = 0;
  const kinds = [0, 0, 0, 0];
  for (let cx = -16; cx < 16; cx++)
    for (let cz = -16; cz < 16; cz++) {
      const { data, meta } = gen.generate(cx, cz);
      for (let i = 0; i < data.length; i++) {
        if (data[i] === B.SPAWNER) {
          kinds[meta[i]! & 3]!++;
          if (data[i - 256] === B.COBBLE || data[i - 256] === B.MOSSY_COBBLE) dungeon++; // sàn hầm quái
        } else if (data[i] === B.INFESTED_STONE) infested++;
      }
    }
  check("sinh thế giới: lồng nhện hang / xác sống / bộ xương, hầm quái (sàn đá cuội), đá nhiễm ở núi",
    kinds[0]! > 0 && kinds[1]! > 0 && kinds[2]! > 0 && dungeon > 0 && infested > 0,
    `lồng [nhện hang, xác sống, bộ xương, nhện] = ${kinds.join(", ")}, hầm quái ${dungeon}, đá nhiễm ${infested}`);
}

// ---- bật lửa châm quái nổ; nhà phù thủy; phù thủy / kẻ hư không không sinh ngẫu nhiên dưới đất ----
{
  clear();
  stand();
  const cr = mobs.spawn("creeper", X + 0.5, Y, Z - 2.5);
  game.life.interact.clock = () => 5e7;
  p.inv.main[p.inv.selected] = { item: "flint_and_steel", count: 1, damage: 0 };
  p.lookYaw = 0;
  p.pitch = -0.3;
  game.message(f.conn, JSON.stringify({ t: "useMob", id: cr.id }));
  check("bật lửa vào quái nổ: châm ngòi, bật lửa mất độ bền", cr.ignited && p.inv.held?.damage === 1);
  p.flying = true; // quái không đuổi; vẫn nổ vì đã châm
  standAt(p, X + 30.5, Y, Z + 0.5);
  p.flying = true;
  for (let i = 0; i < 60 && mobs.list.includes(cr); i++) game.tick();
  p.flying = false;
  check("quái nổ đã bị châm thì nổ dù người chơi đã đi xa", !mobs.list.includes(cr));
  clear();
  floor();
  const { HUT, hutsIn, SPAWN_RULES, TerrainSampler } = await import("../shared/src/index.js");
  const sampler = new TerrainSampler(game.seed);
  const huts = hutsIn(sampler, -3000, -3000, 3000, 3000);
  const gen = new ChunkGenerator(game.seed);
  let planks = 0;
  if (huts[0]) {
    const h = huts[0];
    const d = gen.generate(h.x >> 4, (h.z + 5) >> 4);
    for (let i = 0; i < d.data.length; i++) if (d.data[i] === B.SPRUCE_PLANKS) planks++;
  }
  check("nhà phù thủy: có trong đầm lầy, sinh ra sàn / tường gỗ thông", huts.length > 3 && planks > 20, `${huts.length} nhà trong 6000 × 6000, ${planks} ván thông`);
  check("phù thủy không còn trong bảng sinh quái ngẫu nhiên", !("witch" in SPAWN_RULES.MONSTER_WEIGHTS) && HUT.REGION > 0);
}

// ---- danh sách vật phẩm (/items, ITEMS.md) ----
{
  const { findItems } = await import("../client/src/ui/itemNames.js");
  const meat = findItems("thit bo");
  check("/items tìm theo tên không dấu: \"thit bo\" ra thịt bò sống", meat.some((i) => i.key === "beef") && findItems("tnt")[0]?.key === "tnt" && findItems("").length > 200,
    meat.map((i) => i.key).join(", "));
}
