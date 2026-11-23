// Kiểm tra 8b3: đe (gộp sách phù phép, gộp hai món, sửa bằng nguyên liệu, đổi tên, phạt số lần, quá đắt, tốn cấp, đe sứt), đá mài
// (gỡ phù phép, trả XP, gộp hai món), sách phù phép trong rương, thủ thư bán sách phù phép, Vá (nhặt XP sửa đồ).
import {
  B, BLOCKS, DUNGEON_LOOT, NET, anvilBoxes, anvilResult, collisionBoxes, isFullSolid, selectionBoxes, grindResult, mineshaftLoot, stack, xpLevel, xpTotalAt, VILLAGER_PROFS, type ItemStack,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { setVillager, tradesOf } from "../server/src/mobs/villagers.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

const book = (ench: Record<string, number>): ItemStack => ({ ...stack("enchanted_book"), ench });
{ // hình đe: không phải khối đầy (khối cạnh vẫn vẽ mặt tiếp giáp, không nhìn xuyên ra trời), mặt đe dài vuông góc hướng nhìn
  const d = BLOCKS[B.ANVIL]!, noCube = [B.ANVIL, B.CHIPPED_ANVIL, B.DAMAGED_ANVIL].every((id) => !BLOCKS[id]!.opaque && BLOCKS[id]!.render === "anvil");
  const top = (m: number) => anvilBoxes(m)[3]!, len = (b: readonly number[], a: number) => b[a + 3]! - b[a]!;
  const sel = selectionBoxes(B.ANVIL | (0 << 8), 0, 0, 0, () => 0), col = collisionBoxes(B.ANVIL | (1 << 8), 0, 0, 0, () => 0);
  check("đe vẽ đúng hình (4 hộp, không đặc); hướng 0 → mặt đe dọc trục X, hướng 1 → dọc trục Z; nhắm / va chạm theo hình đe",
    noCube && !isFullSolid(B.ANVIL) && d.falls === true && len(top(0), 0) === 1 && len(top(0), 2) === 10 / 16 && len(top(1), 2) === 1 &&
    sel.length === 4 && col.length === 4 && Math.max(...col.map((b) => b[4])) === 1);
}
{
  const r = anvilResult(stack("diamond_sword"), book({ sharpness: 4 }), "");
  check("đe: sách Sắc bén IV + kiếm → kiếm Sắc bén IV (giá 4 cấp)", r.out?.ench?.sharpness === 4 && r.cost === 4 && r.use === 1, `${r.cost}`);
  const r2 = anvilResult({ ...stack("diamond_sword"), ench: { sharpness: 3 } }, book({ sharpness: 3 }), "");
  check("cùng cấp thì lên một cấp (III + III → IV)", r2.out?.ench?.sharpness === 4);
  const r3 = anvilResult({ ...stack("diamond_sword"), ench: { sharpness: 3 } }, book({ smite: 5 }), "");
  check("phù phép xung đột (Phán xét trên kiếm Sắc bén) không gộp", !r3.out);
  const r4 = anvilResult(stack("diamond_sword"), book({ efficiency: 5 }), "");
  check("phù phép không hợp loại đồ (Hiệu suất lên kiếm) không gộp", !r4.out);
  const dmg = { ...stack("iron_sword"), damage: 200 }, r5 = anvilResult(dmg, stack("iron_ingot", 5), "");
  check("sửa kiếm sắt bằng thỏi sắt: mỗi thỏi 25% (hỏng 200/250 → 4 thỏi)", r5.out?.damage === 0 && r5.use === 4 && r5.cost === 4, `${r5.out?.damage} ${r5.use}`);
  const r6 = anvilResult(stack("diamond_pickaxe"), null, "Cuốc thần");
  check("đổi tên: giá 1 cấp", r6.out?.name === "Cuốc thần" && r6.cost === 1);
  const r7 = anvilResult({ ...stack("diamond_sword"), work: 5 }, book({ sharpness: 1 }), "");
  check("phạt số lần đã qua đe (5 lần → +31): quá đắt từ 40 cấp", r7.cost === 32 && !r7.tooExpensive &&
    anvilResult({ ...stack("diamond_sword"), work: 6 }, book({ sharpness: 1 }), "").tooExpensive);
  const a = { ...stack("diamond_sword"), damage: 1000 }, b = { ...stack("diamond_sword"), damage: 1000 };
  const r8 = anvilResult(a, b, "");
  check("gộp hai kiếm hỏng: cộng độ bền + 12%", !!r8.out && r8.out.damage < 1000 && r8.cost >= 2, `${r8.out?.damage}`);
}
{
  const g = grindResult({ ...stack("diamond_sword"), ench: { sharpness: 5, looting: 3 } }, null, () => 0.99);
  check("đá mài: gỡ hết phù phép, trả kinh nghiệm", !!g.out && !g.out.ench && g.xp > 0);
  const gb = grindResult(book({ mending: 1 }), null);
  check("đá mài: sách phù phép → sách thường", gb.out?.item === "book");
  check("đá mài: hai món khác loại → không được", !grindResult(stack("iron_sword"), stack("iron_axe")).out);
}
{
  let books = 0, withEnch = 0;
  for (let i = 0; i < 300; i++)
    for (const s of mineshaftLoot(1234, i, 20, 0, DUNGEON_LOOT)) if (s?.item === "enchanted_book") (books++, s.ench && Object.keys(s.ench).length && withEnch++);
  check("rương hầm quái có sách phù phép (phù phép ngẫu nhiên)", books > 10 && books === withEnch, `${books}`);
}

// ---- server ----
const game = new Game({ seed: "dephuphep", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
p.inv.main.fill(null);
const X = Math.floor(game.spawn.x) + 40, Z = Math.floor(game.spawn.z), Y = 110;
standAt(p, X + 0.5, Y, Z + 0.5);
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(90);
for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
  game.w.setCell(X + dx, Y - 1, Z + dz, B.STONE, 0);
  for (let y = Y; y < Y + 4; y++) game.w.setCell(X + dx, y, Z + dz, 0, 0);
}
ticks(5);
game.life.mobs.list.splice(0);
{
  game.w.setCell(X + 2, Y, Z, B.ANVIL, 0);
  game.actions.stations.open(p, "anvil", X + 2, Y, Z);
  p.inv.ext[0] = stack("diamond_sword");
  p.inv.ext[1] = book({ sharpness: 5 });
  p.state.xp = xpTotalAt(10);
  const rnd = Math.random;
  Math.random = () => 0; // đe chắc chắn sứt lần này
  game.message(f.conn, JSON.stringify({ t: "anvilTake", name: "Kiếm" }));
  Math.random = rnd;
  const sword = p.inv.main.find((s) => s?.item === "diamond_sword");
  check("lấy kết quả ở đe: kiếm Sắc bén V tên mới vào túi, tốn cấp, hai ô trống", sword?.ench?.sharpness === 5 && sword.name === "Kiếm" &&
    xpLevel(p.state.xp).level === 10 - 6 && !p.inv.ext[0] && !p.inv.ext[1], `cấp ${xpLevel(p.state.xp).level}`);
  check("đe sứt sau khi dùng (12%)", (game.w.getCell(X + 2, Y, Z) & 255) === B.CHIPPED_ANVIL);
  p.inv.ext[0] = stack("diamond_sword");
  p.inv.ext[1] = book({ sharpness: 5 });
  p.state.xp = 0;
  game.message(f.conn, JSON.stringify({ t: "anvilTake", name: "" }));
  check("không đủ cấp: không lấy được", !!p.inv.ext[0] && !p.inv.ext[0]?.ench);
  game.actions.stations.open(p, "grindstone", X - 2, Y, Z); // mở cái khác: đồ ở đe trả về túi
  check("đóng đe: đồ trả về túi", p.inv.main.filter((s) => s?.item === "diamond_sword").length === 2 && p.inv.count("enchanted_book") === 1);
  const idx = p.inv.main.findIndex((s) => s?.item === "diamond_sword" && s.ench);
  p.inv.ext[0] = p.inv.main[idx]!;
  p.inv.main[idx] = null;
  game.message(f.conn, JSON.stringify({ t: "grindTake" }));
  ticks(40);
  check("đá mài: kiếm hết phù phép (giữ tên), có kinh nghiệm", p.inv.main.some((s) => s?.item === "diamond_sword" && s.name === "Kiếm" && !s.ench) && p.state.xp > 0, `${p.state.xp}`);
}
{
  p.inv.main.fill(null);
  p.inv.main[0] = { ...stack("iron_pickaxe"), damage: 100, ench: { mending: 1 } };
  p.inv.selected = 0;
  const xp0 = p.state.xp;
  game.items.xp(20, p.x, p.y, p.z);
  ticks(30);
  check("Vá: nhặt kinh nghiệm thì sửa đồ đang cầm (2 độ bền mỗi điểm), không cộng XP khi còn hỏng", p.inv.main[0]!.damage === 60 && p.state.xp === xp0,
    `hỏng ${p.inv.main[0]!.damage}, xp ${p.state.xp - xp0}`);
}
{
  const v = game.life.mobs.spawn("villager", X + 0.5, Y, Z - 2);
  setVillager(v, 0, VILLAGER_PROFS.indexOf("librarian"));
  const t = tradesOf(v), last = t[t.length - 1]!;
  check("thủ thư bán sách phù phép (ngọc lục bảo + sách, giá theo cấp, tối đa 64)", last.sell[0] === "enchanted_book" && !!last.ench &&
    last.buy2?.[0] === "book" && last.buy[1] >= 5 && last.buy[1] <= 64, `${last.buy[1]} ${JSON.stringify(last.ench)}`);
  p.inv.main.fill(null);
  p.inv.add(stack("emerald", 64));
  p.inv.add(stack("book", 1));
  p.lookYaw = 0;
  p.pitch = -0.3;
  game.message(f.conn, JSON.stringify({ t: "useMob", id: v.id }));
  game.message(f.conn, JSON.stringify({ t: "trade", mob: v.id, i: t.length - 1, all: false }));
  const got = p.inv.main.find((s) => s?.item === "enchanted_book");
  check("đổi với thủ thư: nhận sách đúng phù phép", JSON.stringify(got?.ench) === JSON.stringify(last.ench));
}
