// Kiểm tra 4b: lò nung, rương (đồ hầm mỏ, rương đôi), random tick (lúa, đất cày, cây non, lá, cỏ).
import {
  B, BlockEntities, FURNACE_RULES, Inventory, breakAt, chestHalf, makeCell, mergeChest, mineshaftLoot, mulberry32,
  randomTick, stack, stepFurnace, chestMeta, type BlockAccess, type FurnaceEntity, type TickWorld,
} from "../shared/src/index.js";
import { check } from "./harness.js";


function mkWorld(lightVal = 15) {
  const m = new Map<string, number>();
  const w: TickWorld & BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
    light: () => lightVal,
    drop: () => undefined,
  };
  const id = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) & 255;
  const meta = (x: number, y: number, z: number) => (m.get(`${x},${y},${z}`) ?? 0) >> 8;
  return { m, w, id, meta };
}

{ // 1. lò nung: 3 sắt thô + 1 than → 3 thỏi sắt trong 30 s; hết nguyên liệu thì tắt
  const e: FurnaceEntity = { kind: "furnace", x: 0, y: 0, z: 0, slots: [stack("raw_iron", 3), stack("coal", 1), null], burnLeft: 0, burnMax: 0, cook: 0 };
  let t = 0, at10 = 0;
  for (; t < 40; t += 0.05) { stepFurnace(e, 0.05); if (Math.abs(t - 10.05) < 0.03) at10 = e.slots[2]?.count ?? 0; }
  check("lò: mỗi món 10 s, 3 sắt thô ra 3 thỏi; than còn cháy", at10 === 1 && e.slots[2]?.item === "iron_ingot" && e.slots[2]?.count === 3 && !e.slots[0] && !e.slots[1],
    `10 s: ${at10}, cuối: ${e.slots[2]?.count}`);
  const inv = new Inventory();
  inv.add(stack("cobble", 5)); inv.add(stack("planks", 4)); inv.add(stack("dirt", 3));
  inv.ext = [null, null, null]; inv.extRules = FURNACE_RULES;
  inv.click("main", 0, "left", true); inv.click("main", 1, "left", true); inv.click("main", 2, "left", true);
  check("lò: Shift chuyển đá cuội vào ô nguyên liệu, ván vào ô nhiên liệu, đất không vào", inv.ext[0]?.item === "cobble" && inv.ext[1]?.item === "planks" && inv.count("dirt") === 3);
  inv.cursor = stack("dirt", 1); inv.click("ext", 1, "left", false);
  check("lò: ô nhiên liệu không nhận đất", inv.ext[1]?.item === "planks" && inv.cursor?.item === "dirt");
}
{ // 2. rương hầm mỏ: cùng seed + vị trí → cùng đồ
  const a = JSON.stringify(mineshaftLoot(42, 10, 30, -5)), b = JSON.stringify(mineshaftLoot(42, 10, 30, -5)), c = JSON.stringify(mineshaftLoot(43, 10, 30, -5));
  const n = mineshaftLoot(42, 10, 30, -5).filter(Boolean).length;
  check("đồ rương hầm mỏ xác định theo seed + vị trí, có 3–6 món", a === b && a !== c && n >= 3 && n <= 6, `${n} món`);
  const ents = new BlockEntities(42);
  ents.placed(1, 1, 1, B.CHEST);
  check("rương người chơi đặt thì rỗng", ents.obtain(1, 1, 1, B.CHEST)!.slots.every((s) => !s));
}
{ // 3. rương đôi: ghép cạnh nhau cùng hướng; rương thứ ba không ghép; phá một nửa → nửa kia thành rương đơn
  const { w, meta } = mkWorld();
  w.setCell(0, 10, 0, B.CHEST, chestMeta(0, 0)); // mặt trước hướng Nam (+Z)
  const m1 = mergeChest({ x: 1, y: 10, z: 0, id: B.CHEST, meta: chestMeta(0, 0) }, w.getCell); // cạnh Đông (+X)
  for (const c of m1) w.setCell(c.x, c.y, c.z, c.id, c.meta);
  const paired = m1.length === 2 && chestHalf(meta(0, 10, 0)) > 0 && chestHalf(meta(1, 10, 0)) > 0 && chestHalf(meta(0, 10, 0)) !== chestHalf(meta(1, 10, 0));
  w.setCell(2, 10, 0, B.CHEST, chestMeta(0, 0));
  const m2 = mergeChest({ x: 2, y: 10, z: 0, id: B.CHEST, meta: chestMeta(0, 0) }, w.getCell);
  const m3 = mergeChest({ x: 0, y: 10, z: 1, id: B.CHEST, meta: chestMeta(0, 0) }, w.getCell); // phía trước: không ghép
  breakAt(w, 1, 10, 0, () => undefined);
  check("rương đôi: ghép 2 rương cạnh nhau cùng hướng; rương thứ ba / phía trước không ghép; phá một nửa nửa kia thành đơn",
    paired && m2.length === 0 && m3.length === 0 && chestHalf(meta(0, 10, 0)) === 0, `${m1.length},${m2.length},${m3.length}`);
}
{ // 4. lúa lớn trên đất cày ẩm; thiếu sáng thì bật ra
  const { w, id, meta } = mkWorld();
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) w.setCell(x, 9, z, B.FARMLAND, 1);
  w.setCell(0, 10, 0, B.WHEAT, 0);
  const rng = mulberry32(5);
  let ticks = 0;
  while (meta(0, 10, 0) < 7 && ticks < 2000) { randomTick(w, 0, 10, 0, rng); ticks++; }
  check("lúa trên đất cày ẩm chín sau ~ vài chục random tick", meta(0, 10, 0) === 7 && ticks < 200, `${ticks} lần (≈ ${(ticks * 68 / 60).toFixed(0)} phút)`);
  const dark = mkWorld(5);
  dark.w.setCell(0, 9, 0, B.FARMLAND, 1); dark.w.setCell(0, 10, 0, B.WHEAT, 3);
  randomTick(dark.w, 0, 10, 0, rng);
  check("lúa thiếu sáng (< 8) bật ra", dark.id(0, 10, 0) === 0);
  void id;
}
{ // 5. đất cày: có nước trong 4 block thì ẩm; không nước, không cây thì thành đất
  const { w, id, meta } = mkWorld();
  w.setCell(0, 9, 0, B.FARMLAND, 0); w.setCell(4, 9, 0, B.WATER, 0);
  randomTick(w, 0, 9, 0, mulberry32(1));
  const wet = meta(0, 9, 0) === 1;
  w.setCell(4, 9, 0, 0, 0);
  randomTick(w, 0, 9, 0, mulberry32(1)); randomTick(w, 0, 9, 0, mulberry32(1));
  check("đất cày ẩm khi có nước trong 4 block; hết nước → khô → thành đất", wet && id(0, 9, 0) === B.DIRT);
}
{ // 6. cây non lớn thành cây; chặt thân thì lá rụng dần, lá người đặt không rụng
  const { w, id } = mkWorld();
  w.setCell(0, 9, 0, B.GRASS, 0); w.setCell(0, 10, 0, B.SAPLING, 0);
  const rng = mulberry32(9);
  let n = 0;
  while (id(0, 10, 0) === B.SAPLING && n < 500) { randomTick(w, 0, 10, 0, rng); n++; }
  let leaves = 0;
  for (let x = -2; x <= 2; x++) for (let y = 10; y <= 18; y++) for (let z = -2; z <= 2; z++) if (id(x, y, z) === B.LEAVES) leaves++;
  check("cây non lớn thành cây (thân + tán), cỏ dưới gốc thành đất", id(0, 10, 0) === B.LOG && leaves > 15 && id(0, 9, 0) === B.DIRT, `${n} lần, ${leaves} lá`);
  w.setCell(5, 14, 5, B.LEAVES, 1); // lá người chơi đặt
  for (let y = 10; y <= 17; y++) if (id(0, y, 0) === B.LOG) w.setCell(0, y, 0, 0, 0);
  for (let k = 0; k < 4; k++) for (let x = -2; x <= 2; x++) for (let y = 10; y <= 18; y++) for (let z = -2; z <= 2; z++) randomTick(w, x, y, z, rng);
  let left = 0;
  for (let x = -2; x <= 2; x++) for (let y = 10; y <= 18; y++) for (let z = -2; z <= 2; z++) if (id(x, y, z) === B.LEAVES) left++;
  check("chặt thân: lá rụng hết; lá người đặt còn", left === 0 && id(5, 14, 5) === B.LEAVES, `còn ${left}`);
}
{ // 7. cỏ lan sang đất trống đủ sáng; cỏ bị che thành đất
  const { w, id } = mkWorld();
  w.setCell(0, 9, 0, B.GRASS, 0); w.setCell(1, 9, 0, B.DIRT, 0);
  const rng = mulberry32(3);
  for (let k = 0; k < 50 && id(1, 9, 0) !== B.GRASS; k++) randomTick(w, 0, 9, 0, rng);
  w.setCell(0, 10, 0, B.STONE, 0);
  randomTick(w, 0, 9, 0, rng);
  check("cỏ lan sang đất bên cạnh; bị đá che thì thành đất", id(1, 9, 0) === B.GRASS && id(0, 9, 0) === B.DIRT);
}
