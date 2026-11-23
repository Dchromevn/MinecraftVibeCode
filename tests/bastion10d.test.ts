// Kiểm tra 10d2: tàn tích pháo đài lợn (cùng lưới với pháo đài, 4 kiểu, không ở đồng bằng bazan, sinh lại y hệt, mảnh không vượt 80
// block, rương đủ 4 bảng đồ, sinh vật đặt sẵn, vẽ vào chunk: gạch đá đen / vàng / lồng khối nhầy dung nham); phế tích cổ (y, không lộ
// ra không khí); netherite (công thức, nung, cấp công cụ / giáp, không cháy trong dung nham); bàn rèn; trên server thử: rèn đồ, mỏ neo
// hồi sinh (nạp, đặt điểm hồi sinh, hồi sinh ở Vực Lửa mất 1 lần nạp, nổ ở thế giới chính), đá nam châm + la bàn, /locate bastion,
// rương tàn tích có đồ, người lợn canh tàn tích.
import {
  B, BastionLocator, FortressLocator, ITEM_TAGS, NB, NET, NetherBiomes, NetherGenerator, SMITH_RULES, SPAWNER_MOBS, STRUCTURE_LOOT, TOOL_TIERS,
  blockDrops, blockIndex, createItemEntity, itemDef, matchGrid, netherSeed, seedFromString, smeltResult, smithResult, stack, stepItem, structureData, weaponStats,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { loadStructures } from "../server/src/structFile.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

void ITEM_TAGS;
loadStructures();
const SEED = seedFromString("kiemtra-10d2"), NS = netherSeed(SEED), bio = new NetherBiomes(NS);
const hasData = !!structureData()?.pools["bastion/starts"];
check("có mẫu tàn tích từ client.jar (npm run import-textures)", hasData);

// ---------- tàn tích: kế hoạch ----------
const loc = new BastionLocator(NS, (x, z) => bio.at(x, z)), forts = new FortressLocator(NS);
{
  let cells = 0, n = 0, both = 0, basalt = 0, far = 0;
  const kinds = new Set<string>(), loot = new Set<string>(), mobs = new Set<string>();
  const nameOf = new Map(Object.entries(structureData()?.templates ?? {}).map(([k, v]) => [v, k]));
  for (let rx = -8; rx < 8; rx++)
    for (let rz = -8; rz < 8; rz++) {
      cells++;
      const b = loc.at(rx, rz), f = forts.at(rx, rz);
      if (b && f) both++;
      if (!b) continue;
      n++;
      if (bio.at(b.x + 8, b.z + 8) === NB.BASALT) basalt++;
      kinds.add(nameOf.get(b.pieces[0]!.t)?.split("/")[1] ?? "?");
      for (const p of b.pieces) if (Math.abs(p.x - b.x) > 80 || Math.abs(p.z - b.z) > 80) far++;
      for (const c of b.chests) loot.add(c[3]);
      for (const m of b.mobs) mobs.add(m[3].split(":")[0]!);
    }
  check("tàn tích ở ~3/5 ô lưới còn lại (trừ đồng bằng bazan), không trùng ô pháo đài, không ở đồng bằng bazan",
    n / cells > 0.4 && n / cells < 0.62 && both === 0 && basalt === 0, `${n}/${cells}`);
  check("đủ 4 kiểu (khu nhà ở, chuồng lợn rừng, kho báu, cầu), mảnh trong 80 block quanh điểm đầu", kinds.size === 4 && far === 0, [...kinds].join(", "));
  check("rương đủ 4 bảng đồ tàn tích; sinh vật đặt sẵn: người lợn, vệ binh, lợn rừng lửa",
    ["bastion_treasure", "bastion_other", "bastion_bridge", "bastion_hoglin_stable"].every((k) => loot.has(k) && STRUCTURE_LOOT[k]) &&
    ["piglin", "piglin_brute", "hoglin"].every((k) => mobs.has(k)), [...loot, ...mobs].join(", "));
  const a = new BastionLocator(NS, (x, z) => bio.at(x, z)).nearest(0, 0), b2 = loc.nearest(0, 0);
  check("kế hoạch sinh lại y hệt theo seed", JSON.stringify(a) === JSON.stringify(b2) && !!a);
}

// ---------- tàn tích + phế tích cổ: vẽ vào chunk ----------
const gen = new NetherGenerator(SEED);
{
  const near = loc.nearest(0, 0)!, b = loc.near(near.x, near.z, near.x, near.z)[0]!;
  const count = new Map<number, number>();
  let spawner = false;
  for (let cx = (b.box.x0 >> 4); cx <= (b.box.x1 >> 4); cx++)
    for (let cz = (b.box.z0 >> 4); cz <= (b.box.z1 >> 4); cz++) {
      const d = gen.generate(cx, cz);
      for (let i = 0; i < d.data.length; i++) {
        count.set(d.data[i]!, (count.get(d.data[i]!) ?? 0) + 1);
        if (d.data[i] === B.SPAWNER && SPAWNER_MOBS[d.meta[i]! & 7] === "magma_cube") spawner = true;
      }
    }
  const c = (id: number): number => count.get(id) ?? 0;
  check("tàn tích vẽ vào chunk: gạch đá đen mài (có viên nứt), đá đen mạ vàng, xích, rương",
    c(B.POLISHED_BLACKSTONE_BRICKS) > 2000 && c(B.CRACKED_POLISHED_BLACKSTONE_BRICKS) > 100 && c(B.GILDED_BLACKSTONE) > 0 && c(B.CHAIN) > 0 && c(B.CHEST) > 0,
    `gạch ${c(B.POLISHED_BLACKSTONE_BRICKS)}, nứt ${c(B.CRACKED_POLISHED_BLACKSTONE_BRICKS)}, mạ vàng ${c(B.GILDED_BLACKSTONE)}, xích ${c(B.CHAIN)}, vàng ${c(B.GOLD_BLOCK)}`);
  // kho báu: lồng khối nhầy dung nham
  let found = spawner;
  for (let rx = -8; rx < 8 && !found; rx++) for (let rz = -8; rz < 8 && !found; rz++) {
    const t = loc.at(rx, rz);
    if (!t?.chests.some((ch) => ch[3] === "bastion_treasure")) continue;
    for (let cx = (t.box.x0 >> 4); cx <= (t.box.x1 >> 4) && !found; cx++)
      for (let cz = (t.box.z0 >> 4); cz <= (t.box.z1 >> 4) && !found; cz++) {
        const d = gen.generate(cx, cz);
        for (let i = 0; i < d.data.length; i++) if (d.data[i] === B.SPAWNER && SPAWNER_MOBS[d.meta[i]! & 7] === "magma_cube") found = true;
      }
  }
  check("phòng kho báu có lồng sinh khối nhầy dung nham", found);
  let deb = 0, low = 0, open = 0;
  for (let cx = 20; cx < 36; cx++)
    for (let cz = 20; cz < 36; cz++) {
      const d = gen.generate(cx, cz).data;
      for (let y = 1; y < 127; y++) for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) {
        if (d[blockIndex(x, y, z)] !== B.ANCIENT_DEBRIS) continue;
        deb++;
        if (y >= 8 && y <= 24) low++;
        if ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b2, c2]) => d[blockIndex(x + a!, y + b2!, z + c2!)] === B.AIR)) open++;
      }
    }
  check("phế tích cổ: ~1–2 khối mỗi chunk, phần lớn ở y 8–24, không khối nào kề không khí", deb / 256 > 0.5 && deb / 256 < 3 && low > deb * 0.5 && open === 0,
    `${deb} khối / 256 chunk, thấp ${low}, lộ ${open}`);
}

// ---------- netherite, bàn rèn, block mới ----------
{
  const g = (grid: (string | null)[]): string | undefined => matchGrid(grid, 3)?.out.item;
  const S = "netherite_scrap", G = "gold_ingot";
  check("công thức: thỏi netherite (4 mảnh + 4 vàng), mỏ neo hồi sinh, đá nam châm, xích, bậc đá đen; nung phế tích cổ → mảnh netherite",
    g([S, S, S, S, G, G, G, G, null]) === "netherite_ingot" && g(["crying_obsidian", "crying_obsidian", "crying_obsidian", "glowstone", "glowstone", "glowstone",
      "crying_obsidian", "crying_obsidian", "crying_obsidian"]) === "respawn_anchor" &&
    g(["chiseled_stone_bricks", "chiseled_stone_bricks", "chiseled_stone_bricks", "chiseled_stone_bricks", "netherite_ingot", "chiseled_stone_bricks",
      "chiseled_stone_bricks", "chiseled_stone_bricks", "chiseled_stone_bricks"]) === "lodestone" &&
    g([null, "iron_nugget", null, null, "iron_ingot", null, null, "iron_nugget", null]) === "chain" &&
    g(["blackstone", null, null, "blackstone", "blackstone", null, "blackstone", "blackstone", "blackstone"]) === "blackstone_stairs" &&
    smeltResult("ancient_debris") === "netherite_scrap");
  const sw = { ...stack("diamond_sword"), damage: 100, ench: { sharpness: 3 } };
  const out = smithResult(stack("netherite_upgrade_smithing_template"), sw, stack("netherite_ingot"));
  check("bàn rèn: khuôn + kiếm kim cương + thỏi netherite → kiếm netherite giữ phù phép / độ bền; thiếu khuôn thì không",
    out?.item === "netherite_sword" && out.ench?.sharpness === 3 && out.damage === 100 && !smithResult(null, sw, stack("netherite_ingot")) &&
    SMITH_RULES.accepts(1, stack("diamond_chestplate")) && !SMITH_RULES.accepts(1, stack("iron_sword")));
  check("netherite: kiếm 8, độ bền 2031, giáp độ cứng 3, đào được phế tích cổ chỉ bằng cuốc kim cương trở lên",
    weaponStats("netherite_sword").damage === 8 && TOOL_TIERS.netherite.durability === 2031 && itemDef("netherite_chestplate")?.armor?.toughness === 3 &&
    blockDrops(B.ANCIENT_DEBRIS, 0, { kind: "pickaxe", tier: "iron" }, Math.random).length === 0 &&
    blockDrops(B.ANCIENT_DEBRIS, 0, { kind: "pickaxe", tier: "diamond" }, Math.random)[0]?.item === "ancient_debris");
  const lava = (x: number, y: number, z: number): number => (y < 64 ? B.LAVA : 0);
  const e1 = createItemEntity(stack("netherite_ingot"), 0.5, 63.5, 0.5, 0, 0, 0, 0), e2 = createItemEntity(stack("diamond"), 0.5, 63.5, 0.5, 0, 0, 0, 0);
  let alive1 = true, alive2 = true;
  for (let i = 0; i < 40; i++) {
    alive1 &&= stepItem(e1, 0.05, lava, null);
    alive2 &&= stepItem(e2, 0.05, lava, null);
  }
  check("đồ netherite rơi vào dung nham thì nổi lên, không cháy (kim cương thì cháy)", alive1 && !alive2 && e1.y > 63.5);
  const gil = Array.from({ length: 400 }, () => blockDrops(B.GILDED_BLACKSTONE, 0, { kind: "pickaxe", tier: "wood" }, Math.random)[0]!);
  const nug = gil.filter((s) => s.item === "gold_nugget").length / 400;
  check("đá đen mạ vàng: ~10% rơi 2–5 mảnh vàng, còn lại rơi chính nó", nug > 0.04 && nug < 0.18, `${(nug * 100).toFixed(0)}%`);
}

// ---------- server thử ----------
const game = new Game({ seed: "kiemtra-10d2", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
for (const r of game.realms) r.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
const msg = (m: object): void => game.message(f.conn, JSON.stringify(m));
ticks(40);
const r0 = game.realms[0]!;
const use = (x: number, y: number, z: number): void => msg({ t: "use", hit: { x, y, z, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 });
{
  const X = Math.floor(p.x) + 2, Y = Math.floor(p.y), Z = Math.floor(p.z);
  p.inv.selected = 0;
  // đá nam châm + la bàn
  r0.w.setCell(X, Y, Z + 3, B.LODESTONE, 0);
  p.inv.main.fill(null);
  p.inv.main[0] = stack("compass", 2);
  use(X, Y, Z + 3);
  const lc = p.inv.main.find((s) => s?.item === "lodestone_compass");
  check("chuột phải đá nam châm bằng la bàn: được la bàn đá nam châm nhớ vị trí + cõi", !!lc && lc.lode?.[0] === X && lc.lode?.[2] === Z + 3 && lc.lode?.[3] === 0 &&
    p.inv.main[0]?.count === 1);
  // bàn rèn
  r0.w.setCell(X, Y, Z - 3, B.SMITHING_TABLE, 0);
  standAt(p, X + 0.5, Y, Z - 1.5);
  use(X, Y, Z - 3);
  const open = p.container?.kind === "smithing" && p.inv.ext.length === 3;
  p.inv.ext[0] = stack("netherite_upgrade_smithing_template");
  p.inv.ext[1] = stack("diamond_pickaxe");
  p.inv.ext[2] = stack("netherite_ingot");
  p.inv.main.fill(null);
  msg({ t: "smithTake" });
  check("bàn rèn mở 3 ô; rèn xong: cuốc netherite vào túi, tiêu khuôn / cuốc / thỏi", open && p.inv.main.some((s) => s?.item === "netherite_pickaxe") &&
    p.inv.ext.every((s) => !s));
  msg({ t: "close" });
  // mỏ neo ở thế giới chính: nạp rồi chuột phải thì nổ (rồi hồi máu cho người chơi thử)
  standAt(p, X - 0.5, Y, Z + 0.5);
  r0.w.setCell(X, Y, Z, B.RESPAWN_ANCHOR, 0);
  p.inv.main[0] = stack("glowstone", 2);
  use(X, Y, Z);
  const charged = (r0.w.getCell(X, Y, Z) >> 8) === 1 && p.inv.main[0]?.count === 1;
  p.inv.main[0] = null;
  use(X, Y, Z);
  ticks(2);
  check("mỏ neo hồi sinh: khối đá phát sáng nạp 1 lần; ở thế giới chính chuột phải thì nổ", charged && (r0.w.getCell(X, Y, Z) & 255) !== B.RESPAWN_ANCHOR);
  Object.assign(p.state, { health: 20, dead: false, invulnS: 0 });
  p.deathHandled = false;
}
msg({ t: "chat", text: "/locate bastion" });
const ow = [...f.msgs].reverse().find((m) => m.t === "chat" && "key" in m && m.key === "locateBastionOw");
game.portals.travel(p);
ticks(60);
const r1 = game.realms[1]!, w = r1.w;
{
  msg({ t: "chat", text: "/locate bastion" });
  const m = [...f.msgs].reverse().find((x) => x.t === "chat" && "key" in x && x.key === "locateBastion");
  check("/locate bastion: ở thế giới chính báo tọa độ Vực Lửa (× 8), ở Vực Lửa báo tọa độ + khoảng cách", !!ow && !!m, m && "args" in m ? m.args?.join(" ") : "");
  // mỏ neo ở Vực Lửa: đặt điểm hồi sinh, chết thì hồi sinh cạnh mỏ neo và mất 1 lần nạp
  const X = Math.floor(p.x) + 3, Y = 70, Z = Math.floor(p.z);
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    w.setCell(X + dx, Y - 1, Z + dz, B.NETHERRACK, 0);
    for (let y = Y; y < Y + 4; y++) w.setCell(X + dx, y, Z + dz, 0, 0);
  }
  w.setCell(X, Y, Z, B.RESPAWN_ANCHOR, 3);
  standAt(p, X - 1.5, Y, Z + 0.5);
  p.inv.main.fill(null);
  use(X, Y, Z);
  const set = p.spawnPoint?.dim === 1 && f.msgs.some((x) => x.t === "chat" && "key" in x && x.key === "anchorSet");
  const at = (game as unknown as { respawnOf(q: typeof p): { x: number; y: number; z: number } }).respawnOf(p);
  check("mỏ neo ở Vực Lửa: chuột phải đặt điểm hồi sinh; hồi sinh cạnh mỏ neo, mất 1 lần nạp", set && p.dim === 1 && Math.hypot(at.x - X, at.z - Z) < 3.5 &&
    (w.getCell(X, Y, Z) >> 8) === 2);
}
{ // rương tàn tích + sinh vật canh: tải chunk quanh tàn tích gần nhất
  const near = loc.nearest(p.x, p.z)!, b = loc.near(near.x, near.z, near.x, near.z)[0]!;
  const ch = b.chests[0]!, lt = STRUCTURE_LOOT[ch[3]]!;
  const items = r1.entities.lootAt(ch[0], ch[1], ch[2]);
  check("rương tàn tích dùng đúng bảng đồ của nó", items === lt, ch[3]);
  for (let cx = (b.box.x0 >> 4); cx <= (b.box.x1 >> 4); cx++) for (let cz = (b.box.z0 >> 4); cz <= (b.box.z1 >> 4); cz++) r1.life.nether!.populate(cx, cz);
  const guards = r1.life.mobs.list.filter((m) => ["piglin", "piglin_brute", "hoglin"].includes(m.def.key) && m.persistent && m.x >= b.box.x0 - 1 && m.x <= b.box.x1 + 1);
  check("chunk tàn tích lần đầu tải: người lợn / vệ binh / lợn rừng lửa canh sẵn (không tự biến mất)", guards.length >= b.mobs.length * 0.9 && guards.length > 3,
    `${guards.length}/${b.mobs.length}`);
}
{ // /locate công trình thế giới chính (người dùng yêu cầu): mọi loại trả lời; làng tìm được và đúng là gần nhất trong vùng dò
  game.portals.travel(p);
  ticks(40);
  const kinds = ["village", "outpost", "witch_hut", "mansion", "pyramid", "igloo", "camp", "shipwreck", "ocean_ruin", "ruined_portal"];
  const t0 = performance.now(), got: string[] = [];
  let now = 1e9;
  game.chat.clock = () => (now += 5000); // chống spam chat: mỗi lệnh cách 5 giây
  for (const k of kinds) {
    const n = f.msgs.length;
    msg({ t: "chat", text: `/locate ${k}` });
    const m = f.msgs.slice(n).find((x) => x.t === "chat" && "key" in x && (x.key === "locateFound" || x.key === "locateNotFound"));
    if (m && "key" in m && m.key === "locateFound") got.push(k);
    else if (!m) got.push(`${k}:?`);
  }
  const ms = performance.now() - t0, n = f.msgs.length;
  msg({ t: "chat", text: "/locate abc" });
  const usage = f.msgs.slice(n).some((x) => x.t === "chat" && "key" in x && x.key === "usage");
  check("/locate village | outpost | witch_hut | mansion | pyramid | igloo | camp | shipwreck | ocean_ruin | ruined_portal: trả lời đủ, tìm thấy làng / cổng đổ nát; sai tên thì báo cách dùng",
    !got.some((g) => g.endsWith(":?")) && got.includes("village") && got.includes("ruined_portal") && usage, `thấy: ${got.join(", ")} (${ms.toFixed(0)} ms)`);
}
