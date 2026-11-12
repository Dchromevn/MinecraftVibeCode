// Kiểm tra 4d: loài cây theo biome, cây liền mạch qua ranh giới chunk (không lá nào bị "đứt" khỏi
// thân), hoa / xương rồng đúng chỗ bám, cây non từng loài, công thức nhóm ván, thuốc nhuộm, xương rồng.
import {
  B, BIOME, BLOCKS, Chunk, ChunkGenerator, Inventory, World, canPlace, placeCells, createPlayer, fillFromBook, fuelValue,
  gridResult, hasSupport, isFlower, isLeaves, isLog, makeCell, matchGrid, mulberry32, randomTick, seedFromString,
  smeltResult, stack, stepPlayer, takeResult, woodOf, RECIPES, type BlockAccess, type TickWorld,
} from "../shared/src/index.js";
import { check } from "./harness.js";

const seed = seedFromString("voxel");
const gen = new ChunkGenerator(seed);

/** Tìm chunk (bước 3 chunk, xoắn ra ngoài) có cột giữa thỏa điều kiện. */
function findChunk(pred: (cx: number, cz: number) => boolean): [number, number] | null {
  for (let r = 0; r < 150; r += 3)
    for (let cz = -r; cz <= r; cz += 3)
      for (let cx = -r; cx <= r; cx += 3) {
        if (Math.max(Math.abs(cx), Math.abs(cz)) !== r) continue;
        if (pred(cx, cz)) return [cx, cz];
      }
  return null;
}
const colAt = (cx: number, cz: number) => gen.sampler.column(cx * 16 + 8, cz * 16 + 8);
const land = (cx: number, cz: number) => colAt(cx, cz).height > colAt(cx, cz).waterTop + 1;

/** Sinh vùng 5x5 chunk quanh (cx, cz) vào một World; đếm id trong 3x3 chunk giữa. */
function region(cx: number, cz: number) {
  const w = new World(seed);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) w.addChunk(new Chunk(cx + dx, cz + dz, gen.generate(cx + dx, cz + dz)));
  const count = new Map<number, number>();
  const cells: [number, number, number, number][] = [];
  for (let x = (cx - 1) * 16; x < (cx + 2) * 16; x++)
    for (let z = (cz - 1) * 16; z < (cz + 2) * 16; z++)
      for (let y = 1; y < 127; y++) {
        const id = w.getCell(x, y, z) & 255;
        if (!id) continue;
        count.set(id, (count.get(id) ?? 0) + 1);
        if (isLeaves(id) || id === B.CACTUS || isFlower(id)) cells.push([x, y, z, id]);
      }
  return { w, n: (id: number) => count.get(id) ?? 0, cells };
}

{ // 1. loài cây theo biome
  const snowy = findChunk((x, z) => colAt(x, z).biome === BIOME.SNOWY && land(x, z));
  const forest = findChunk((x, z) => colAt(x, z).biome === BIOME.FOREST && land(x, z));
  const hot = findChunk((x, z) => { const c = colAt(x, z); return c.biome === BIOME.PLAINS && c.temp > 0.2 && c.humid < -0.05 && land(x, z); });
  const desert = findChunk((x, z) => colAt(x, z).biome === BIOME.DESERT && land(x, z));
  const plains = findChunk((x, z) => colAt(x, z).biome === BIOME.PLAINS && land(x, z));
  check("tìm được vùng tuyết, rừng, đồng cỏ nóng, sa mạc, đồng cỏ", !!(snowy && forest && hot && desert && plains));
  const regions = [snowy, forest, hot, desert, plains].map((p) => region(p![0], p![1]));
  const [s, f, h, d, p] = regions;
  check("đồng tuyết có thông, không có sồi", s!.n(B.SPRUCE_LOG) > 0 && s!.n(B.LOG) === 0, `thông ${s!.n(B.SPRUCE_LOG)}, sồi ${s!.n(B.LOG)}`);
  check("rừng có sồi xen bạch dương", f!.n(B.LOG) > f!.n(B.BIRCH_LOG) && f!.n(B.BIRCH_LOG) > 0, `sồi ${f!.n(B.LOG)}, bạch dương ${f!.n(B.BIRCH_LOG)}`);
  check("đồng cỏ nóng khô có keo", h!.n(B.ACACIA_LOG) > 0, `keo ${h!.n(B.ACACIA_LOG)}`);
  let desertLogs = 0;
  for (let x = (desert![0] - 1) * 16; x < (desert![0] + 2) * 16; x++)
    for (let z = (desert![1] - 1) * 16; z < (desert![1] + 2) * 16; z++) {
      const c = gen.sampler.column(x, z);
      if (c.biome === BIOME.DESERT && isLog(d!.w.getCell(x, c.height + 1, z) & 255)) desertLogs++;
    }
  check("sa mạc có xương rồng, không có cây mọc trên cột sa mạc", d!.n(B.CACTUS) > 0 && desertLogs === 0, `xương rồng ${d!.n(B.CACTUS)}, cây ${desertLogs}`);
  const flowers = [B.DANDELION, B.POPPY, B.CORNFLOWER, B.LILY_OF_THE_VALLEY].reduce((a, id) => a + regions.reduce((b, r) => b + r.n(id), 0), 0);
  check("có hoa trên đồng cỏ / rừng", flowers > 0 && p!.n(B.DANDELION) + p!.n(B.POPPY) + p!.n(B.CORNFLOWER) > 0, `${flowers} hoa`);

  // 2. liền mạch: không lá nào (của mọi loài) bị đứt khỏi thân gỗ; hoa, xương rồng đúng chỗ bám
  let decayed = 0, leaves = 0, badSupport = 0;
  for (const r of regions) {
    const tw: TickWorld = {
      getCell: (x, y, z) => r.w.getCell(x, y, z), setCell: (x, y, z, id) => { if (id === 0) decayed++; },
      light: () => 15, drop: () => undefined,
    };
    const idAt = (x: number, y: number, z: number) => Math.max(0, r.w.getCell(x, y, z)) & 255;
    for (const [x, y, z, id] of r.cells) {
      if (isLeaves(id)) { leaves++; randomTick(tw, x, y, z, mulberry32(1)); }
      else if (!hasSupport(r.w.getCell(x, y, z), x, y, z, idAt)) badSupport++;
    }
  }
  check("cây liền mạch qua ranh giới chunk: không lá nào bị đứt khỏi thân", decayed === 0 && leaves > 1000, `${decayed} / ${leaves} lá`);
  check("hoa mọc trên cỏ; xương rồng trên cát, không sát block", badSupport === 0, `sai ${badSupport}`);
}

function mkWorld() {
  const m = new Map<string, number>();
  const w: TickWorld & BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
    light: () => 15,
    drop: () => undefined,
  };
  const id = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) & 255;
  return { m, w, id };
}

{ // 3. cây non từng loài lớn thành đúng loài
  const res: string[] = [];
  let ok = true;
  for (const sap of [B.SPRUCE_SAPLING, B.BIRCH_SAPLING, B.ACACIA_SAPLING]) {
    const { m, w, id } = mkWorld();
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) w.setCell(x, 9, z, B.GRASS, 0);
    w.setCell(0, 10, 0, sap, 0);
    const rng = mulberry32(5);
    for (let n = 0; n < 500 && id(0, 10, 0) === sap; n++) randomTick(w, 0, 10, 0, rng);
    const kind = woodOf(sap)!;
    let logs = 0, leaves = 0, wrong = 0;
    for (const c of m.values()) {
      const i = c & 255;
      if (isLog(i)) i === kind.log ? logs++ : wrong++;
      if (isLeaves(i)) i === kind.leaves ? leaves++ : wrong++;
    }
    res.push(`${kind.kind}: ${logs} thân, ${leaves} lá`);
    if (!(logs >= 4 && leaves > 15 && wrong === 0 && id(0, 9, 0) === B.DIRT)) ok = false;
  }
  check("cây non thông / bạch dương / keo lớn thành đúng loài", ok, res.join("; "));
}

{ // 4. công thức: ván theo loài, nhóm ván (trộn loài), sổ công thức chọn loại có trong túi, thuốc nhuộm, lò
  const g = (cells: (string | null)[]) => matchGrid(cells, 3)?.out;
  const planks = matchGrid(["spruce_log", null, null, null], 2)?.out;
  check("thân thông → 4 ván thông", planks?.item === "spruce_planks" && planks.count === 4);
  check("que từ ván trộn loài; bàn chế tạo từ ván keo; cuốc gỗ từ ván bạch dương",
    g(["spruce_planks", null, null, "birch_planks", null, null, null, null, null])?.item === "stick"
    && matchGrid(["acacia_planks", "acacia_planks", "acacia_planks", "acacia_planks"], 2)?.out.item === "workbench"
    && g(["birch_planks", "birch_planks", "birch_planks", null, "stick", null, null, "stick", null])?.item === "wood_pickaxe");
  const inv = new Inventory();
  inv.add(stack("birch_planks", 5)); inv.add(stack("stick", 2));
  inv.craftSize = 3; inv.craft = Array(9).fill(null);
  const pick = RECIPES.find((r) => r.out.item === "wood_pickaxe")!;
  const filled = fillFromBook(inv, pick, false);
  takeResult(inv, false);
  check("sổ công thức xếp ván bạch dương cho cuốc gỗ", filled && inv.cursor?.item === "wood_pickaxe" && inv.count("birch_planks") === 2,
    `còn ${inv.count("birch_planks")} ván`);
  check("chỉ có ván keo thì vẫn sáng công thức rương", (() => { const v = new Inventory(); v.add(stack("acacia_planks", 8)); v.craftSize = 3; v.craft = Array(9).fill(null); return fillFromBook(v, RECIPES.find((r) => r.out.item === "chest")!, false) && gridResult(v)?.out.item === "chest"; })());
  const dye = (f: string) => matchGrid([f, null, null, null], 2)?.out.item;
  check("hoa → thuốc nhuộm; củ cải → đỏ; nung xương rồng → xanh lá",
    dye("dandelion") === "yellow_dye" && dye("poppy") === "red_dye" && dye("cornflower") === "blue_dye"
    && dye("lily_of_the_valley") === "white_dye" && dye("beetroot") === "red_dye" && smeltResult("cactus") === "green_dye");
  check("thân / ván mọi loài là nhiên liệu", fuelValue("spruce_log") === fuelValue("log") && fuelValue("acacia_planks") === fuelValue("planks") && fuelValue("acacia_planks") > 0);
  check("mọi block mới có vật phẩm và tên kỹ thuật", BLOCKS.slice(46).every((b) => !!b.key && b.drops.length > 0));
}

{ // 5. xương rồng: chỗ bám, vỡ khi đặt block cạnh, lớn tới 3 khúc, chạm vào mất máu
  const { w, id } = mkWorld();
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w.setCell(x, 9, z, B.SAND, 0);
  w.setCell(2, 9, 2, B.DIRT, 0);
  const cell = (i: number) => [{ x: 0, y: 10, z: 0, id: i, meta: 0 }];
  const onSand = canPlace(cell(B.CACTUS), w.getCell, null);
  const onDirt = canPlace([{ x: 2, y: 10, z: 2, id: B.CACTUS, meta: 0 }], w.getCell, null);
  w.setCell(-2, 10, 0, B.STONE, 0);
  const nextToStone = canPlace([{ x: -1, y: 10, z: 0, id: B.CACTUS, meta: 0 }], w.getCell, null);
  check("xương rồng chỉ đặt trên cát, không đặt sát block", onSand && !onDirt && !nextToStone);

  w.setCell(0, 10, 0, B.CACTUS, 0);
  const rng = mulberry32(3);
  for (let n = 0; n < 200; n++) { randomTick(w, 0, 10, 0, rng); randomTick(w, 0, 11, 0, rng); randomTick(w, 0, 12, 0, rng); }
  check("xương rồng tự lớn tới đúng 3 khúc", id(0, 10, 0) === B.CACTUS && id(0, 11, 0) === B.CACTUS && id(0, 12, 0) === B.CACTUS && id(0, 13, 0) === B.AIR);

  // đặt kính sát khúc giữa → khúc đó và khúc trên rơi ra, khúc dưới còn
  const fell = placeCells(w, [{ x: -1, y: 11, z: 0, id: B.GLASS, meta: 0 }], () => undefined).map((d) => d.id);
  check("đặt block sát bên: khúc xương rồng đó và khúc trên rơi ra, khúc dưới còn",
    id(0, 12, 0) === B.AIR && id(0, 11, 0) === B.AIR && id(0, 10, 0) === B.CACTUS && fell.filter((i) => i === B.CACTUS).length === 2,
    `rơi ${fell.map((i) => BLOCKS[i]!.key).join(",")}`);

  const { w: w3 } = mkWorld();
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w3.setCell(x, 9, z, B.SAND, 0);
  w3.setCell(0, 10, -2, B.CACTUS, 0);
  const s = createPlayer(0.5, 10, 0.5);
  s.hunger = 17; s.saturation = 0;
  const reader = (x: number, y: number, z: number) => w3.getCell(x, y, z);
  for (let t = 0; t < 120; t++) stepPlayer(s, { forward: 1, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0 }, reader);
  check("đi vào xương rồng: bị chặn, mất máu", s.health < 20 && s.health >= 16 && Math.abs(s.z - (-2 + 15 / 16 + 0.3)) < 0.01, `máu ${s.health}, z ${s.z.toFixed(2)}`);
}
