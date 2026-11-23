// Kiểm tra 7e: mẫu công trình nhập từ client.jar, xoay mẫu, kim tự tháp sa mạc (4 rương, 9 TNT, tấm áp lực, ô xanh), lều tuyết
// (đồng bằng tuyết, không cây), cổng đổ nát, trại bỏ hoang (lều + khu lửa trại), mỗi loại 1–2 cái cả thế giới, đồ trong rương,
// bẫy tấm áp lực châm TNT.
import {
  B, BlockEntities, ChunkGenerator, STRUCTURE_LOOT, STRUCT, TerrainSampler, isSnowyPlains, rotateCell, seedFromString, structureData,
  structureLootAt, structuresIn, uniquePlacements, worldOf, type Placement,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { loadStructures } from "../server/src/structFile.js";
import { check } from "./harness.js";

const hasData = loadStructures();
check("đã nạp mẫu công trình từ client.jar (npm run import-textures)", hasData && Object.keys(structureData()!.templates).length > 100);

// ---- xoay ----
{
  const stairs = B.STONE_BRICK_STAIRS | ((2 | 4) << 8); // phía cao hướng Bắc, lật ngược
  check("xoay 90°: bậc hướng Bắc → Đông (giữ lật ngược); giường, đuốc tường xoay theo",
    rotateCell(stairs, 1) === (B.STONE_BRICK_STAIRS | ((3 | 4) << 8)) && rotateCell(B.BED | (0 << 8), 2) === (B.BED | (2 << 8)) &&
    rotateCell(B.TORCH | (1 << 8), 1) === (B.TORCH | (2 << 8)) && rotateCell(B.STONE, 3) === B.STONE);
}

const seedText = "kiemtra-7e", seed = seedFromString(seedText), s = new TerrainSampler(seed), gen = new ChunkGenerator(seed);
/** Đếm block trong các chunk mà công trình chiếm. */
function scan(p: Placement): Map<number, number> {
  const cnt = new Map<number, number>(), seen = new Set<string>();
  for (const a of p.pieces) {
    const [ax, , az] = worldOf(a, 0, 0, 0), [bx, , bz] = worldOf(a, a.t.size[0] - 1, 0, a.t.size[2] - 1);
    for (let cx = Math.min(ax, bx) >> 4; cx <= Math.max(ax, bx) >> 4; cx++)
      for (let cz = Math.min(az, bz) >> 4; cz <= Math.max(az, bz) >> 4; cz++) {
        if (seen.has(`${cx},${cz}`)) continue;
        seen.add(`${cx},${cz}`);
        for (const id of gen.generate(cx, cz).data) cnt.set(id, (cnt.get(id) ?? 0) + 1);
      }
  }
  return cnt;
}

// ---- mỗi loại 1–2 cái cả thế giới (người dùng chọn), cách nhau xa ----
for (const k of ["desert_pyramid", "igloo", "camp"] as const) {
  const ps = uniquePlacements(s, k);
  const far = ps.length < 2 || Math.hypot(ps[0]!.pieces[0]!.x - ps[1]!.pieces[0]!.x, ps[0]!.pieces[0]!.z - ps[1]!.pieces[0]!.z) > STRUCT.UNIQUE.MIN_GAP - 50;
  check(`${k}: cả thế giới 1–2 cái, gần gốc`, ps.length >= 1 && ps.length <= 2 && far &&
    ps.every((p) => Math.hypot(p.pieces[0]!.x, p.pieces[0]!.z) < STRUCT.UNIQUE.MAX_R + 50), `${ps.length} cái`);
}

// ---- kim tự tháp ----
{
  const p = uniquePlacements(s, "desert_pyramid")[0]!, c = scan(p);
  check("kim tự tháp: 9 TNT, 1 tấm áp lực, 4 rương, ô đất nung xanh dương, đất nung cam",
    c.get(B.TNT) === 9 && c.get(B.STONE_PRESSURE_PLATE) === 1 && (c.get(B.CHEST) ?? 0) >= 4 && c.get(B.BLUE_TERRACOTTA) === 1 && (c.get(B.ORANGE_TERRACOTTA) ?? 0) > 20,
    `TNT ${c.get(B.TNT)}, rương ${c.get(B.CHEST)}`);
  const piece = p.pieces[0]!, chests = piece.t.loot.map(([x, y, z]) => worldOf(piece, x, y, z));
  check("rương kim tự tháp có bảng đồ riêng", chests.length === 4 && chests.every(([x, y, z]) => structureLootAt(s, x, y, z) === "desert_pyramid"));
  const be = new BlockEntities(seed);
  be.lootAt = (x, y, z) => STRUCTURE_LOOT[structureLootAt(s, x, y, z) ?? ""] ?? null;
  const [x, y, z] = chests[0]!, slots = (be.obtain(x, y, z, B.CHEST) as { slots: ({ item: string } | null)[] }).slots;
  check("mở rương kim tự tháp: có đồ (xương, thuốc súng, cát, tơ...)", slots.filter(Boolean).length >= 4, slots.filter(Boolean).map((s) => s!.item).join(","));
}

if (hasData) {
  // ---- lều tuyết ----
  const ig = uniquePlacements(s, "igloo")[0]!, top = ig.pieces[ig.pieces.length - 1]!;
  const [tx, ty, tz] = worldOf(top, 3, 0, 4), near = new Map<number, number>();
  for (let x = top.x - 1; x <= top.x + 8; x++)
    for (let z = top.z - 1; z <= top.z + 8; z++)
      for (let y = ty; y < ty + 6; y++) {
        const id = gen.generate(x >> 4, z >> 4).data[(y * 16 + (z & 15)) * 16 + (x & 15)]!;
        near.set(id, (near.get(id) ?? 0) + 1);
      }
  check("lều tuyết: ở đồng bằng tuyết, không cây quanh lều, có khối tuyết, cửa sổ băng", isSnowyPlains(s.column(tx, tz)) &&
    (near.get(B.SNOW_BLOCK) ?? 0) >= 80 && (near.get(B.ICE) ?? 0) >= 2 && !near.get(B.SPRUCE_LOG) && !near.get(B.SPRUCE_LEAVES));
  const basement = ig.pieces.length > 1;
  if (basement) {
    const bot = ig.pieces.find((a) => a.t.loot.length)!, [lx, ly, lz] = worldOf(bot, ...bot.t.loot[0]!.slice(0, 3) as [number, number, number]);
    const be = new BlockEntities(seed);
    be.lootAt = (x, y, z) => STRUCTURE_LOOT[structureLootAt(s, x, y, z) ?? ""] ?? null;
    const slots = (be.obtain(lx, ly, lz, B.CHEST) as { slots: ({ item: string } | null)[] }).slots;
    check("hầm lều tuyết: rương luôn có táo vàng", slots.some((x) => x?.item === "golden_apple"));
  }
  // ---- trại bỏ hoang ----
  const camp = uniquePlacements(s, "camp")[0]!, cc = scan(camp);
  check("trại bỏ hoang: lều bậc len trắng + khu lửa trại, có rương / thùng có bảng đồ",
    camp.pieces.length === 2 && (cc.get(B.WHITE_WOOL_STAIRS) ?? 0) > 10 && camp.pieces.some((a) => a.t.loot.length > 0), `${camp.pieces.length} mảnh`);
  // ---- cổng đổ nát ----
  const portals = structuresIn(s, -2000, -2000, 2000, 2000).filter((p) => p.kind === "ruined_portal");
  const pc = scan(portals[0]!);
  check("cổng đổ nát: nhiều (theo vùng như Minecraft), có đá vỏ chai + đá lửa ngục", portals.length > 10 &&
    (pc.get(B.OBSIDIAN) ?? 0) + (pc.get(B.CRYING_OBSIDIAN) ?? 0) >= 5 && (pc.get(B.NETHERRACK) ?? 0) > 20, `${portals.length} cổng`);
}

// ---- 7f: tàu đắm, tàn tích đại dương (mỗi loại 1–2 cái cả thế giới), rương luôn còn, xác đuối canh tàn tích ----
if (hasData) {
  for (const k of ["shipwreck", "ocean_ruin"] as const) {
    const ps = uniquePlacements(s, k);
    check(`${k}: cả thế giới 1–2 cái, gần gốc`, ps.length >= 1 && ps.length <= 2, `${ps.length} cái`);
  }
  const ship = uniquePlacements(s, "shipwreck")[0]!, sp = ship.pieces[0]!, sc = scan(ship);
  const sChests = sp.t.loot.map(([x, y, z]) => worldOf(sp, x, y, z));
  check("tàu đắm: gỗ + rương có bảng đồ tàu đắm, nằm ở biển / bãi biển",
    (sc.get(B.PLANKS) ?? 0) + (sc.get(B.SPRUCE_PLANKS) ?? 0) + (sc.get(B.OAK_STAIRS) ?? 0) > 30 && sChests.length >= 1 &&
    sChests.every(([x, y, z]) => (structureLootAt(s, x, y, z) ?? "").startsWith("shipwreck_") &&
      (gen.generate(x >> 4, z >> 4).data[(y * 16 + (z & 15)) * 16 + (x & 15)] === B.CHEST)), sChests.map((c) => c.join(",")).join(" "));
  const ruin = uniquePlacements(s, "ocean_ruin")[0]!, rp = ruin.pieces[0]!;
  const rChests = ruin.pieces.flatMap((p) => p.t.loot.map(([x, y, z]) => worldOf(p, x, y, z)));
  check("tàn tích đại dương: rương luôn còn (dù block bị mất ngẫu nhiên), bảng đồ tàn tích", rChests.length >= 1 &&
    rChests.every(([x, y, z]) => (structureLootAt(s, x, y, z) ?? "").startsWith("ruin_") && gen.generate(x >> 4, z >> 4).data[(y * 16 + (z & 15)) * 16 + (x & 15)] === B.CHEST));
  const guards = ruin.pieces.flatMap((p) => (p.t.mobs ?? []).map(([x, y, z]) => worldOf(p, x, y, z)));
  if (guards.length) {
    const game = new Game({ seed: seedText, port: 0, spawn: "fixed", debug: true, world: "r", admins: [], adminAll: true, dataDir: null });
    const [gx, gy, gz] = guards[0]!;
    game.w.cellLoading(gx, gy, gz);
    const d = game.life.mobs.list.filter((m) => m.def.key === "drowned" && m.persistent);
    check("tải chunk tàn tích lớn: xác đuối canh sẵn, không tự biến mất", d.length >= 1, `${d.length} con`);
  }
  void rp;
}

// ---- bẫy: dẫm tấm áp lực → TNT ngay dưới cháy ngòi ----
{
  const game = new Game({ seed: seedText, port: 0, spawn: "fixed", debug: true, world: "t", admins: [], adminAll: true, dataDir: null });
  const X = Math.floor(game.spawn.x) + 3, Z = Math.floor(game.spawn.z) + 3, Y = 100;
  game.w.cellLoading(X, Y, Z); // chưa có người chơi: tự tải chunk
  game.w.setCell(X, Y - 1, Z, B.STONE, 0);
  game.w.setCell(X, Y - 3, Z, B.TNT, 0);
  game.w.setCell(X, Y, Z, B.STONE_PRESSURE_PLATE, 0);
  game.ticker.stepPlates([{ x: X + 0.5, y: Y, z: Z + 0.5 }], []);
  check("dẫm tấm áp lực: TNT 3 block bên dưới cháy ngòi (khối TNT biến mất)", (game.w.getCell(X, Y - 3, Z) & 255) === B.AIR);
}
