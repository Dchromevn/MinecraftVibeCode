// Kiểm tra 4f: 16 thuốc nhuộm, len / thảm / kính màu / tấm kính / giường theo màu, kéo, khối tài nguyên,
// lồng đèn, tấm kính & song sắt nối nhau, lửa (chạm thì cháy, nước dập), và trên server: bật lửa → lửa tự tắt,
// nút / cần gạt mở cửa sắt, cửa sắt không mở bằng tay.
import {
  B, BLOCKS, COLORS, NET, RECIPES, bedColor, blockDrops, canHarvest, canPlace, collisionBoxes, createPlayer, digRate, fuelValue,
  itemDef, makeCell, matchGrid, mulberry32, paneBoxes, placeCells, planPlace, smeltResult, stepPlayer, switchOn,
  type BlockAccess, type PlaceHit, type ServerMsg,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";

const g3 = (cells: (string | null)[]) => matchGrid(cells, 3)?.out;
const g2 = (cells: (string | null)[]) => matchGrid(cells, 2)?.out;

{ // 1. 16 thuốc nhuộm: mỗi màu có cách làm; trộn màu đúng
  const made = new Set(RECIPES.map((r) => r.out.item));
  const all = COLORS.every((c) => made.has(`${c}_dye`) || smeltResult("cactus") === `${c}_dye`);
  const o = g2(["red_dye", "yellow_dye", null, null]), m = g2(["purple_dye", "pink_dye", null, null]), k = g2(["coal", null, null, null]);
  check("đủ 16 thuốc nhuộm có cách làm; đỏ + vàng → 2 cam; tím + hồng → 2 đỏ tía; than → đen",
    all && o?.item === "orange_dye" && o.count === 2 && m?.item === "magenta_dye" && k?.item === "black_dye");
}

function mkWorld() {
  const m = new Map<string, number>();
  const w: BlockAccess = {
    getCell: (x, y, z) => m.get(`${x},${y},${z}`) ?? 0,
    setCell: (x, y, z, id, meta) => { if (id === 0) m.delete(`${x},${y},${z}`); else m.set(`${x},${y},${z}`, makeCell(id, meta)); },
  };
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) w.setCell(x, 9, z, B.STONE, 0);
  const cell = (x: number, y: number, z: number) => m.get(`${x},${y},${z}`) ?? 0;
  const place = (item: string, hit: PlaceHit, yaw = 0): boolean => {
    const d = itemDef(item)!;
    const cells = planPlace(d.places!, hit, yaw, w.getCell, d.meta);
    if (!cells || !canPlace(cells, w.getCell, null)) return false;
    placeCells(w, cells, () => undefined);
    return true;
  };
  return { w, cell, place };
}
const floor = (x: number, z: number): PlaceHit => ({ x, y: 9, z, nx: 0, ny: 1, nz: 0, fy: 1 });

{ // 2. len, thảm, kính màu, giường theo màu
  const wool = g2(["string", "string", "string", "string"]);
  const red = g2(["red_dye", "white_wool", null, null]), blueFromRed = g2(["blue_wool", null, "blue_dye", null]);
  const carpet = g2(["lime_wool", "lime_wool", null, null]);
  const glass = g3(["glass", "glass", "glass", "glass", "cyan_dye", "glass", "glass", "glass", "glass"]);
  const bed = g3(["pink_wool", "pink_wool", "pink_wool", "birch_planks", "planks", "acacia_planks", null, null, null]);
  const rebed = g2(["red_bed", "black_dye", null, null]);
  check("4 sợi tơ → len trắng; nhuộm len (cả len đã có màu); 2 len → 3 thảm; 8 kính + thuốc nhuộm → 8 kính màu; len + ván → giường; giường + thuốc nhuộm → đổi màu",
    wool?.item === "white_wool" && red?.item === "red_wool" && blueFromRed?.item === "blue_wool" && carpet?.item === "lime_carpet" && carpet.count === 3
    && glass?.item === "cyan_stained_glass" && glass.count === 8 && bed?.item === "pink_bed" && rebed?.item === "black_bed");
  const { cell, place } = mkWorld();
  place("red_wool", floor(0, 0)); place("lime_carpet", floor(1, 0)); place("blue_stained_glass", floor(2, 0));
  place("yellow_bed", floor(3, 0), 0);
  const w = cell(0, 10, 0), c = cell(1, 10, 0), gl = cell(2, 10, 0), bd = cell(3, 10, 0);
  check("đặt ra đúng màu (dữ liệu phụ); giường giữ màu ở cả hai ô",
    (w & 255) === B.WOOL && w >> 8 === 14 && (c & 255) === B.CARPET && c >> 8 === 5 && (gl & 255) === B.STAINED_GLASS && gl >> 8 === 11
    && (bd & 255) === B.BED && bedColor(bd >> 8) === 4 && bedColor(cell(3, 10, -1) >> 8) === 4);
  const r = mulberry32(1), drop = (c0: number) => blockDrops(c0 & 255, c0 >> 8, null, r)[0]?.item ?? "∅";
  check("phá ra đúng màu; kính màu không rơi gì", drop(w) === "red_wool" && drop(c) === "lime_carpet" && drop(bd) === "yellow_bed" && drop(gl) === "∅",
    `${drop(w)} ${drop(c)} ${drop(bd)} ${drop(gl)}`);
  check("thảm không đặt được lên không khí", !mkWorld().place("red_carpet", { x: 0, y: 20, z: 0, nx: 0, ny: 0, nz: 0 }));
}

{ // 3. kéo: lá / mạng nhện nhanh và rơi ra chính nó; len nhanh hơn tay
  const shears = { kind: "shears" as const, tier: "iron" as const }, ctx = { tool: shears, headInWater: false, onGround: true };
  const r = mulberry32(2);
  check("kéo: lá, mạng nhện, cỏ cao rơi ra chính nó; đào lá / mạng nhện / len nhanh hơn tay",
    g2([null, "iron_ingot", "iron_ingot", null])?.item === "shears"
    && blockDrops(B.BIRCH_LEAVES, 0, shears, r)[0]?.item === "birch_leaves" && blockDrops(B.COBWEB, 0, shears, r)[0]?.item === "cobweb"
    && blockDrops(B.TALLGRASS, 0, shears, r)[0]?.item === "tallgrass" && canHarvest(B.COBWEB, shears)
    && digRate(B.COBWEB, ctx) > 10 * digRate(B.COBWEB, { ...ctx, tool: null }) && digRate(B.WOOL, ctx) > digRate(B.WOOL, { ...ctx, tool: null }));
}

{ // 4. khối tài nguyên, mảnh sắt, lồng đèn, song sắt, tấm kính, cửa sắt, nút, cần gạt
  const nine = (x: string) => g3([x, x, x, x, x, x, x, x, x]);
  const back = g2(["iron_block", null, null, null]);
  check("9 thỏi ↔ khối sắt; thỏi ↔ 9 mảnh; khối than đốt 80 món; khối sắt cần cuốc đá",
    nine("iron_ingot")?.item === "iron_block" && back?.item === "iron_ingot" && back.count === 9 && nine("iron_nugget")?.item === "iron_ingot"
    && g2(["iron_ingot", null, null, null])?.item === "iron_nugget" && fuelValue("coal_block") === 80
    && !canHarvest(B.IRON_BLOCK, { kind: "pickaxe", tier: "wood" }) && canHarvest(B.IRON_BLOCK, { kind: "pickaxe", tier: "stone" }));
  const N = "iron_nugget", I = "iron_ingot";
  check("lồng đèn, song sắt ×16, tấm kính ×16, cửa sắt ×3, nút đá, nút gỗ, cần gạt",
    g3([N, N, N, N, "torch", N, N, N, N])?.item === "lantern" && g3([I, I, I, I, I, I, null, null, null])?.count === 16
    && g3(["glass", "glass", "glass", "glass", "glass", "glass", null, null, null])?.item === "glass_pane"
    && g3([I, I, null, I, I, null, I, I, null])?.item === "iron_door" && g2(["stone", null, null, null])?.item === "stone_button"
    && g2(["spruce_planks", null, null, null])?.item === "oak_button" && g2(["stick", null, "cobble", null])?.item === "lever");
  const { cell, place, w } = mkWorld();
  place("lantern", floor(0, 0));
  w.setCell(2, 12, 0, B.STONE, 0);
  place("lantern", { x: 2, y: 12, z: 0, nx: 0, ny: -1, nz: 0, fy: 0 });
  check("lồng đèn: đặt trên sàn / treo dưới trần, phát sáng 15", cell(0, 10, 0) >> 8 === 0 && (cell(2, 11, 0) & 255) === B.LANTERN && cell(2, 11, 0) >> 8 === 1
    && BLOCKS[B.LANTERN]!.lightEmit === 15);
  for (const x of [0, 1, 2]) place("glass_pane", floor(x, 3));
  place("iron_bars", floor(3, 3));
  const idAt = (x: number, y: number, z: number) => cell(x, y, z) & 255;
  check("tấm kính nối nhau và nối song sắt", paneBoxes(1, 10, 3, idAt).length === 3 && paneBoxes(2, 10, 3, idAt).length === 3);
  const s = createPlayer(1.5, 10, 5.5);
  for (let t = 0; t < 90; t++) stepPlayer(s, { forward: 1, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0 }, (x, y, z) => cell(x, y, z));
  check("không đi xuyên tấm kính", s.z > 3.5, `z=${s.z.toFixed(2)}`);
  check("song sắt có va chạm như tấm kính", collisionBoxes(makeCell(B.IRON_BARS, 0), 3, 10, 3, idAt).length === 2);
}

{ // 5. lửa: chạm vào thì mất máu và bị cháy
  const m = new Map<string, number>([["0,9,0", B.STONE], ["0,10,0", B.FIRE]]);
  const s = createPlayer(0.5, 10, 0.5);
  s.hunger = 17; s.saturation = 0;
  stepPlayer(s, { forward: 0, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0 }, (x, y, z) => m.get(`${x},${y},${z}`) ?? 0);
  check("đứng trong lửa: mất 1 máu, bị cháy 8 giây", s.health === 19 && s.burnS >= 7.9, `máu ${s.health}, cháy ${s.burnS.toFixed(1)}`);
}

{ // 6. server: bật lửa, lửa tự tắt; nút / cần gạt mở cửa sắt; cửa sắt không mở bằng tay
  const game = new Game({ seed: "decor", port: 0, spawn: "fixed", debug: true });
  const msgs: ServerMsg[] = [];
  const conn = { send: (d: string) => void msgs.push(JSON.parse(d) as ServerMsg), close: () => undefined };
  const send = (m: object): void => game.message(conn, JSON.stringify(m));
  send({ t: "hello", name: "Tho", version: NET.PROTOCOL_VERSION });
  const sp = game.spawn, X = Math.floor(sp.x), Y = 110, Z = Math.floor(sp.z);
  send({ t: "move", x: X + 0.5, y: Y + 1, z: Z + 3.5, yaw: 0, pitch: 0, flying: true, sneaking: false, swing: 0, health: 20, dead: false });
  for (let i = 0; i < 160; i++) game.tick();
  let seq = 1;
  const use = (item: string | null, hit: object, yaw = 0): void => {
    if (item) {
      send({ t: "inv", seq: seq++, a: { t: "select", n: 0 } });
      send({ t: "inv", seq: seq++, a: { t: "throwHeld", all: true } });
      send({ t: "give", item, count: 1 });
    }
    send({ t: "use", hit, src: null, sneaking: false, yaw });
  };
  const at = (x: number, y: number, z: number) => game.w.getCell(x, y, z);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) use("stone", { x: X + x, y: Y, z: Z + z, nx: 0, ny: 1, nz: 0 });
  use("flint_and_steel", { x: X + 2, y: Y, z: Z + 2, nx: 0, ny: 1, nz: 0 });
  const lit = (at(X + 2, Y + 1, Z + 2) & 255) === B.FIRE;
  for (let i = 0; i < 6.5 * NET.SERVER_TICK_RATE; i++) game.tick();
  check("bật lửa đốt lửa trên khối đầy; lửa tự tắt sau ≤ 6 giây", lit && at(X + 2, Y + 1, Z + 2) === 0);

  use("iron_door", { x: X, y: Y, z: Z, nx: 0, ny: 1, nz: 0 });
  const door = (): number => at(X, Y + 1, Z) >> 8;
  use(null, { x: X, y: Y + 1, z: Z, nx: 0, ny: 0, nz: 1 });
  game.tick();
  const handOpen = (door() & 4) !== 0;
  use("lever", { x: X + 1, y: Y, z: Z, nx: 0, ny: 1, nz: 0 }); // cần gạt trên sàn cạnh cửa
  use(null, { x: X + 1, y: Y + 1, z: Z, nx: 0, ny: 1, nz: 0 }); // gạt lên
  game.tick();
  const leverOn = switchOn(at(X + 1, Y + 1, Z) >> 8) && (door() & 4) !== 0;
  use(null, { x: X + 1, y: Y + 1, z: Z, nx: 0, ny: 1, nz: 0 }); // gạt xuống
  game.tick();
  const leverOff = (door() & 4) === 0;
  check("cửa sắt: chuột phải không mở; gạt cần gạt bên cạnh thì mở, gạt lại thì đóng", !handOpen && leverOn && leverOff,
    `tay ${handOpen}, bật ${leverOn}, tắt ${leverOff}`);
  use("stone_button", { x: X - 1, y: Y, z: Z, nx: 0, ny: 1, nz: 0 });
  use(null, { x: X - 1, y: Y + 1, z: Z, nx: 0, ny: 1, nz: 0 });
  game.tick();
  const pressed = (door() & 4) !== 0;
  for (let i = 0; i < 1.2 * NET.SERVER_TICK_RATE; i++) game.tick();
  check("nút đá: bấm thì cửa sắt mở, sau 1 giây tự đóng", pressed && (door() & 4) === 0);
}
