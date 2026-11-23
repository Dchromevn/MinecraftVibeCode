// Kiểm tra 10b: 5 biome Vực Lửa (tỉ lệ như Minecraft, rừng đỏ thẫm không giáp bazan, cong vênh không giáp thung lũng), khối mặt
// từng biome, nấm khổng lồ vắt qua chunk vẫn liền, vũng dung nham bazan kín; luật block (bột xương, mụn cóc, nylium, lửa linh hồn),
// công thức; sinh vật trên server thử: người lợn xác sống trung lập + cả bầy tức, ma bay bắn cầu lửa / đánh bật cầu lửa giết ma
// bay, khối nhầy dung nham tách + không cháy, kẻ lội đi trên dung nham / lạnh trên cạn / cưỡi bằng cần câu nấm, lợn rừng lửa húc
// hất lên / sợ nấm cong vênh / phối giống, sinh quái theo biome.
import {
  B, NB, NETHER, NETHER_SPAWNS, NET, NetherBiomes, NetherGenerator, applyBoneMeal, blockDrops, blockIndex, hasSupport, makeCell,
  matchGrid, mulberry32, netherSeed, randomTick, seedFromString, stack, type TickWorld,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---------- biome ----------
{
  const nb = new NetherBiomes(netherSeed(seedFromString("kiemtra-10b"))), cnt = [0, 0, 0, 0, 0];
  let badPair = 0;
  for (let x = -2400; x < 2400; x += 8)
    for (let z = -2400; z < 2400; z += 8) {
      const b = nb.at(x, z), e = nb.at(x + 8, z), s = nb.at(x, z + 8);
      cnt[b]!++;
      for (const o of [e, s]) {
        const pair = [b, o].sort().join();
        if (pair === [NB.CRIMSON, NB.BASALT].sort().join() || pair === [NB.SOUL_VALLEY, NB.WARPED].sort().join()) badPair++;
      }
    }
  const tot = cnt.reduce((a, b) => a + b, 0), pct = cnt.map((c) => (c / tot) * 100);
  const want = [36.3, 17.1, 22.2, 8.5, 15.9];
  check("5 biome Vực Lửa, tỉ lệ gần Minecraft (±6%)", pct.every((p, i) => Math.abs(p - want[i]!) < 6), pct.map((p) => p.toFixed(1)).join(" / "));
  check("rừng đỏ thẫm không giáp đồng bằng bazan, rừng cong vênh không giáp thung lũng (gần như không bao giờ)", badPair < tot * 0.002, `${badPair}`);
}

// ---------- khối mặt, đặc điểm ----------
const gen = new NetherGenerator(seedFromString("voxel"));
const chunkIn = (b: number): [number, number] => {
  for (let r = 0; r < 200; r += 2) for (let cx = -r; cx <= r; cx += 2) for (const cz of [-r, r]) if (gen.biomeAt(cx * 16 + 8, cz * 16 + 8) === b &&
    gen.biomeAt(cx * 16 - 24, cz * 16 - 24) === b && gen.biomeAt(cx * 16 + 40, cz * 16 + 40) === b) return [cx, cz];
  return [0, 0];
};
const count = (b: number): Map<number, number> => {
  const [cx, cz] = chunkIn(b), m = new Map<number, number>();
  for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (const id of gen.generate(cx + dx, cz + dz).data) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
};
{
  const sv = count(NB.SOUL_VALLEY), cr = count(NB.CRIMSON), wa = count(NB.WARPED), ba = count(NB.BASALT);
  const has = (m: Map<number, number>, ids: number[]): boolean => ids.every((id) => (m.get(id) ?? 0) > 0);
  check("thung lũng cát linh hồn: cát + đất linh hồn, cột bazan / khối xương", has(sv, [B.SOUL_SAND, B.SOUL_SOIL]) && ((sv.get(B.BASALT) ?? 0) + (sv.get(B.BONE_BLOCK) ?? 0)) > 0);
  check("rừng đỏ thẫm: nylium đỏ, thân + mũ nấm, rễ, dây leo rủ", has(cr, [B.CRIMSON_NYLIUM, B.CRIMSON_STEM, B.NETHER_WART_BLOCK, B.CRIMSON_ROOTS, B.WEEPING_VINES]));
  check("rừng cong vênh: nylium cong vênh, thân + mũ nấm, rễ, dây xoắn", has(wa, [B.WARPED_NYLIUM, B.WARPED_STEM, B.WARPED_WART_BLOCK, B.WARPED_ROOTS, B.TWISTING_VINES]));
  check("đồng bằng bazan: bazan, đá đen, magma", has(ba, [B.BASALT, B.BLACKSTONE, B.MAGMA_BLOCK]) && (ba.get(B.BASALT) ?? 0) > 2000);
}
{
  // nấm khổng lồ vắt qua ranh giới chunk: thân ở cột x = 15 của chunk A thì chunk B (bên phải) có mũ nấm ở cột x = 0..1 quanh đỉnh
  const [cx, cz] = chunkIn(NB.CRIMSON);
  let stems = 0, joined = 0;
  for (let k = 0; k < 6; k++) for (let r = 0; r < 4; r++) {
    const a = gen.generate(cx + k, cz + r), b = gen.generate(cx + k + 1, cz + r);
    for (let z = 2; z < 14; z++) for (const sx of [14, 15]) {
      let top = -1;
      for (let y = 32; y < 120; y++) if (a.data[blockIndex(sx, y, z)] === B.CRIMSON_STEM) top = y;
      // chỉ thân mảnh (bên trái không phải thân), thân không bị cắt ngắn bởi trần
      if (top < 0 || a.data[blockIndex(sx - 1, top, z)] === B.CRIMSON_STEM || (sx === 14 && a.data[blockIndex(15, top, z)] === B.CRIMSON_STEM)) continue;
      stems++;
      let hat = false;
      for (let y = top - 9; y <= top + 1; y++) for (const x of [0, 1]) if (b.data[blockIndex(x, y, z)] === B.NETHER_WART_BLOCK || b.data[blockIndex(x, y, z)] === B.SHROOMLIGHT) hat = true;
      if (hat) joined++;
    }
  }
  check("nấm khổng lồ sát ranh giới chunk: mũ nấm sang cả chunk bên cạnh", stems > 0 && joined >= stems * 0.8, `${joined}/${stems}`);
  const a1 = gen.generate(cx + 2, cz), a2 = new NetherGenerator(seedFromString("voxel")).generate(cx + 2, cz);
  check("chunk rừng đỏ thẫm sinh lại y hệt (bộ sinh mới, thứ tự khác)", a1.data.every((v, i) => v === a2.data[i]));
}
{
  // vũng dung nham bazan: mọi ô dung nham trên mực biển có 4 bên + dưới không trống (trừ dòng chảy từ vách)
  const [cx, cz] = chunkIn(NB.BASALT);
  let pools = 0, leaky = 0;
  for (let k = 0; k < 4; k++) {
    const d = gen.generate(cx + k, cz).data;
    for (let x = 1; x < 15; x++) for (let z = 1; z < 15; z++) for (let y = NETHER.LAVA_LEVEL + 2; y < 120; y++) {
      if (d[blockIndex(x, y, z)] !== B.LAVA || d[blockIndex(x, y + 1, z)] !== B.AIR || d[blockIndex(x, y - 1, z)] === B.AIR) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, c]) => d[blockIndex(x + a!, y, z + c!)] === B.AIR).length;
      if (open === 0) pools++;
      else if (open > 1) leaky++;
    }
  }
  check("đồng bằng bazan có vũng dung nham kín (viền magma / bazan)", pools > 5 && leaky === 0, `${pools} ô, ${leaky} hở`);
}

// ---------- luật block ----------
function mkWorld() {
  const m = new Map<string, number>();
  const w: TickWorld = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
    light: () => 0, drop: () => undefined,
  };
  return { w, id: (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) & 255, meta: (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) >> 8 };
}
{
  const { w, id } = mkWorld();
  w.setCell(0, 10, 0, B.CRIMSON_NYLIUM, 0);
  w.setCell(0, 11, 0, B.CRIMSON_FUNGUS, 0);
  let n = 0;
  while (id(0, 11, 0) === B.CRIMSON_FUNGUS && n < 50) { applyBoneMeal(w, 0, 11, 0, mulberry32(n)); n++; }
  let stem = 0, wart = 0;
  for (let y = 11; y < 40; y++) for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    if (id(x, y, z) === B.CRIMSON_STEM) stem++;
    if (id(x, y, z) === B.NETHER_WART_BLOCK) wart++;
  }
  const { w: w2, id: id2 } = mkWorld();
  w2.setCell(0, 10, 0, B.WARPED_NYLIUM, 0);
  w2.setCell(0, 11, 0, B.CRIMSON_FUNGUS, 0);
  const wrong = applyBoneMeal(w2, 0, 11, 0, mulberry32(1));
  check("bột xương: nấm đỏ thẫm trên nylium đỏ thẫm (40%) thành nấm khổng lồ; trên nylium khác loại thì không", stem >= 4 && wart > 10 && !wrong && id2(0, 11, 0) === B.CRIMSON_FUNGUS, `${n} lần, thân ${stem}, mũ ${wart}`);
}
{
  const { w, meta } = mkWorld();
  w.setCell(0, 10, 0, B.SOUL_SAND, 0);
  w.setCell(0, 11, 0, B.NETHER_WART, 0);
  const rng = mulberry32(3);
  let t = 0;
  while (meta(0, 11, 0) < 3 && t < 2000) { randomTick(w, 0, 11, 0, rng); t++; }
  const ripe = blockDrops(B.NETHER_WART, 3, null, mulberry32(2))[0]!, young = blockDrops(B.NETHER_WART, 1, null, mulberry32(2))[0]!;
  check("mụn cóc Vực Lửa lớn trong tối trên cát linh hồn (tuổi 3), chín rơi 2–4, non rơi 1", meta(0, 11, 0) === 3 && ripe.count >= 2 && ripe.count <= 4 && young.count === 1, `${t} random tick`);
  const at = (a: number) => (x: number, y: number, z: number): number => (y === 10 ? a : 0);
  check("chỗ bám: mụn cóc chỉ trên cát linh hồn; nấm trên nylium / đất linh hồn; lửa linh hồn trên cát / đất linh hồn",
    hasSupport(B.NETHER_WART, 0, 11, 0, at(B.SOUL_SAND)) && !hasSupport(B.NETHER_WART, 0, 11, 0, at(B.DIRT)) &&
    hasSupport(B.WARPED_FUNGUS, 0, 11, 0, at(B.SOUL_SOIL)) && !hasSupport(B.WARPED_FUNGUS, 0, 11, 0, at(B.STONE)) &&
    hasSupport(B.SOUL_FIRE, 0, 11, 0, at(B.SOUL_SOIL)) && !hasSupport(B.SOUL_FIRE, 0, 11, 0, at(B.NETHERRACK)));
  const { w: w3, id: id3 } = mkWorld();
  w3.setCell(0, 10, 0, B.WARPED_NYLIUM, 0);
  w3.setCell(0, 11, 0, B.STONE, 0);
  randomTick(w3, 0, 10, 0, rng);
  const nyl = blockDrops(B.CRIMSON_NYLIUM, 0, { kind: "pickaxe", tier: "wood" }, rng)[0]?.item;
  check("nylium bị khối đặc đè thành đá lửa ngục; đào nylium ra đá lửa ngục", id3(0, 10, 0) === B.NETHERRACK && nyl === "netherrack");
  const g = (cells: (string | null)[]): string | undefined => matchGrid(cells, 3)?.out.item;
  check("công thức: ván nấm từ thân nấm, đuốc linh hồn, cần câu nấm, khối xương, bazan mài",
    g(["crimson_stem", null, null, null, null, null, null, null, null]) === "crimson_planks" &&
    g(["coal", null, null, "stick", null, null, "soul_soil", null, null]) === "soul_torch" &&
    g([null, null, "stick", null, "stick", "string", "stick", "warped_fungus", "string"]) === "warped_fungus_on_a_stick" &&
    g(Array(9).fill("bone_meal")) === "bone_block" && g(["basalt", "basalt", null, "basalt", "basalt", null, null, null, null]) === "polished_basalt");
}

// ---------- sinh vật (server thử) ----------
const game = new Game({ seed: "kiemtra-10b", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
for (const r of game.realms) r.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(40);
game.portals.travel(p);
ticks(60);
const r1 = game.realms[1]!, w = r1.w, mobs = r1.life.mobs;
const X = Math.floor(p.x) + 30, Z = Math.floor(p.z), Y = 70;
/** Sân thử: sàn đá lửa ngục, trống cao 12, rộng ±14. */
const arena = (): void => {
  for (let dx = -14; dx <= 14; dx++) for (let dz = -14; dz <= 14; dz++) {
    w.setCell(X + dx, Y - 1, Z + dz, B.NETHERRACK, 0);
    for (let y = Y; y < Y + 12; y++) w.setCell(X + dx, y, Z + dz, 0, 0);
  }
  for (const m of [...mobs.list]) mobs.remove(m);
  r1.archery.list.length = 0;
  Object.assign(p.state, { health: 20, vy: 0, invulnS: 0, lastHurt: 0 }); // người chơi giả không gửi input nên thời gian bất tử không tự giảm
};
const heal = (): void => void Object.assign(p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0 });
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(40);
{
  arena();
  standAt(p, X + 0.5, Y, Z + 0.5);
  const a = mobs.spawn("zombified_piglin", X + 3.5, Y, Z + 0.5), b = mobs.spawn("zombified_piglin", X + 12.5, Y, Z + 8.5);
  ticks(60);
  const calm = !a.target && p.state.health === 20;
  mobs.hurt(a, 1, "player", { by: p, from: { x: p.x, z: p.z } });
  ticks(60);
  check("người lợn xác sống trung lập; đánh một con thì cả bầy tức và đánh lại", calm && a.target === p && b.target === p && p.state.health < 20, `máu ${p.state.health.toFixed(1)}`);
  check("người lợn xác sống không cháy trong dung nham / lửa", !mobs.hurt(a, 4, "lava") && !mobs.hurt(a, 1, "fire"));
}
{
  arena();
  standAt(p, X + 0.5, Y, Z + 0.5);
  const gh = mobs.spawn("ghast", X + 10.5, Y + 1, Z + 0.5);
  let shot = false;
  for (let i = 0; i < 120 && !shot; i++) { ticks(1); shot = r1.archery.list.some((a) => a.kind === "fireball"); }
  check("ma bay nhắm người chơi ngang tầm, há miệng rồi bắn cầu lửa", shot && gh.target === p);
  // đánh bật cầu lửa: đặt cầu lửa trước mặt, nhìn về phía ma bay, vung tay
  const fb = r1.archery.list.find((a) => a.kind === "fireball")!;
  Object.assign(fb, { x: p.x + 2, y: p.y + 1.6, z: p.z, vx: -16, vy: 0, vz: 0 });
  p.lookYaw = -Math.PI / 2; // nhìn về +X
  p.pitch = 0;
  heal();
  r1.archery.deflect(p);
  const back = fb.owner === p.id && fb.vx > 10;
  for (let i = 0; i < 60 && !gh.dead; i++) ticks(1);
  check("vung tay đánh bật cầu lửa: bay ngược lại, trúng ma bay thì ma bay chết", back && gh.dead, `vx ${fb.vx.toFixed(1)}`);
  arena();
  standAt(p, X + 0.5, Y, Z + 0.5);
  const gh2 = mobs.spawn("ghast", X + 10.5, Y + 4, Z + 0.5);
  r1.archery.ghastFireball(gh2, p);
  for (let i = 0; i < 40; i++) ticks(1);
  check("cầu lửa trúng người: mất máu, nổ có lửa quanh đó", p.state.health < 20 && [...Array(9)].some((_, k) =>
    [...Array(9)].some((__, j) => (w.getCell(X - 4 + k, Y, Z - 4 + j) & 255) === B.FIRE)), `máu ${p.state.health.toFixed(1)}`);
}
{
  arena();
  heal();
  const big = mobs.spawn("magma_cube", X + 6.5, Y, Z + 0.5, { variant: 4 });
  const okHp = big.health === 16;
  mobs.hurt(big, 100, "player", { by: p });
  ticks(2);
  const kids = mobs.list.filter((m) => m.def.key === "magma_cube" && !m.dead && m.variant === 2).length;
  check("khối nhầy dung nham to (16 máu) chết thì tách 2–4 con vừa", okHp && kids >= 2 && kids <= 4, `${kids}`);
}
{
  arena();
  // hồ dung nham 7 × 7 sâu 2
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    w.setCell(X + dx, Y - 1, Z + dz, B.LAVA, 0);
    w.setCell(X + dx, Y - 2, Z + dz, B.LAVA, 0);
    w.setCell(X + dx, Y - 3, Z + dz, B.NETHERRACK, 0);
  }
  const s = mobs.spawn("strider", X + 0.5, Y, Z + 0.5);
  ticks(60);
  const onLava = Math.abs(s.y - Y) < 0.2 && s.health === 20 && !s.cold;
  const land = mobs.spawn("strider", X + 8.5, Y, Z + 8.5);
  ticks(10);
  check("kẻ lội dung nham đứng trên mặt dung nham không mất máu; trên cạn thì lạnh", onLava && land.cold, `y ${s.y.toFixed(2)}`);
  mobs.remove(land);
  // cưỡi: yên → lên lưng, cầm cần câu nấm thì đi theo hướng nhìn trên dung nham
  standAt(p, X + 2.5, Y, Z + 0.5);
  p.inv.main[p.inv.selected] = stack("saddle");
  r1.life.riding.use(p, s);
  p.inv.main[p.inv.selected] = null;
  r1.life.riding.use(p, s);
  const rode = s.saddled && p.state.rideId === s.id;
  p.inv.main[p.inv.selected] = stack("warped_fungus_on_a_stick");
  ticks(2);
  const x0 = p.x;
  // 1 giây: mỗi tick server (20/giây) gửi 3 bước vật lý (60/giây); nạp sẵn hạn mức bước (không phụ thuộc đồng hồ thật)
  const still = { forward: 0, strafe: 0, jump: false, sneak: false, sprint: false, yaw: Math.PI / 2, respawn: false, eat: false };
  for (let i = 0; i < 20; i++) {
    p.budget = NET.INPUT_BURST;
    r1.movement.input(p, { firstSeq: p.lastSeq + 1, frames: [still, still, still], pitch: 0, yaw: Math.PI / 2, swing: p.swing, fly: null });
    ticks(1);
  }
  r1.actions.use(p, null, null, false, 0);
  check("cưỡi kẻ lội: yên + cần câu nấm → tự đi theo hướng nhìn trên dung nham; chuột phải: tăng tốc, cần câu mòn",
    rode && p.state.rideControl === 2 && x0 - p.x > 2.5 && p.state.rideBoostLen > 0 && (p.inv.held?.damage ?? 0) === 1, `đi ${(x0 - p.x).toFixed(2)} block`);
  p.state.rideId = 0;
}
{
  arena();
  heal();
  standAt(p, X + 0.5, Y, Z + 0.5);
  const h = mobs.spawn("hoglin", X + 3.5, Y, Z + 0.5);
  let tossed = false;
  for (let i = 0; i < 80 && !tossed; i++) { ticks(1); tossed = p.state.health < 20 && p.state.vy > 0; }
  check("lợn rừng lửa đuổi húc: mất máu 3–8, bị hất lên", tossed, `máu ${p.state.health.toFixed(1)}`);
  standAt(p, X - 12.5, Y, Z + 0.5);
  heal();
  w.setCell(X + 2, Y, Z, B.WARPED_FUNGUS, 0);
  Object.assign(h.body, { x: X + 3.5, z: Z + 0.5 });
  h.target = null;
  ticks(60);
  check("lợn rừng lửa tránh nấm cong vênh", Math.hypot(h.x - X - 2.5, h.z - Z - 0.5) > 5, `cách ${Math.hypot(h.x - X - 2.5, h.z - Z - 0.5).toFixed(1)}`);
  w.setCell(X + 2, Y, Z, 0, 0);
  arena();
  standAt(p, X - 12.5, Y, Z + 0.5);
  const h1 = mobs.spawn("hoglin", X + 4.5, Y, Z + 0.5), h2 = mobs.spawn("hoglin", X + 6.5, Y, Z + 0.5);
  for (const m of [h1, h2]) { p.inv.main[p.inv.selected] = stack("crimson_fungus"); r1.life.interact.hooks[0]!(p, m); }
  ticks(100);
  const baby = mobs.list.find((m) => m.def.key === "hoglin" && m.baby);
  check("cho lợn rừng lửa ăn nấm đỏ thẫm: phối giống ra lợn con (con lớn dần)", !!baby && baby.growS < 1e11);
}
{
  // sinh quái theo biome: chỉ loài trong bảng Vực Lửa
  arena();
  for (const m of [...mobs.list]) mobs.remove(m);
  r1.life.spawning = true;
  standAt(p, X + 0.5, Y, Z + 0.5);
  ticks(400);
  const allowed = new Set(NETHER_SPAWNS.flat().map((e) => e.key).concat("strider"));
  const keys = mobs.list.map((m) => m.def.key);
  check("Vực Lửa tự sinh quái theo biome (người lợn xác sống, ma bay, khối nhầy dung nham...), không có quái thế giới chính",
    keys.length > 0 && keys.every((k) => allowed.has(k)), [...new Set(keys)].join(", "));
  r1.life.spawning = false;
}
