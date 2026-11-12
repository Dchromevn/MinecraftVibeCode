// Kiểm tra 4a: túi đồ không nhân đôi/mất đồ, chế tạo, rơi đồ theo công cụ, đói, ăn, giáp, chết.
import {
  B, Inventory, RECIPES, armorReduce, blockDrops, fillFromBook, gridResult, takeResult, matchGrid, createPlayer, eat, FOODS, hurt, mulberry32, stack,
  stepPlayer, tickSurvival, allItems, itemDef, BLOCKS, makeCell, dragSpread, collectToCursor, swapWithHotbar,
  takeFromSlot, dropCursor, type PlayerInput,
} from "../shared/src/index.js";
import { check } from "./harness.js";

const total = (inv: Inventory) => {
  const m = new Map<string, number>();
  for (const s of [...inv.main, ...inv.armor, ...inv.craft, inv.cursor]) if (s) m.set(s.item, (m.get(s.item) ?? 0) + s.count);
  return JSON.stringify([...m].sort());
};

{ // 1. bấm ngẫu nhiên 20000 lần: tổng không đổi, không chồng nào vượt giới hạn
  const inv = new Inventory();
  inv.add(stack("cobble", 150)); inv.add(stack("stick", 33)); inv.add(stack("iron_pickaxe", 1, 17));
  inv.add(stack("iron_helmet")); inv.add(stack("diamond_boots")); inv.add(stack("torch", 64)); inv.add(stack("apple", 5));
  const before = total(inv);
  const rng = mulberry32(7);
  let bad = "";
  for (let t = 0; t < 20000; t++) {
    const u = rng();
    const area = u < 0.15 ? "armor" : u < 0.3 ? "craft" : "main";
    inv.click(area, Math.floor(rng() * (area === "armor" ? 4 : area === "craft" ? 9 : 36)), rng() < 0.5 ? "left" : "right", rng() < 0.15);
    if (t === 10000) inv.setCraftSize(3).forEach((s) => inv.add(s));
    for (const s of [...inv.main, ...inv.armor, inv.cursor]) if (s && (s.count <= 0 || s.count > (itemDef(s.item)?.maxStack ?? 64))) bad = JSON.stringify(s);
    inv.armor.forEach((s, i) => { if (s && !Inventory.fitsArmor(i, s)) bad = "giáp sai ô " + s.item; });
  }
  inv.returnCursor();
  inv.returnCraft();
  check("20000 lần bấm: không nhân đôi, không mất, không vượt giới hạn", total(inv) === before && !bad, bad || before);
}
{ // 2. chế tạo bằng lưới: thân gỗ → ván → bàn → que → cuốc gỗ (3x3); cuốc không làm được ở 2x2
  const inv = new Inventory();
  inv.add(stack("log", 3));
  const r = (id: string) => RECIPES.find((x) => x.out.item === id)!;
  inv.setCraftSize(2);
  inv.craft[3] = inv.takeHeld(1); // 1 thân gỗ vào góc dưới phải: không cần hình
  const planksOk = gridResult(inv)?.out.item === "planks";
  takeResult(inv, true); // Shift: làm liên tục
  const allPlanks = inv.count("planks") === 4 && !inv.craft.some(Boolean);
  inv.add(stack("log", 2));
  fillFromBook(inv, r("planks"), true); takeResult(inv, true);
  fillFromBook(inv, r("workbench"), false); takeResult(inv, false); inv.returnCursor();
  fillFromBook(inv, r("stick"), false); takeResult(inv, false); inv.returnCursor();
  const no2x2 = !fillFromBook(inv, r("wood_pickaxe"), false) && matchGrid(["planks", "planks", "stick", null], 2) === null;
  inv.setCraftSize(3);
  const ok3 = fillFromBook(inv, r("wood_pickaxe"), false) && gridResult(inv)?.out.item === "wood_pickaxe";
  takeResult(inv, false); inv.returnCursor();
  check("thân gỗ → ván (Shift) → bàn → que → cuốc gỗ chỉ ở lưới 3x3",
    planksOk && allPlanks && no2x2 && ok3 && inv.count("wood_pickaxe") === 1 && inv.count("workbench") === 1 && inv.count("planks") === 11 && inv.count("stick") === 2, // 4 + 16 − 4 − 2 − 3
    `ván ${inv.count("planks")}, que ${inv.count("stick")}, bàn ${inv.count("workbench")}`);
  const g = (cells: (string | null)[]) => matchGrid(cells, 3)?.out.item ?? null;
  check("rìu lật ngang vẫn khớp; hình sai không khớp",
    g(["planks", "planks", null, "planks", "stick", null, null, "stick", null]) === "wood_axe"
    && g([null, "planks", "planks", null, "stick", "planks", null, "stick", null]) === "wood_axe"
    && g(["planks", "planks", "planks", null, null, "stick", null, "stick", null]) === null);
  check("hình đặt lệch vị trí trong lưới vẫn khớp (que ở cột phải)", g([null, null, "planks", null, null, "planks", null, null, null]) === "stick");
  const missing = RECIPES.flatMap((x) => [x.out.item, ...x.inputs.map((i) => i.item)]).filter((k) => !itemDef(k));
  check("mọi công thức dùng vật phẩm có trong bảng", missing.length === 0, missing.join(","));
}
{ // 3. rơi đồ theo cấp công cụ
  const rng = mulberry32(3);
  const tool = (kind: string, tier: string) => ({ kind: kind as never, tier: tier as never });
  const keys = (id: number, t: ReturnType<typeof tool> | null) => blockDrops(id, 0, t, rng).map((s) => s.item).join(",");
  check("đá bằng tay: không rơi; cuốc gỗ: đá cuội", keys(B.STONE, null) === "" && keys(B.STONE, tool("pickaxe", "wood")) === "cobble");
  check("sắt: cuốc gỗ không rơi, cuốc đá ra sắt thô", keys(B.ORE_IRON, tool("pickaxe", "wood")) === "" && keys(B.ORE_IRON, tool("pickaxe", "stone")) === "raw_iron");
  check("kim cương cần cuốc sắt; cuốc vàng không đào được sắt", keys(B.ORE_DIAMOND, tool("pickaxe", "stone")) === "" && keys(B.ORE_DIAMOND, tool("pickaxe", "iron")) === "diamond" && keys(B.ORE_IRON, tool("pickaxe", "gold")) === "");
  check("đất / gỗ bằng tay vẫn rơi", keys(B.DIRT, null) === "dirt" && keys(B.LOG, null) === "log" && keys(B.GRASS, null) === "dirt");
  let flint = 0, apples = 0;
  for (let i = 0; i < 10000; i++) { if (keys(B.GRAVEL, null) === "flint") flint++; if (keys(B.LEAVES, null).includes("apple")) apples++; }
  check("sỏi ra đá lửa ~10%, lá ra táo ~5%", Math.abs(flint / 100 - 10) < 1.5 && Math.abs(apples / 100 - 5) < 1, `đá lửa ${flint / 100}%, táo ${apples / 100}%`);
  const unknown = BLOCKS.flatMap((b) => b.drops.map((d) => d.item)).filter((k) => !itemDef(k));
  check("mọi vật phẩm rơi từ block có trong bảng", unknown.length === 0, unknown.join(","));
}
{ // 4. đói: chạy nhanh làm tụt đói; ăn táo; hồi máu; đói 0 mất máu tới 1
  const m = new Map<string, number>();
  for (let x = -200; x <= 200; x++) for (let z = -3; z <= 3; z++) m.set(`${x},9,${z}`, makeCell(B.STONE));
  const cell = (x: number, y: number, z: number) => (y < 0 ? B.STONE : m.get(`${x},${y},${z}`) ?? 0);
  const s = createPlayer(-190.5, 10, 0.5);
  const run: PlayerInput = { forward: 1, strafe: 0, jump: true, sneak: false, sprint: true, yaw: -Math.PI / 2 };
  const s0 = { hunger: s.hunger, sat: s.saturation };
  for (let t = 0; t < 60 * 60; t++) { stepPlayer(s, run, cell); if (s.x > 180) { s.x = -190.5; } }
  check("chạy + nhảy 60 s làm tụt độ no / đói", s.hunger + s.saturation < s0.hunger + s0.sat - 3, `đói ${s.hunger}, no ${s.saturation.toFixed(1)}`);
  s.hunger = 10; s.saturation = 0;
  eat(s, FOODS.apple!);
  check("ăn táo: +4 đói, +2.4 độ no", s.hunger === 14 && Math.abs(s.saturation - 2.4) < 1e-9);
  const p = createPlayer(0, 10, 0); p.health = 10; p.hunger = 19; p.saturation = 0; // mỗi lần hồi tốn 6 hao sức → tụt 1 đói
  for (let t = 0; t < 60 * 8.1; t++) tickSurvival(p, 1 / 60);
  check("đói 19→18: hồi 1 máu mỗi 4 s (2 lần), mỗi lần tốn 6 hao sức (đói 19 → 16)", p.health === 12 && p.hunger === 16, `máu ${p.health}, đói ${p.hunger}`);
  const q = createPlayer(0, 10, 0); q.health = 3; q.hunger = 0; q.saturation = 0;
  for (let t = 0; t < 60 * 30; t++) tickSurvival(q, 1 / 60);
  check("đói 0: mất máu, dừng ở 1", q.health === 1 && !q.dead, `máu ${q.health}`);
  const g = createPlayer(0, 10, 0); g.health = 10;
  eat(g, FOODS.golden_apple!);
  for (let t = 0; t < 60 * 5.1; t++) tickSurvival(g, 1 / 60);
  check("táo vàng hồi ≥ 4 máu trong 5 s", g.health >= 14, `máu ${g.health.toFixed(2)}`);
}
{ // 5. giáp: công thức; không chặn sát thương rơi; chết
  const s = createPlayer(0, 10, 0);
  s.armorPoints = 20; s.armorToughness = 8;
  hurt(s, 10, "other");
  const fire = 20 - s.health;
  const s2 = createPlayer(0, 10, 0); s2.armorPoints = 20; hurt(s2, 10, "fall");
  check("giáp kim cương đủ bộ giảm 10 → 2.4 (đòn thường); rơi không giảm", Math.abs(fire - 10 * (1 - Math.min(20, Math.max(4, 20 - 40 / 16)) / 25)) < 1e-9 && s2.health === 10,
    `nhận ${fire.toFixed(2)}, rơi ${20 - s2.health}`);
  check("đòn nhỏ: mỗi điểm giáp ~4% (10 điểm giảm 38%)", Math.abs(armorReduce(1, 10, 0) - 0.62) < 1e-9, `${armorReduce(1, 10, 0)}`);
  const d = createPlayer(0, 10, 0); hurt(d, 25, "fall");
  check("hết máu thì chết", d.dead && d.health === 0);
}
{ // 6. thao tác chuột như thể loại gốc
  const inv = new Inventory();
  inv.setCraftSize(3);
  inv.cursor = stack("planks", 10);
  dragSpread(inv, [0, 1, 2].map((i) => ({ area: "craft" as const, i })), "left");
  const even = inv.craft.slice(0, 3).every((s) => s?.count === 3) && inv.cursor?.count === 1;
  inv.cursor = stack("stick", 5);
  dragSpread(inv, [3, 4, 5, 4].map((i) => ({ area: "craft" as const, i })), "right");
  const ones = [3, 4, 5].every((i) => inv.craft[i]?.count === 1) && inv.cursor?.count === 2;
  check("kéo trái chia đều (10 ván / 3 ô = 3 mỗi ô, dư 1); kéo phải đặt 1 mỗi ô", even && ones);
  inv.add(stack("stick", 20));
  collectToCursor(inv);
  check("bấm đúp gom cùng loại lên con trỏ", inv.cursor?.count === 2 + 3 + 20 && inv.count("stick") === 0, `${inv.cursor?.count}`);
  inv.cursor = null;
  inv.main[12] = stack("iron_helmet");
  swapWithHotbar(inv, { area: "main", i: 12 }, 4);
  const sw = inv.main[4]?.item === "iron_helmet" && !inv.main[12];
  swapWithHotbar(inv, { area: "armor", i: 1 }, 4); // mũ không vào ô áo
  check("phím số đổi chỗ với hotbar; ô giáp chỉ nhận đúng món", sw && inv.main[4]?.item === "iron_helmet" && !inv.armor[1]);
  const q = takeFromSlot(inv, { area: "craft", i: 0 }, false);
  const d = dropCursor(Object.assign(inv, { cursor: stack("apple", 5) }), "right");
  const cur = inv.cursor as { count: number } | null; // TS vẫn coi cursor là null sau phép gán ở trên
  check("Q vứt 1; bấm phải ra ngoài vứt 1", q?.count === 1 && inv.craft[0]?.count === 2 && d?.count === 1 && cur?.count === 4);
}
check("mọi vật phẩm có icon", allItems().every((i) => !!i.icon));
{ // kéo-thả tráo đổi (giao diện gọi: nhấc ô A, bấm ô B, rồi bấm lại ô A)
  const inv = new Inventory();
  inv.main[0] = stack("dirt", 10);
  inv.main[5] = stack("stone", 3);
  inv.ext = [stack("planks", 7), null];
  inv.click("main", 0, "left", false);
  inv.click("ext", 0, "left", false);
  if (inv.cursor) inv.click("main", 0, "left", false);
  const swapped = inv.ext[0]?.item === "dirt" && inv.main[0]?.item === "planks" && !inv.cursor;
  inv.click("main", 5, "left", false);
  inv.click("ext", 1, "left", false);
  if (inv.cursor) inv.click("main", 5, "left", false);
  check("kéo đồ từ túi sang rương: ô có đồ thì tráo chỗ, ô trống thì chuyển sang", swapped && inv.ext[1]?.item === "stone" && !inv.main[5]);
}
