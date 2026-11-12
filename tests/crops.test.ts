// Kiểm tra cây trồng thêm vào 4b: cà rốt, khoai tây, củ cải đường, thân dưa / bí, công thức, nung, đồ ăn.
import {
  B, BLOCKS, ChunkGenerator, CHUNK_HEIGHT, FOODS, Inventory, blockDrops, blockIndex, breakAt, canPlace, gridResult, itemDef,
  makeCell, matchGrid, mulberry32, placementCells, randomTick, smeltResult, stack, type BlockAccess, type TickWorld,
} from "../shared/src/index.js";
import { check } from "./harness.js";


function mkWorld(lightVal = 15) {
  const m = new Map<string, number>();
  const dropped: number[] = [];
  const w: TickWorld & BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
    light: () => lightVal,
    drop: (id) => void dropped.push(id),
  };
  const id = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) & 255;
  const meta = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) >> 8;
  return { m, w, id, meta, dropped };
}
const farm = (w: TickWorld) => { for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) w.setCell(x, 9, z, B.FARMLAND, 1); };

{ // 1. cà rốt, khoai tây lớn tới 7; củ cải đường tới 3
  const rng = mulberry32(11);
  const out: string[] = [];
  let ok = true;
  for (const [cid, max] of [[B.CARROTS, 7], [B.POTATOES, 7], [B.BEETROOTS, 3]] as const) {
    const { w, meta } = mkWorld();
    farm(w); w.setCell(0, 10, 0, cid, 0);
    let n = 0;
    while (meta(0, 10, 0) < max && n < 3000) { randomTick(w, 0, 10, 0, rng); n++; }
    for (let k = 0; k < 200; k++) randomTick(w, 0, 10, 0, rng);
    ok &&= meta(0, 10, 0) === max;
    out.push(`${BLOCKS[cid]!.key}: ${n}`);
  }
  check("cà rốt / khoai tây chín ở giai đoạn 7, củ cải đường ở 3, không vượt quá", ok, out.join(", "));
}
{ // 2. rơi đồ theo giai đoạn
  const rng = mulberry32(2);
  const sum = (id: number, meta: number, item: string) => blockDrops(id, meta, null, rng).filter((s) => s.item === item).reduce((a, s) => a + s.count, 0);
  let carrot = [99, 0];
  for (let k = 0; k < 200; k++) { const c = sum(B.CARROTS, 7, "carrot"); carrot = [Math.min(carrot[0]!, c), Math.max(carrot[1]!, c)]; }
  const young = sum(B.POTATOES, 3, "potato");
  const beet = blockDrops(B.BEETROOTS, 3, null, rng).map((s) => s.item).sort().join(",");
  const beetYoung = blockDrops(B.BEETROOTS, 2, null, rng).map((s) => s.item).join(",");
  let melon = [99, 0];
  for (let k = 0; k < 200; k++) { const c = sum(B.MELON, 0, "melon_slice"); melon = [Math.min(melon[0]!, c), Math.max(melon[1]!, c)]; }
  const stem = blockDrops(B.PUMPKIN_STEM, 5, null, rng).map((s) => s.item).join(",");
  check("rơi: cà rốt chín 2–5, khoai non 1, củ cải chín 1 củ + hạt, non 1 hạt, dưa 3–7 lát, thân 1 hạt",
    carrot[0] === 2 && carrot[1] === 5 && young === 1 && beet === "beetroot,beetroot_seeds" && beetYoung === "beetroot_seeds"
      && melon[0] === 3 && melon[1] === 7 && stem === "pumpkin_seeds",
    `cà rốt ${carrot}, dưa ${melon}, củ cải ${beet}`);
}
{ // 3. thân dưa lớn tới 7 rồi mọc quả bên cạnh, thân chuyển "đã ra quả"; phá quả → thân về 7
  const { w, id, meta } = mkWorld();
  farm(w);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x || z) w.setCell(x, 9, z, B.DIRT, 0);
  w.setCell(0, 9, 0, B.FARMLAND, 1);
  w.setCell(0, 10, 0, B.MELON_STEM, 0);
  const rng = mulberry32(4);
  let n = 0;
  while (meta(0, 10, 0) < 8 && n < 5000) { randomTick(w, 0, 10, 0, rng); n++; }
  const dir = meta(0, 10, 0) - 8;
  const [fx, fz] = [[0, 1], [-1, 0], [0, -1], [1, 0]][dir] ?? [9, 9];
  const fruit = id(fx!, 10, fz!) === B.MELON;
  let fruits = 0;
  for (let k = 0; k < 500; k++) randomTick(w, 0, 10, 0, rng);
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if (id(x, 10, z) === B.MELON) fruits++;
  breakAt(w, fx!, 10, fz!, () => undefined);
  check("thân dưa: lớn → mọc 1 quả cạnh bên, thân hướng về quả; không mọc thêm; phá quả → thân về tuổi 7",
    fruit && fruits === 1 && meta(0, 10, 0) === 7, `${n} tick, hướng ${dir}`);
  // thân về 7 thì mọc quả lại được
  let again = 0;
  while (meta(0, 10, 0) < 8 && again < 5000) { randomTick(w, 0, 10, 0, rng); again++; }
  check("thân dưa ra quả lại sau khi quả bị hái", meta(0, 10, 0) >= 8, `${again} tick`);
}
{ // 4. thân không có chỗ mọc quả (xung quanh là đá) thì không mọc
  const { w, id, meta } = mkWorld();
  farm(w);
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.setCell(x!, 10, z!, B.STONE, 0);
  w.setCell(0, 10, 0, B.PUMPKIN_STEM, 7);
  const rng = mulberry32(8);
  for (let k = 0; k < 2000; k++) randomTick(w, 0, 10, 0, rng);
  check("thân bí bị vây kín không mọc quả", meta(0, 10, 0) === 7 && id(0, 10, 0) === B.PUMPKIN_STEM);
}
{ // 5. trồng: cần đất cày; đất cày có cây không khô thành đất; mất đất cày thì cây rơi
  const { w, id } = mkWorld();
  w.setCell(0, 9, 0, B.DIRT, 0); w.setCell(1, 9, 0, B.FARMLAND, 0);
  const onDirt = canPlace(placementCells(B.CARROTS, 0, 10, 0, 0, 1, 0, 0)!, w.getCell, null);
  const onFarm = canPlace(placementCells(B.CARROTS, 1, 10, 0, 0, 1, 0, 0)!, w.getCell, null);
  w.setCell(1, 10, 0, B.CARROTS, 2);
  for (let k = 0; k < 5; k++) randomTick(w, 1, 9, 0, mulberry32(k));
  const kept = id(1, 9, 0) === B.FARMLAND;
  check("cà rốt chỉ trồng trên đất cày; đất cày khô có cây thì không thành đất", !onDirt && onFarm && kept);
  const drops = breakAt(w, 1, 9, 0, () => undefined);
  check("phá đất cày dưới cây → cây rơi ra", id(1, 10, 0) === 0 && drops.some((d) => d.id === B.CARROTS));
}
{ // 6. tối thì bật ra (cả thân)
  const { w, id } = mkWorld(4);
  w.setCell(0, 9, 0, B.FARMLAND, 1); w.setCell(0, 10, 0, B.MELON_STEM, 3);
  randomTick(w, 0, 10, 0, mulberry32(1));
  check("thân dưa thiếu sáng bật ra", id(0, 10, 0) === 0);
}
{ // 7. công thức + nung + đồ ăn
  const grid3 = (items: (string | null)[]) => matchGrid(items, 3)?.out;
  const bowl = grid3(["planks", null, "planks", null, "planks", null, null, null, null]);
  const soup = grid3(["beetroot", "beetroot", "beetroot", "beetroot", "beetroot", "beetroot", "bowl", null, null]);
  const seeds = matchGrid(["melon_slice", null, null, null], 2)?.out;
  const pseeds = matchGrid([null, "pumpkin", null, null], 2)?.out;
  check("công thức: 3 ván chữ V → 4 bát; 6 củ cải + bát → súp; lát dưa → hạt; bí → 4 hạt",
    bowl?.item === "bowl" && bowl.count === 4 && soup?.item === "beetroot_soup" && seeds?.item === "melon_seeds" && pseeds?.count === 4);
  check("nung khoai tây → khoai nướng", smeltResult("potato") === "baked_potato");
  const s = itemDef("beetroot_soup")!;
  check("súp: không chồng, ăn trả bát; cà rốt / khoai tây vừa ăn được vừa trồng được",
    s.maxStack === 1 && s.food?.returns === "bowl" && itemDef("carrot")?.places === B.CARROTS && !!itemDef("potato")?.food
      && FOODS.carrot!.hunger === 3 && itemDef("melon")?.places === B.MELON);
  void Inventory; void stack; void gridResult;
}
{ // 8. bí ngô sinh ngẫu nhiên trên cỏ, xác định theo seed
  const count = (seed: number) => {
    const g = new ChunkGenerator(seed);
    let n = 0;
    for (let cx = 0; cx < 12; cx++) for (let cz = 0; cz < 12; cz++) {
      const d = g.generate(cx, cz).data;
      for (let i = 0; i < d.length; i++) if (d[i] === B.PUMPKIN) {
        n++;
        if (d[i - 256] !== B.GRASS) n += 1000; // phải nằm trên cỏ (y − 1 = chỉ số − 256)
      }
    }
    return n;
  };
  const a = count(42), b = count(42);
  check("bí ngô mọc hoang trên cỏ, cùng seed cùng kết quả", a > 0 && a < 1000 && a === b, `${a} quả / 144 chunk`);
  void CHUNK_HEIGHT; void blockIndex;
}
