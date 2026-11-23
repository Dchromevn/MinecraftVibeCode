// Kiểm tra 8a (phần 1 — sinh làng): mẫu làng nhập từ client.jar, mật độ (như Minecraft: vùng 34 × 34 chunk), nhà đặt khớp mặt đất
// (móng đặc, khối ghép cửa ngay trên mặt đất), đường bám mặt đất, cây tự nhiên không mọc đè, rương làng có bảng đồ, chunk sinh
// độc lập vẫn liền mạch; nhà tự lưu (/structure save) xuất hiện trong làng mới, làng đã sinh không đổi.
import {
  B, ChunkGenerator, STRUCTURE_LOOT, VILLAGE, blockIndex, captureStructure, resetVillageCustoms, seedFromString, setCustomStructures,
  structureData, structureLootAt, villageAt, villageCut, villageCuts, pinVillageCuts, worldOf, type VillagePlan,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { loadStructures } from "../server/src/structFile.js";
import { check } from "./harness.js";

check("đã nạp mẫu làng (5 loại: đồng cỏ, sa mạc, đồng cỏ khô, tuyết, rừng thông)",
  loadStructures() && ["plains", "desert", "savanna", "snowy", "taiga"].every((t) => structureData()!.pools[`village/${t}/town_centers`]?.length));

resetVillageCustoms();
const seed = seedFromString("dat-moi-mbgwo2"), gen = new ChunkGenerator(seed), s = gen.sampler;
const all: VillagePlan[] = [];
for (let rx = -4; rx <= 4; rx++) for (let rz = -4; rz <= 4; rz++) {
  const v = villageAt(s, rx, rz);
  if (v) all.push(v);
}
const nearest = Math.min(...all.map((v) => Math.hypot(v.x, v.z)));
check("mật độ như Minecraft: nhiều làng trong 9 × 9 vùng 544 block, làng gần gốc nhất < 1500 block (vài phút bay)",
  all.length >= 8 && nearest < 1500, `${all.length} làng, gần nhất ${nearest.toFixed(0)}`);
check("đủ các loại làng", new Set(all.map((v) => v.type)).size >= 4, [...new Set(all.map((v) => v.type))].join(","));
check("mỗi làng nhiều nhà (≥ 3 nhà) và nằm trong 80 block từ tâm",
  all.every((v) => v.pieces.filter((p) => !p.terrain && p.t.size[1] > 4).length >= 3 &&
    v.pieces.every((p) => Math.abs(p.x - v.x) <= VILLAGE.MAX_DIST && Math.abs(p.z - v.z) <= VILLAGE.MAX_DIST)));

// sinh các chunk của một làng
const v = all.find((x) => x.type === "plains") ?? all[0]!;
const chunks = new Map<string, { data: Uint8Array; meta: Uint8Array }>();
const chunk = (cx: number, cz: number) => {
  const k = `${cx},${cz}`;
  let c = chunks.get(k);
  if (!c) chunks.set(k, (c = gen.generate(cx, cz)));
  return c;
};
const at = (x: number, y: number, z: number): number => chunk(x >> 4, z >> 4).data[blockIndex(x & 15, y, z & 15)]!;
let houses = 0, solidBelow = 0, jigOk = 0;
for (const p of v.pieces) {
  if (p.terrain || p.t.size[1] <= 4 || p === v.pieces[0]) continue;
  houses++;
  const [cx, , cz] = worldOf(p, p.t.size[0] >> 1, 0, p.t.size[2] >> 1), below = at(cx, p.y - 1, cz);
  if (below !== B.AIR && below !== B.WATER) solidBelow++;
  const j = p.t.jig.find((q) => q[4] === "building_entrance");
  if (j) {
    const [jx, jy, jz] = worldOf(p, j[0], j[1], j[2]), col = s.column(jx, jz);
    if (Math.abs(jy - (Math.max(col.height, col.waterTop) + 1)) <= 1) jigOk++;
  }
}
check("nhà không lơ lửng: dưới giữa nhà là block đặc (móng lấp đất)", houses > 0 && solidBelow / houses >= 0.95, `${solidBelow}/${houses}`);
check("cửa nhà nằm ngay trên mặt đất (khối ghép cửa ở độ cao mặt đất + 1)", jigOk / houses >= 0.9, `${jigOk}/${houses}`);
let path = 0, onGround = 0;
for (const p of v.pieces.filter((q) => q.terrain)) {
  const c = p.t.cells;
  for (let i = 0; i < c.length; i += 4 * 7) {
    if ((p.t.pal[c[i + 3]!]! & 255) !== B.DIRT_PATH || c[i + 1] !== 0) continue;
    const [x, , z] = worldOf(p, c[i]!, 0, c[i + 2]!), col = s.column(x, z);
    if (col.waterTop > col.height) continue;
    path++;
    if ([B.DIRT_PATH, B.GRASS].includes(at(x, col.height, z) as never) || at(x, col.height, z) !== B.AIR) onGround++;
  }
}
check("đường làng bám mặt đất (đường đất thay lớp cỏ trên cùng)", path > 20 && onGround === path, `${onGround}/${path}`);
let logsOnPath = 0;
for (const p of v.pieces.filter((q) => q.terrain))
  for (let i = 0; i < p.t.cells.length; i += 4) {
    if (p.t.cells[i + 1] !== 0 || (p.t.pal[p.t.cells[i + 3]!]! & 255) !== B.DIRT_PATH) continue;
    const [x, , z] = worldOf(p, p.t.cells[i]!, 0, p.t.cells[i + 2]!), h = s.column(x, z).height;
    if (at(x, h + 1, z) === B.LOG || at(x, h + 1, z) === B.SPRUCE_LOG) logsOnPath++;
  }
check("cây tự nhiên không mọc trên đường làng", logsOnPath === 0, `${logsOnPath}`);
const chestAt = v.pieces.flatMap((p) => p.t.loot.map((l) => [...worldOf(p, l[0], l[1], l[2]), l[3]] as const));
check("rương làng có bảng đồ theo nghề (thợ rèn, nhà đồng cỏ...)", all.some((x) => x.pieces.some((p) => p.t.loot.length)) &&
  chestAt.every(([x, y, z, k]) => structureLootAt(s, x, y, z) === k && !!STRUCTURE_LOOT[k]), `${chestAt.length} rương`);
{
  const p = v.pieces.find((q) => !q.terrain && q.t.size[0] > 6)!, [x, , z] = worldOf(p, 1, 0, 1);
  const a = new ChunkGenerator(seed).generate(x >> 4, z >> 4), b = chunk(x >> 4, z >> 4);
  check("chunk của làng sinh lại (bộ sinh khác, thứ tự khác) ra y hệt", a.data.every((d, i) => d === b.data[i]) && a.meta.every((d, i) => d === b.meta[i]));
}

// ---- nhà tự lưu ----
{
  // nhà 5 × 4 × 5 bằng ván, cửa ở mặt nam (z lớn)
  const house = (x: number, y: number, z: number): number => {
    if (x < 0 || x > 4 || z < 0 || z > 4 || y < 0 || y > 3) return 0;
    if (x === 2 && z === 4 && (y === 1 || y === 2)) return B.DOOR | ((y === 2 ? 8 : 0) << 8);
    return x === 0 || x === 4 || z === 0 || z === 4 || y === 0 || y === 3 ? B.PLANKS : 0;
  };
  const t = captureStructure((x, y, z) => house(x - 100, y - 70, z - 100), [100, 70, 100], [104, 73, 104], 102, 71, 110);
  const ok = typeof t !== "string";
  check("/structure save: chụp vùng thành mẫu, khối ghép cửa ở mặt có cửa (nam), ngang chân cửa",
    ok && t.size.join() === "5,4,5" && t.jig[0]![3] === "south_up" && t.jig[0]![0] === 2 && t.jig[0]![2] === 4 && t.jig[0]![1] === 1);
  check("/structure save: vùng quá to → lỗi", captureStructure(() => 0, [0, 70, 0], [60, 70, 60], 0, 0, 0) === "size");
  if (ok) {
    const before = villageAt(s, Math.floor(v.x / 544), Math.floor(v.z / 544))!;
    pinVillageCuts(before.x >> 4, before.z >> 4); // vùng đã sinh: chốt mốc 0
    setCustomStructures([{ name: "nha_toi", t }]);
    const same = villageAt(s, Math.floor(v.x / 544), Math.floor(v.z / 544))!;
    check("có nhà tự lưu mới: làng đã sinh (đã chốt mốc) không đổi", same.pieces.length === before.pieces.length && villageCut(Math.floor(v.x / 544), Math.floor(v.z / 544)) === 0);
    let found = 0, total = 0;
    for (let rx = 5; rx <= 12; rx++) for (let rz = -4; rz <= 4; rz++) {
      const nv = villageAt(s, rx, rz);
      if (!nv) continue;
      total++;
      if (nv.pieces.some((p) => p.t === t)) found++;
    }
    check("nhà tự lưu xuất hiện trong các làng mới sinh", total > 0 && found >= Math.ceil(total / 2), `${found}/${total} làng`);
    check("mốc vùng lưu được (gửi client)", villageCuts(true).length >= 3);
  }
  resetVillageCustoms();
}

// ---- sinh vật đặt sẵn trong làng (server) ----
{
  const game = new Game({ seed: "dat-moi-mbgwo2", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
  const vv = villageAt(s, Math.floor(v.x / 544), Math.floor(v.z / 544))!;
  for (let cx = (vv.x - 96) >> 4; cx <= (vv.x + 96) >> 4; cx++) for (let cz = (vv.z - 96) >> 4; cz <= (vv.z + 96) >> 4; cz++) game.life.spawner.structureMobs(cx, cz);
  const ms = game.life.mobs.list, vills = ms.filter((m) => m.def.key === "villager");
  const jobs = vills.filter((m) => (m.vill?.prof ?? 0) >= 2).length;
  check("làng có dân làng (đa số có nghề theo bàn nghề), người sắt, mèo; dân làng nhớ chỗ nhà",
    vills.length >= 3 && jobs >= vills.length / 2 && ms.some((m) => m.def.key === "iron_golem") && vills.every((m) => !!m.home),
    `${vills.length} dân làng (${jobs} có nghề), ${ms.filter((m) => m.def.key === "iron_golem").length} người sắt, ${ms.filter((m) => m.def.key === "cat").length} mèo`);
  const n = ms.length;
  game.life.spawner.structureMobs(vv.x >> 4, vv.z >> 4);
  check("tải lại chunk: không sinh trùng", game.life.mobs.list.length === n);
}
