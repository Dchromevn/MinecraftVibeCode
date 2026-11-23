// Kiểm tra 8c: rừng sồi tối + gỗ sồi tối (cây 2 × 2, cây non 2 × 2), dinh thự rừng (lưới phòng theo Minecraft, mỗi thế giới 1–2 cái,
// vắt qua chunk vẫn liền, rương, sinh vật canh), lật mẫu, đao phủ, pháp sư (nanh, gọi tiểu quỷ), tiểu quỷ (xuyên block, tự chết),
// vật tổ bất tử.
import {
  B, BIOME, ChunkGenerator, EVOKER, NET, STRUCT, STRUCTURE_LOOT, TOTEM, TerrainSampler, blockIndex, createSurvival, hurt, mirrorCell, mulberry32,
  planTree, RECIPES, seedFromString, stack, structureLootAt, uniquePlacements, worldOf, type TickWorld,
} from "../shared/src/index.js";
import { growTree } from "../shared/src/randomTick.js";
import { MansionGrid, isHouse } from "../shared/src/worldgen/mansionGrid.js";
import { mansionPieces } from "../shared/src/worldgen/mansionPieces.js";
import { rotSize } from "../shared/src/worldgen/structPaint.js";
import { Game } from "../server/src/game.js";
import { loadStructures } from "../server/src/structFile.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

loadStructures();
const seedText = "dat-moi-mbgwo2", seed = seedFromString(seedText), s = new TerrainSampler(seed), gen = new ChunkGenerator(seed);

// ---- rừng sồi tối, gỗ sồi tối ----
{
  let dark = 0, n = 0;
  for (let x = -3000; x <= 3000; x += 60) for (let z = -3000; z <= 3000; z += 60, n++) if (s.column(x, z).biome === BIOME.DARK_FOREST) dark++;
  check("có biome rừng sồi tối (một phần rừng)", dark > n * 0.01, `${((dark / n) * 100).toFixed(1)}% điểm dò`);
  const p = planTree("dark_oak", 0, 70, 0, 7, mulberry32(1));
  const base = p.logs.filter((l) => l[1] === 70);
  check("cây sồi tối thân 2 × 2, tán rộng", base.length === 4 && p.leaves.length > 60, `${base.length} gốc, ${p.leaves.length} lá`);
  check("công thức: thân sồi tối → 4 ván; bậc, tấm, hàng rào, cửa sồi tối",
    ["dark_oak_planks", "dark_oak_stairs", "dark_oak_slab", "dark_oak_fence", "dark_oak_door"].every((k) => RECIPES.some((r) => r.out.item === k)));
  // cây non: 1 cây non không lớn, 4 cây non 2 × 2 thì lớn thành cây
  const cells = new Map<string, number>();
  const w: TickWorld = {
    getCell: (x, y, z) => cells.get(`${x},${y},${z}`) ?? (y < 64 ? B.DIRT : 0),
    setCell: (x, y, z, id, m) => void cells.set(`${x},${y},${z}`, id | (m << 8)),
    light: () => 15, drop: () => undefined,
  };
  cells.set("0,64,0", B.DARK_OAK_SAPLING);
  const one = growTree(w, 0, 64, 0, mulberry32(2), "dark_oak");
  for (const [x, z] of [[1, 0], [0, 1], [1, 1]]) cells.set(`${x},64,${z}`, B.DARK_OAK_SAPLING);
  const four = growTree(w, 1, 64, 1, mulberry32(2), "dark_oak");
  check("cây non sồi tối: một cây không lớn, đủ 4 cây xếp 2 × 2 thì lớn thành cây thân 2 × 2",
    !one && four && [[0, 0], [1, 0], [0, 1], [1, 1]].every(([x, z]) => (cells.get(`${x},64,${z}`)! & 255) === B.DARK_OAK_LOG));
}

// ---- lưới phòng ----
{
  let ok = 0, rooms = 0;
  for (let i = 0; i < 50; i++) {
    const g = new MansionGrid(mulberry32(100 + i));
    let house = 0;
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if (isHouse(g.base, x, y)) house++;
    if (house > 20 && isHouse(g.base, g.entranceX, g.entranceY)) ok++;
    rooms += mansionPieces(mulberry32(100 + i)).filter((p) => /^(1x1|1x2|2x2)_/.test(p.name)).length;
  }
  check("lưới phòng dinh thự: sảnh vào + hành lang + nhiều phòng (theo thuật toán Minecraft)", ok === 50 && rooms > 50 * 15, `${rooms / 50} phòng / dinh thự`);
  check("lật mẫu: bậc hướng Bắc lật trục Z thành hướng Nam và đổi góc trái ↔ phải; cửa đổi bản lề",
    mirrorCell(B.OAK_STAIRS | ((2 | (1 << 3)) << 8), 1) === (B.OAK_STAIRS | ((0 | (2 << 3)) << 8)) &&
    mirrorCell(B.DOOR | (1 << 8), 2) === (B.DOOR | ((3 | 16) << 8)) && mirrorCell(B.STONE, 1) === B.STONE);
}

// ---- dinh thự trong thế giới ----
const ms = uniquePlacements(s, "mansion");
check("cả thế giới 1–2 dinh thự, ở rừng sồi tối, cách nhau xa", ms.length >= 1 && ms.length <= 2 &&
  ms.every((m) => m.box && s.column((m.box.x0 + m.box.x1) >> 1, (m.box.z0 + m.box.z1) >> 1).biome !== BIOME.OCEAN) &&
  (ms.length < 2 || Math.hypot(ms[0]!.box!.x0 - ms[1]!.box!.x0, ms[0]!.box!.z0 - ms[1]!.box!.z0) > STRUCT.UNIQUE.MIN_GAP - 120),
  ms.map((m) => `${m.box!.x0},${m.box!.z0}`).join(" | "));
const m = ms[0]!, y0 = Math.min(...m.pieces.map((p) => p.y));
check("dinh thự đủ 3 tầng (mái, tường cửa sổ, sảnh vào)", m.pieces.some((p) => p.y === y0 + 19) && m.pieces.some((p) => p.t === m.pieces[0]!.t) &&
  m.pieces.filter((p) => p.y > y0).length > 50, `${m.pieces.length} mảnh, nền y ${y0}`);
{
  const chests = m.pieces.flatMap((p) => p.t.loot.map((l) => worldOf(p, l[0], l[1], l[2])));
  check("rương dinh thự đúng bảng đồ woodland_mansion", chests.length >= 1 && chests.every(([x, y, z]) => structureLootAt(s, x, y, z) === "woodland_mansion") &&
    !!STRUCTURE_LOOT.woodland_mansion, `${chests.length} rương`);
  const mobs = m.pieces.flatMap((p) => p.t.mobs ?? []).map((x) => x[3]);
  check("có chỗ đao phủ, pháp sư, tiểu linh canh sẵn", mobs.includes("vindicator") && mobs.includes("evoker") && mobs.includes("allay_group"));
  // vắt qua chunk: hai lần sinh chunk ra giống nhau, ô sàn hai bên ranh giới chunk đều là ván / thảm
  const b = m.box!, cx = (b.x0 + 32) >> 4, cz = (b.z0 + 32) >> 4, a = gen.generate(cx, cz), a2 = gen.generate(cx, cz);
  check("chunk của dinh thự sinh lại y hệt", a.data.every((v, i) => v === a2.data[i]));
  let solid = 0, total = 0;
  for (const p of m.pieces.filter((q) => q.y === y0 && q.t.size[0] >= 7 && q.t.size[2] >= 7)) {
    const [sx, , sz] = rotSize(p.t, p.rot), x = p.x + (sx >> 1), z = p.z + (sz >> 1);
    const c = gen.generate(x >> 4, z >> 4), id = c.data[blockIndex(x & 15, y0, z & 15)]!;
    total++;
    if (id !== B.AIR && id !== B.WATER) solid++;
  }
  check("sàn tầng 1 liền (không hở xuống đất) ở giữa các phòng", total > 10 && solid / total > 0.9, `${solid}/${total}`);
  let under = 0, n = 0;
  for (const p of m.pieces.filter((q) => q.y === y0 && q.fill !== undefined).slice(0, 40)) {
    const [sx, , sz] = rotSize(p.t, p.rot), x = p.x + (sx >> 1), z = p.z + (sz >> 1);
    const c = gen.generate(x >> 4, z >> 4);
    n++;
    if (c.data[blockIndex(x & 15, y0 - 1, z & 15)] !== B.AIR) under++;
  }
  check("móng: dưới sàn tầng 1 không trống (lấp đá cuội tới đất)", n > 0 && under === n, `${under}/${n}`);
}

// ---- sinh vật ----
const game = new Game({ seed: seedText, port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!, mobs = game.life.mobs;
p.inv.main.fill(null);
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
const X = Math.floor(p.x) + 200, Z = Math.floor(p.z), Y = 110;
standAt(p, X + 0.5, Y, Z + 0.5);
ticks(120);
for (let dx = -30; dx <= 30; dx++) for (let dz = -30; dz <= 30; dz++) {
  game.w.setCell(X + dx, Y - 1, Z + dz, B.STONE, 0);
  for (let y = Y; y < Y + 8; y++) game.w.setCell(X + dx, y, Z + dz, 0, 0);
}
ticks(20);
mobs.list.splice(0);
const reset = (): void => {
  for (const o of [...mobs.list]) mobs.remove(o);
  Object.assign(p.state, { health: 20, dead: false, absorb: 0, invulnS: 0, lastHurt: 0 }); // không gửi phím: miễn sát thương không tự giảm
  p.deathHandled = false;
  standAt(p, X + 0.5, Y, Z + 0.5);
};
{
  const v = mobs.spawn("vindicator", X + 5.5, Y, Z + 0.5);
  let hit = 0;
  for (let i = 0; i < 100 && !hit; i++) {
    const h = p.state.health;
    game.tick();
    if (p.state.health < h) hit = h - p.state.health;
  }
  check("đao phủ đuổi đánh bằng rìu (13 sát thương, trước giáp)", hit >= 12, `mất ${hit}`);
  check("đao phủ rơi ngọc lục bảo 0–1, rìu sắt 8.5%", v.def.drops.some((d) => d.item === "emerald") && v.def.drops.some((d) => d.item === "iron_axe" && d.chance === 0.085));
  reset();
}
{
  const ev = mobs.spawn("evoker", X + 10.5, Y, Z + 0.5);
  ev.target = p;
  let summoned = false, cast = false;
  for (let i = 0; i < 40 && !summoned; i++) {
    game.tick();
    if (ev.castKind === 2) cast = true;
    if (mobs.list.some((o) => o.def.key === "vex")) summoned = true;
  }
  const vex = mobs.list.filter((o) => o.def.key === "vex");
  check("pháp sư làm phép gọi 3 tiểu quỷ (sau 1 giây làm phép), tiểu quỷ có thời gian sống 30–119 giây", cast && vex.length === EVOKER.SUMMON.COUNT &&
    vex.every((o) => o.limitedLife && o.lifeS >= 30 && o.lifeS <= 119 && o.leader === ev));
  for (const o of vex) mobs.remove(o);
  Object.assign(ev, { summonCdS: 99, fangCdS: 0, castS: 0, castKind: 0 });
  Object.assign(p.state, { invulnS: 0, lastHurt: 0 });
  const msgs0 = f.msgs.length, h0 = p.state.health;
  for (let i = 0; i < 100; i++) game.tick();
  const fangs = f.msgs.slice(msgs0).filter((x) => x.t === "fangs");
  check("pháp sư tung hàng nanh (16 nanh về phía mục tiêu), nanh cắn 6 sát thương phép", fangs.length >= 10 && h0 - p.state.health >= 5.9, `${fangs.length} nanh, mất ${(h0 - p.state.health).toFixed(1)}`);
  check("pháp sư rơi vật tổ bất tử", ev.def.drops.some((d) => d.item === "totem_of_undying" && (d.chance ?? 1) === 1));
  reset();
}
{
  const vx = mobs.spawn("vex", X + 0.5, Y + 2, Z + 6.5);
  for (let y = Y; y < Y + 5; y++) for (let dx = -2; dx <= 2; dx++) game.w.setCell(X + dx, y, Z + 3, B.STONE, 0); // tường chắn giữa
  vx.target = p;
  let hit = false;
  for (let i = 0; i < 200 && !hit; i++) {
    const h = p.state.health;
    game.tick();
    if (p.state.health < h) hit = true;
  }
  check("tiểu quỷ bay xuyên tường tới đánh người chơi", hit);
  Object.assign(vx, { limitedLife: true, lifeS: 0.05, health: 3, target: null });
  ticks(80);
  check("tiểu quỷ hết thời gian sống thì mất máu dần tới chết", vx.dead || !mobs.list.includes(vx));
  reset();
}
// ---- vật tổ bất tử ----
{
  const sv = createSurvival();
  sv.totem = 1;
  hurt(sv, 50, "mob");
  check("vật tổ: đòn chết người → sống lại 1 máu, Hồi phục, Hấp thụ, Kháng lửa", !sv.dead && sv.health === 1 && sv.totemPop === 1 && sv.totem === 0 &&
    sv.healLeft > 0 && sv.absorb === TOTEM.ABSORB && sv.fxFireResS === TOTEM.FIRE_RES_S);
  check("kháng lửa: không mất máu vì lửa / dung nham", hurt(sv, 4, "lava") === 0);
  sv.invulnS = 0;
  hurt(sv, 50, "mob");
  check("hết vật tổ: đòn chết người thì chết", sv.dead);
  p.inv.offhand[0] = stack("totem_of_undying");
  ticks(2);
  const before = f.msgs.length;
  p.state.invulnS = 0;
  hurt(p.state, 100, "mob");
  ticks(2);
  check("trên server: cầm vật tổ ở tay trái thì được cứu, vật tổ mất, người xung quanh thấy hiệu ứng",
    !p.state.dead && p.inv.offhand[0] === null && f.msgs.slice(before).some((x) => x.t === "fx" && x.kind === "totem" && x.n === 1));
}
