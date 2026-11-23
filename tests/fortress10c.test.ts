// Kiểm tra 10c: pháo đài Vực Lửa (2/5 ô lưới, sinh lại y hệt, mảnh không chồng nhau, y 48–70, đủ loại mảnh, lồng quỷ lửa / rương / cầu
// liền qua ranh giới chunk, rương có đồ nether_bridge, /locate fortress); block / công thức / nung; bóng tuyết từ tuyết; hiệu ứng Héo;
// trên server thử: bộ xương héo đánh gây Héo, quỷ lửa nạp lửa rồi bắn loạt 3 cầu lửa nhỏ (cháy), đánh gần, bóng tuyết / nước làm
// mất máu, que quỷ lửa chỉ rơi khi người chơi giết, lồng quỷ lửa sinh quỷ lửa, quái tự sinh trong pháo đài, giáp ngựa, cầu lửa nhỏ châm cổng.
import {
  B, FORTRESS, FORTRESS_SPAWNS, FortressLocator, HORSE_ARMOR_KEYS, MOB_EXTRA, NET, NetherGenerator, SPAWNER_MOBS, STRUCTURE_LOOT, applyEffect,
  blockDrops, blockIndex, createSurvival, matchGrid, netherSeed, seedFromString, smeltResult, stack, tickSurvival,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---------- pháo đài: kế hoạch ----------
const SEED = seedFromString("kiemtra-10c"), NS = netherSeed(SEED), loc = new FortressLocator(NS);
{
  let n = 0, cells = 0, overlap = 0, far = 0, low = 0;
  const kinds = new Set<string>();
  for (let rx = -10; rx < 10; rx++)
    for (let rz = -10; rz < 10; rz++) {
      cells++;
      const f = loc.at(rx, rz);
      if (!f) continue;
      n++;
      if (f.box.y0 < FORTRESS.Y_RANGE[0]) low++;
      const s = f.pieces[0]!.box;
      for (let i = 0; i < f.pieces.length; i++) {
        const a = f.pieces[i]!.box;
        kinds.add(f.pieces[i]!.kind);
        if (Math.abs(a.x0 - s.x0) > FORTRESS.REACH || Math.abs(a.z0 - s.z0) > FORTRESS.REACH) far++;
        for (let j = i + 1; j < f.pieces.length; j++) {
          const b = f.pieces[j]!.box;
          if (a.x1 >= b.x0 && a.x0 <= b.x1 && a.y1 >= b.y0 && a.y0 <= b.y1 && a.z1 >= b.z0 && a.z0 <= b.z1) overlap++;
        }
      }
    }
  check("pháo đài chiếm ~2/5 ô lưới 27 × 27 chunk (3/5 để dành tàn tích pháo đài lợn)", Math.abs(n / cells - 0.4) < 0.08, `${n}/${cells}`);
  check("mảnh không chồng nhau, không xa quá giới hạn, cả pháo đài trong y ≥ 48", overlap === 0 && far === 0 && low === 0, `chồng ${overlap}, xa ${far}, thấp ${low}`);
  check("đủ 14 loại mảnh (cầu, ngã tư, phòng, ngai quỷ lửa, giếng dung nham, hành lang, phòng mụn cóc...)", kinds.size === 14, `${kinds.size}`);
  const f1 = new FortressLocator(NS).at(1, 1) ?? new FortressLocator(NS).at(0, 0), f2 = loc.at(1, 1) ?? loc.at(0, 0);
  check("kế hoạch sinh lại y hệt theo seed", JSON.stringify(f1) === JSON.stringify(f2));
}

// ---------- pháo đài: dựng vào chunk ----------
const gen = new NetherGenerator(SEED), near = loc.nearest(0, 0)!, fort = loc.near(near.x, near.z, near.x, near.z)[0]!;
const chunks = new Map<string, Uint8Array[]>();
const cellAt = (x: number, y: number, z: number): [number, number] => {
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16), k = `${cx},${cz}`;
  let c = chunks.get(k);
  if (!c) { const d = gen.generate(cx, cz); chunks.set(k, (c = [d.data, d.meta])); }
  const i = blockIndex(x - cx * 16, y, z - cz * 16);
  return [c[0]![i]!, c[1]![i]!];
};
{
  const sp = fort.spawners.every(([x, y, z]) => cellAt(x, y, z)[0] === B.SPAWNER && SPAWNER_MOBS[cellAt(x, y, z)[1] & 7] === "blaze");
  const ch = fort.chests.filter(([x, y, z]) => cellAt(x, y, z)[0] === B.CHEST).length;
  check("lồng quỷ lửa (ngai) đúng chỗ, đúng loài; rương ở hành lang rẽ", fort.spawners.length >= 1 && sp && ch >= fort.chests.length - 1,
    `${fort.spawners.length} lồng, rương ${ch}/${fort.chests.length}`);
  // sàn ngã tư cầu đầu tiên (19 × 19, vắt qua 2–3 chunk): toàn gạch Vực Lửa
  const s = fort.pieces[0]!.box;
  let floor = 0, bricks = 0;
  for (let x = s.x0; x <= s.x1; x++) for (let z = s.z0 + 8; z <= s.z0 + 10; z++) { floor++; if (cellAt(x, s.y0 + 4, z)[0] === B.NETHER_BRICKS) bricks++; }
  for (let z = s.z0; z <= s.z1; z++) for (let x = s.x0 + 8; x <= s.x0 + 10; x++) { floor++; if (cellAt(x, s.y0 + 4, z)[0] === B.NETHER_BRICKS) bricks++; }
  check("cầu liền qua ranh giới chunk (sàn ngã tư đầu tiên toàn gạch)", bricks === floor, `${bricks}/${floor}`);
  const again = new NetherGenerator(SEED).generate(Math.floor(s.x0 / 16) + 1, Math.floor(s.z0 / 16));
  check("chunk pháo đài sinh lại y hệt", again.data.every((v, i) => v === cellAt(Math.floor(s.x0 / 16) * 16 + 16 + (i & 15), i >> 8, Math.floor(s.z0 / 16) * 16 + ((i >> 4) & 15))[0]));
  check("bảng đồ rương pháo đài (nether_bridge): kim cương, yên, giáp ngựa, mụn cóc...", ["diamond", "saddle", "golden_horse_armor", "nether_wart"]
    .every((k) => STRUCTURE_LOOT.nether_bridge!.ENTRIES.some((e) => e.item === k)));
}

// ---------- block, công thức, tuyết, Héo ----------
{
  const g = (cells: (string | null)[]): string | undefined => matchGrid(cells, 3)?.out.item;
  check("công thức: gạch Vực Lửa (4 viên), gạch đỏ, hàng rào (6), bột quỷ lửa (2), cầu lửa nhỏ (3), khối tuyết (4 bóng); nung đá lửa ngục → viên gạch",
    g(["nether_brick", "nether_brick", null, "nether_brick", "nether_brick", null, null, null, null]) === "nether_bricks" &&
    g(["nether_wart", "nether_brick", null, "nether_brick", "nether_wart", null, null, null, null]) === "red_nether_bricks" &&
    matchGrid(["nether_bricks", "nether_brick", "nether_bricks", "nether_bricks", "nether_brick", "nether_bricks", null, null, null], 3)?.out.count === 6 &&
    matchGrid(["blaze_rod", null, null, null, null, null, null, null, null], 3)?.out.count === 2 &&
    matchGrid(["blaze_powder", "coal", "gunpowder", null, null, null, null, null, null], 3)?.out.count === 3 &&
    g(["snowball", "snowball", null, "snowball", "snowball", null, null, null, null]) === "snow_block" && smeltResult("netherrack") === "nether_brick");
  const shovel = { kind: "shovel" as const, tier: "wood" as const }, rng = (): number => 0.5;
  check("tuyết: lớp tuyết đào bằng xẻng ra 1 bóng tuyết, khối tuyết ra 4; tay không không rơi gì",
    blockDrops(B.SNOW_LAYER, 0, shovel, rng)[0]?.count === 1 && blockDrops(B.SNOW_BLOCK, 0, shovel, rng)[0]?.count === 4 &&
    blockDrops(B.SNOW_LAYER, 0, null, rng).length === 0 && blockDrops(B.SNOW_BLOCK, 0, null, rng).length === 0);
  const s = createSurvival();
  Object.assign(s, { hunger: 10, saturation: 0 }); // không đủ no để tự hồi máu
  applyEffect(s, "wither", 10);
  for (let t = 0; t < 10.05; t += 0.05) tickSurvival(s, 0.05);
  const s2 = createSurvival();
  Object.assign(s2, { health: 1, hunger: 10, saturation: 0 });
  applyEffect(s2, "wither", 10);
  for (let t = 0; t < 2.1; t += 0.05) tickSurvival(s2, 0.05);
  check("Héo: mất 1 máu mỗi 2 giây (10 giây: 5 máu), không bị giáp giảm, có thể chết", s.health >= 14.9 && s.health <= 15.1 && s2.dead, `máu ${s.health}`);
}

// ---------- server thử ----------
const game = new Game({ seed: "kiemtra-10c", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
for (const r of game.realms) r.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(40);
game.message(f.conn, JSON.stringify({ t: "chat", text: "/locate fortress" }));
const ow = f.msgs.some((m) => m.t === "chat" && "key" in m && m.key === "locateFortressOw");
game.portals.travel(p);
ticks(60);
const r1 = game.realms[1]!, w = r1.w, mobs = r1.life.mobs;
const X = Math.floor(p.x) + 30, Z = Math.floor(p.z), Y = 70;
const arena = (): void => {
  for (let dx = -14; dx <= 14; dx++) for (let dz = -14; dz <= 14; dz++) {
    w.setCell(X + dx, Y - 1, Z + dz, B.NETHERRACK, 0);
    for (let y = Y; y < Y + 12; y++) w.setCell(X + dx, y, Z + dz, 0, 0);
  }
  for (const m of [...mobs.list]) mobs.remove(m);
  r1.archery.list.length = 0;
  Object.assign(p.state, { health: 20, dead: false, vy: 0, invulnS: 0, lastHurt: 0, burnS: 0, fxWitherS: 0 }); // người chơi giả không gửi input
  standAt(p, X + 0.5, Y, Z + 0.5);
};
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(40);
game.message(f.conn, JSON.stringify({ t: "chat", text: "/locate fortress" }));
const msg = [...f.msgs].reverse().find((m) => m.t === "chat" && "key" in m && m.key === "locateFortress");
check("/locate fortress: ở thế giới chính báo tọa độ Vực Lửa (kèm × 8), ở Vực Lửa báo tọa độ + khoảng cách", ow && !!msg, msg && "args" in msg ? msg.args?.join(" ") : "");
{
  arena();
  const ws = mobs.spawn("wither_skeleton", X + 2.5, Y, Z + 0.5);
  for (let i = 0; i < 60 && p.state.health === 20; i++) ticks(1);
  check("bộ xương héo (cao 2.4) đánh trúng: mất máu + hiệu ứng Héo 10 giây", ws.height === 2.4 && p.state.health < 20 && p.state.fxWitherS > 8, `máu ${p.state.health.toFixed(1)}`);
}
{
  arena();
  const bz = mobs.spawn("blaze", X + 9.5, Y + 1, Z + 0.5);
  let charged = -1, first = -1;
  const ids = new Set<number>();
  for (let i = 0; i < 140; i++) {
    ticks(1);
    if (charged < 0 && bz.extra() & MOB_EXTRA.SHOOTING) charged = i;
    const balls = r1.archery.list.filter((a) => a.kind === "small_fireball");
    if (balls.length && first < 0) first = i;
    for (const a of balls) ids.add(a.id);
    p.state.invulnS = 0;
  }
  const hurtFire = p.state.health < 20;
  check("quỷ lửa: nạp lửa 3 giây (bốc cháy) rồi bắn loạt 3 cầu lửa nhỏ; trúng người: mất máu + cháy", charged >= 0 && first - charged >= 55 && ids.size === 3 && hurtFire,
    `nạp ở tick ${charged}, bắn ở ${first}, ${ids.size} quả, máu ${p.state.health.toFixed(1)}`);
  arena();
  const b2 = mobs.spawn("blaze", X + 1.2, Y, Z + 0.5);
  for (let i = 0; i < 30 && p.state.health === 20; i++) ticks(1);
  check("quỷ lửa sát bên: đánh cận chiến", p.state.health < 20 && r1.archery.list.length === 0, `máu ${p.state.health.toFixed(1)}`);
  mobs.remove(b2);
  const b3 = mobs.spawn("blaze", X + 6.5, Y, Z + 0.5), hp = b3.health;
  p.inv.main[p.inv.selected] = stack("snowball", 4);
  p.lookYaw = -Math.PI / 2;
  p.pitch = 0;
  r1.archery.throwHeld(p);
  for (let i = 0; i < 20; i++) ticks(1);
  check("bóng tuyết trúng quỷ lửa: mất 3 máu (qua giáp 6 của nó vẫn ~3)", hp - b3.health >= 2.5, `${(hp - b3.health).toFixed(1)}`);
}
{
  arena();
  const drops = (byPlayer: boolean): number => {
    let rods = 0;
    for (let i = 0; i < 12; i++) {
      r1.items.list.length = 0;
      const b = mobs.spawn("blaze", X + 4.5, Y, Z + 0.5);
      mobs.hurt(b, 100, byPlayer ? "player" : "other", byPlayer ? { by: p } : {});
      ticks(1);
      rods += r1.items.list.filter((it) => it.stack.item === "blaze_rod").reduce((s, it) => s + it.stack.count, 0);
    }
    return rods;
  };
  const a = drops(true), b = drops(false);
  check("que quỷ lửa chỉ rơi khi người chơi giết (0–1 mỗi con)", a > 0 && a <= 12 && b === 0, `người chơi ${a}, khác ${b}`);
}
{
  arena();
  w.setCell(X + 6, Y, Z + 6, B.SPAWNER, SPAWNER_MOBS.indexOf("blaze"));
  r1.life.cages.scan((X + 6) >> 4, (Z + 6) >> 4);
  ticks(80);
  check("lồng quỷ lửa sinh quỷ lửa khi người chơi ở gần", mobs.list.some((m) => m.def.key === "blaze"));
  w.setCell(X + 6, Y, Z + 6, 0, 0);
}
{
  arena();
  const h = mobs.spawn("horse", X + 3.5, Y, Z + 0.5), d = mobs.spawn("donkey", X + 3.5, Y, Z + 4.5);
  h.owner = d.owner = p.name;
  p.inv.main[p.inv.selected] = stack("diamond_horse_armor");
  r1.life.riding.use(p, d);
  const donkeyNo = d.horseArmor === 0 && p.inv.held?.item === "diamond_horse_armor";
  r1.life.riding.use(p, h);
  const worn = h.horseArmor === HORSE_ARMOR_KEYS.indexOf("diamond_horse_armor") && !p.inv.held && (h.extra() >> MOB_EXTRA.HORSE_ARMOR_SHIFT) === 3;
  const hp = h.health;
  mobs.hurt(h, 10, "player", { by: p });
  const lost = hp - h.health;
  p.inv.main[p.inv.selected] = stack("shears");
  r1.life.riding.use(p, h);
  check("giáp ngựa: chỉ ngựa đã thuần đeo được (lừa không); giáp kim cương giảm sát thương; kéo tháo giáp ra",
    donkeyNo && worn && lost < 8 && h.horseArmor === 0 && r1.items.list.some((it) => it.stack.item === "diamond_horse_armor"), `mất ${lost.toFixed(1)}`);
}
{
  arena();
  const PX = X + 2, PZ = Z + 3;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if (i === 0 || i === 3 || j === 0 || j === 4) w.setCell(PX + i, Y + j, PZ, B.OBSIDIAN, 0);
  p.inv.main[p.inv.selected] = stack("fire_charge", 2);
  r1.actions.use(p, { x: PX + 1, y: Y, z: PZ, nx: 0, ny: 1, nz: 0 }, null, false, 0);
  check("cầu lửa nhỏ châm khung đá vỏ chai thành cổng, mất 1 viên", (w.getCell(PX + 1, Y + 1, PZ) & 255) === B.NETHER_PORTAL && p.inv.held?.count === 1);
}
{
  // quái tự sinh trong pháo đài: đứng giữa ngã tư đầu tiên của pháo đài gần nhất
  const f0 = r1.life.nether ? new FortressLocator(NS).nearest(p.x, p.z) : null;
  for (const m of [...mobs.list]) mobs.remove(m);
  if (f0) standAt(p, f0.x + 0.5, f0.y, f0.z + 0.5);
  ticks(120);
  r1.life.spawning = true;
  ticks(500);
  r1.life.spawning = false;
  const allowed = new Set(FORTRESS_SPAWNS.map((e) => e.key)), forts = new FortressLocator(NS);
  const inside = mobs.list.filter((m) => forts.pieceAt(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z)));
  check("trong pháo đài tự sinh quỷ lửa / bộ xương héo / người lợn xác sống... (bảng riêng của pháo đài)",
    inside.length > 0 && inside.every((m) => allowed.has(m.def.key)) && inside.some((m) => m.def.key === "blaze" || m.def.key === "wither_skeleton"),
    [...new Set(inside.map((m) => m.def.key))].join(", "));
}
