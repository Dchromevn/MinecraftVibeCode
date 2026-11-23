// Nhập mẫu công trình từ client.jar (Giai đoạn 7e; © Mojang — chỉ dùng trên máy, KHÔNG commit): lều tuyết, cổng đổ nát, trại
// bỏ hoang (lều + khu lửa trại ghép bằng khối jigsaw). Đổi block sang block của game (scripts/mcBlockMap.ts), ghi
// client/public_mc/structures.json — client (Vite phục vụ) và server (đọc file) cùng dùng để sinh thế giới giống hệt nhau.
//   chạy trong npm run import-textures (sau phần texture)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { B, CAMP_BIOME_POOLS, SPAWNER_MOBS, STRUCTURE_DATA_VERSION, VILLAGE_TYPES, type StructureData, type StructTemplate } from "../shared/src/index.js";
import { openJar } from "./jarZip.js";
import { mapBlock, substituted } from "./mcBlockMap.js";
import { readNbt, readTemplate, type Nbt } from "./nbt.js";

const root = process.cwd();
const jar = openJar(join(root, "assets-src/minecraft"));
if (!jar) {
  console.log("[import-structures] Chưa có client.jar: game chạy không có lều tuyết / cổng đổ nát / trại bỏ hoang.");
  process.exit(0);
}
const S = "data/minecraft/structure/", POOLS = "data/minecraft/worldgen/template_pool/";
/** (7f) Khối dữ liệu → bảng đồ của rương ngay dưới nó (tàu đắm). */
const MARKER_LOOT: Record<string, string> = { supply_chest: "shipwreck_supply", map_chest: "shipwreck_map", treasure_chest: "shipwreck_treasure" };
const LOOT: Record<string, string> = {
  "chests/igloo_chest": "igloo", "chests/ruined_portal": "ruined_portal", "chests/desert_pyramid": "desert_pyramid",
  "chests/abandoned_camp_common_chest": "camp_common", "chests/abandoned_camp_secret_chest": "camp_secret", "barrels/abandoned_camp_barrel": "camp_barrel",
  "chests/pillager_outpost": "pillager_outpost", // 8b
  "chests/bastion_treasure": "bastion_treasure", "chests/bastion_other": "bastion_other", "chests/bastion_bridge": "bastion_bridge", // 10d2
  "chests/bastion_hoglin_stable": "bastion_hoglin_stable",
};
/** (8c) Khối dữ liệu của dinh thự → sinh vật canh sẵn; hướng rương. */
const MANSION_MOB: Record<string, string> = { Warrior: "vindicator", Mage: "evoker", "Group of Allays": "allay_group" };
const MANSION_DIR: Record<string, number> = { South: 0, West: 1, North: 2, East: 3 };
/** "minecraft:dirt_path[axis=y]" → ô của game. */
function parseState(s: string): number {
  const m = /^(?:minecraft:)?([a-z_0-9]+)(?:\[(.*)\])?$/.exec(s);
  if (!m) return 0;
  const props: Record<string, string> = {};
  for (const kv of (m[2] ?? "").split(",").filter(Boolean)) {
    const [k, v] = kv.split("=");
    props[k!] = v!;
  }
  return mapBlock(m[1]!, props) ?? 0;
}

function template(name: string): StructTemplate | null {
  const buf = jar!.read(`${S}${name}.nbt`);
  if (!buf) return null;
  const t = readTemplate(buf), ents = (readNbt(buf).entities ?? []) as { blockPos: number[]; nbt: { [k: string]: Nbt } }[];
  const pal: number[] = [], palIndex = new Map<number, number>(), cells: number[] = [];
  const out: StructTemplate = { size: t.size, pal, cells, loot: [], jig: [], mobs: [] };
  for (const b of t.blocks) {
    const mb = t.palette[b.state]!;
    let c: number | null;
    if (mb.name === "structure_block") {
      // (7f) khối dữ liệu: rương tàu đắm (rương ở ngay dưới), rương tàn tích (đặt rương tại đây), xác đuối canh tàn tích
      const md = String(b.nbt?.metadata ?? "");
      if (name.startsWith("woodland_mansion/")) { // (8c) dinh thự: rương có hướng, đao phủ / pháp sư / 1–3 tiểu linh; chỗ khối dữ liệu thành không khí
        const chest = /^Chest(West|East|South|North)$/.exec(md);
        if (chest) out.loot.push([b.x, b.y, b.z, "woodland_mansion"]);
        else if (MANSION_MOB[md]) out.mobs!.push([b.x, b.y, b.z, MANSION_MOB[md]!]);
        c = chest ? B.CHEST | (MANSION_DIR[chest[1]!]! << 8) : 0;
        let i = palIndex.get(c);
        if (i === undefined) palIndex.set(c, (i = pal.push(c) - 1));
        cells.push(b.x, b.y, b.z, i);
        continue;
      }
      if (MARKER_LOOT[md]) out.loot.push([b.x, b.y - 1, b.z, MARKER_LOOT[md]!]);
      else if (md === "drowned") out.mobs!.push([b.x, b.y, b.z, "drowned"]);
      if (md !== "chest") continue;
      out.loot.push([b.x, b.y, b.z, name.includes("big_") ? "ruin_big" : "ruin_small"]);
      c = B.CHEST;
    } else if (mb.name === "jigsaw") {
      const n = b.nbt ?? {};
      c = parseState(String(n.final_state ?? "minecraft:air")); // ô khối ghép thành block cuối của nó
      const ori = mb.props.orientation ?? "north_up", vert = ori.startsWith("up") || ori.startsWith("down"); // (10d2) khớp: dọc mặc định xoay tự do
      out.jig.push([b.x, b.y, b.z, ori, String(n.name ?? "").replace("minecraft:", ""), String(n.target ?? "").replace("minecraft:", ""),
        String(n.pool ?? "").replace("minecraft:", ""), c, (n.joint ? n.joint === "rollable" : vert) ? 1 : 0]);
    } else if (mb.name === "spawner") { // (10d2) lồng sinh quái: loài theo SpawnData (mặc định nhện — dinh thự)
      const ent = String((((b.nbt?.SpawnData ?? {}) as { [k: string]: Nbt }).entity as { [k: string]: Nbt } | undefined)?.id ?? "").replace("minecraft:", "");
      const k = SPAWNER_MOBS.indexOf(ent as never);
      c = B.SPAWNER | ((k >= 0 ? k : 3) << 8);
    } else if (mb.name === "barrel" && !b.nbt?.LootTable) c = B.BARREL; // (8a) thùng trang trí (thùng có đồ: rương)
    else c = mapBlock(mb.name, mb.props);
    if (c === null) continue;
    let i = palIndex.get(c);
    if (i === undefined) palIndex.set(c, (i = pal.push(c) - 1));
    cells.push(b.x, b.y, b.z, i);
    const ltName = b.nbt?.LootTable ? String(b.nbt.LootTable).replace("minecraft:", "") : "";
    const lt = LOOT[ltName] ?? (ltName.startsWith("chests/village/") ? ltName.slice("chests/village/".length) : undefined); // (8a) rương làng
    if (lt) out.loot.push([b.x, b.y, b.z, lt]);
  }
  for (const e of ents) { // (8a) sinh vật đặt sẵn trong mẫu làng; (10d2) tàn tích: người lợn (1 kiếm, 2 nỏ), vệ binh, lợn rừng lửa
    const id = String(e.nbt.id ?? "").replace("minecraft:", "");
    const k = name.startsWith("bastion/") ? (id === "piglin" ? `piglin:${name.includes("crossbow") ? 2 : 1}` : id === "piglin_brute" || id === "hoglin" ? id : null) : villageMob(e.nbt);
    if (k) out.mobs!.push([e.blockPos[0]!, e.blockPos[1]!, e.blockPos[2]!, k]);
  }
  if (!out.mobs!.length) delete out.mobs;
  return out;
}

/** (8a) Thực thể trong mẫu làng → khóa sinh vật: dân làng (nghề, vùng; con), mèo, người sắt, lạc đà, vật nuôi. */
function villageMob(n: { [k: string]: Nbt }): string | null {
  const id = String(n.id ?? "").replace("minecraft:", "");
  if (id === "villager") {
    const vd = (n.VillagerData ?? {}) as { [k: string]: Nbt }, type = String(vd.type ?? "plains").replace("minecraft:", "");
    const prof = String(vd.profession ?? "none").replace("minecraft:", "");
    return Number(n.Age ?? 0) < 0 ? `villager:baby:${type}` : `villager:${prof}:${type}`;
  }
  if (id === "cat") return `cat:${String(n.variant ?? "tabby").replace("minecraft:", "")}`;
  return ["allay", "iron_golem", "camel", "cow", "pig", "sheep", "horse", "chicken"].includes(id) ? id : null;
}

const data: StructureData = { version: STRUCTURE_DATA_VERSION, templates: {}, pools: {} };
const add = (name: string): void => {
  if (data.templates[name]) return;
  const t = template(name);
  if (t) data.templates[name] = t;
  else console.log(`[import-structures] thiếu mẫu ${name}`);
};
for (const n of ["igloo/top", "igloo/middle", "igloo/bottom"]) add(n);
for (const f of jar.list(`${S}ruined_portal/`)) add(f.slice(S.length, -4));
for (const d of ["shipwreck", "underwater_ruin"]) for (const f of jar.list(`${S}${d}/`)) add(f.slice(S.length, -4)); // 7f
for (const f of jar.list(`${S}woodland_mansion/`)) add(f.slice(S.length, -4)); // 8c: 73 mẫu dinh thự rừng (ghép theo lưới phòng — mansionPlan.ts)
// trại bỏ hoang: nhóm lều / khu lửa trại của các biome dùng, nhóm cây (đổi sang loại cây của game)
const TREE: Record<string, string> = { birch: "birch", spruce: "spruce", pine: "spruce", acacia: "acacia" };
const pool = (name: string): void => {
  if (data.pools[name]) return;
  const buf = jar.read(`${POOLS}${name}.json`);
  if (!buf) return void console.log(`[import-structures] thiếu nhóm ${name}`);
  const j = JSON.parse(buf.toString()) as { elements: { weight: number; element: { location?: string; feature?: string } }[] };
  data.pools[name] = j.elements.map((e) => {
    if (e.element.feature) {
      const f = e.element.feature.replace("minecraft:", "");
      return ["tree:" + (Object.keys(TREE).find((k) => f.includes(k)) ? TREE[Object.keys(TREE).find((k) => f.includes(k))!] : "oak"), e.weight];
    }
    const loc = (e.element.location ?? "").replace("minecraft:", "");
    add(loc);
    return [loc, e.weight];
  });
};
for (const mcBiomes of Object.values(CAMP_BIOME_POOLS))
  for (const b of mcBiomes) {
    pool(`abandoned_camp/tent/${b}`);
    pool(`abandoned_camp/camp/${b}`);
  }
for (const t of Object.values(data.templates))
  for (const j of t.jig) if (j[6].startsWith("abandoned_camp/trees/")) pool(j[6]);

// (8a) làng: đi theo nhóm ghép từ quảng trường của 5 loại làng (bỏ bản làng bỏ hoang "zombie" — chưa làm)
interface PoolEl { element_type: string; location?: string; feature?: string; processors?: unknown; projection?: string; elements?: PoolEl[] }
const FEATURE: Record<string, string> = { oak: "tree:oak", spruce: "tree:spruce", pine: "tree:spruce", acacia: "tree:acacia" };
data.fallback = {};
const villagePool = (name: string): void => {
  if (data.pools[name] || name === "empty") return;
  const buf = jar.read(`${POOLS}${name}.json`);
  if (!buf) return void console.log(`[import-structures] thiếu nhóm ${name}`);
  const j = JSON.parse(buf.toString()) as {
    fallback?: string; elements: { weight: number; element: PoolEl }[];
  };
  const list: [string, number][] = [];
  data.pools[name] = list;
  const fb = (j.fallback ?? "minecraft:empty").replace("minecraft:", "");
  if (fb !== "empty") data.fallback![name] = fb;
  for (const { weight, element: e } of j.elements) {
    if (e.element_type.endsWith("empty_pool_element")) list.push(["empty", weight]);
    else if (e.elements) { // (8b) nhiều mẫu chồng lên nhau cùng chỗ (tháp canh + dây leo phủ): "list:a|b"
      const locs = e.elements.map((x) => (x.location ?? "").replace("minecraft:", "")).filter(Boolean);
      for (const l of locs) add(l);
      if (!locs.every((l) => data.templates[l])) continue;
      list.push([`list:${locs.join("|")}`, weight]);
      for (const jg of data.templates[locs[0]!]!.jig) villagePool(jg[6]);
    }
    else if (e.feature) {
      const f = e.feature.replace("minecraft:", "");
      list.push([FEATURE[f] ?? `feat:${f}`, weight]);
    } else if (e.location && !e.location.includes("/zombie/")) {
      const loc = e.location.replace("minecraft:", "");
      add(loc);
      const t = data.templates[loc];
      if (!t) continue;
      if (e.projection === "terrain_matching") t.terrain = 1;
      if (typeof e.processors === "string") t.proc = e.processors.replace("minecraft:", "");
      list.push([loc, weight]);
      for (const jg of t.jig) villagePool(jg[6]);
    }
  }
  villagePool(fb);
};
for (const v of VILLAGE_TYPES) villagePool(`village/${v}/town_centers`);
villagePool("pillager_outpost/base_plates"); // (8b) tiền đồn kẻ cướp (ghép khối như làng)
villagePool("bastion/starts"); // (10d2) tàn tích pháo đài lợn
// (10d2) bộ biến đổi ô của tàn tích (luật "rule": khối vào theo xác suất → khối ra; vị trí tăng dần theo độ cao)
data.procs = {};
for (const t of Object.values(data.templates)) {
  const pn = t.proc;
  if (!pn || data.procs[pn] || !jar.read(`data/minecraft/worldgen/processor_list/${pn}.json`)) continue;
  type Rule = { input_predicate: { predicate_type: string; block?: string; probability?: number }; output_state: string | { Name: string }; position_predicate?: unknown };
  const j = JSON.parse(jar.read(`data/minecraft/worldgen/processor_list/${pn}.json`)!.toString()) as { processors: { processor_type: string; rules?: Rule[] }[] };
  const rules: [number, number, number, number][] = [];
  for (const pr of j.processors) for (const r of pr.rules ?? []) {
    const ip = r.input_predicate, out = typeof r.output_state === "string" ? r.output_state : r.output_state.Name;
    const inCell = ip.block ? mapBlock(ip.block.replace("minecraft:", ""), {}) : -1;
    if (inCell === null || (ip.predicate_type.endsWith("block_match") && !ip.block)) continue;
    rules.push([inCell, ip.probability ?? 1, mapBlock(out.replace("minecraft:", ""), {}) ?? 0, r.position_predicate ? 1 : 0]);
  }
  data.procs[pn] = rules;
}

const dest = join(root, "client/public_mc/structures.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(data));
console.log(`[import-structures] ${jar.name}: ${Object.keys(data.templates).length} mẫu, ${Object.keys(data.pools).length} nhóm → client/public_mc/structures.json`);
if (substituted.size)
  console.log(`[import-structures] block thay gần giống: ${[...substituted].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(", ")}`);
