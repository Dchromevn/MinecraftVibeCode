// Kiểm tra 8b2: kinh nghiệm (công thức cấp, quả cầu, giết quái / đào quặng, chết không mất), mía (bám cạnh nước, mọc cao, sinh tự
// nhiên), lưu ly, công thức giấy / sách / giá sách / bàn phù phép, bàn phù phép (giá sách nâng mức, 3 lựa chọn, tốn lưu ly + cấp,
// sách → sách phù phép), hiệu ứng phù phép (Sắc bén, Hiệu suất, Cảm ứng tơ, May mắn, Bảo vệ, Không phá vỡ, Cướp bóc).
import {
  B, ChunkGenerator, ENCHANTMENTS, Inventory, NET, RECIPES, blockDrops, blockIndex, createPlayer, digRate, enchantOffers, hasSupport, hurt,
  pickEnchantments, seedFromString, stack, xpLevel, xpTotalAt, armorEnchState, meleeBonus, canEat, eat, tickSurvival,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { countShelves } from "../server/src/enchanting.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---- kinh nghiệm ----
check("cấp kinh nghiệm theo công thức Minecraft (cấp 1: 7 điểm, cấp 15: 315, cấp 30: 1395)",
  xpTotalAt(1) === 7 && xpTotalAt(15) === 315 && xpTotalAt(30) === 1395 && xpLevel(320).level === 15 && xpLevel(0).level === 0);

// ---- phù phép (thuần) ----
{
  const offers = enchantOffers(12345, "diamond_sword", 15);
  check("bàn phù phép 15 giá sách: lựa chọn cuối mức 30; 3 lựa chọn tăng dần", offers.length === 3 && offers[2]!.level === 30 &&
    offers[0]!.level <= offers[1]!.level && offers[1]!.level <= offers[2]!.level, offers.map((o) => o.level).join(","));
  const a = enchantOffers(777, "iron_pickaxe", 0), b = enchantOffers(777, "iron_pickaxe", 0);
  check("cùng hạt giống → cùng lựa chọn (client hiện đúng cái server sẽ cho)", JSON.stringify(a) === JSON.stringify(b));
  let bad = 0, total = 0;
  for (let s = 0; s < 400; s++) {
    for (const item of ["diamond_sword", "iron_pickaxe", "diamond_chestplate", "bow", "crossbow", "book"]) {
      const e = pickEnchantments(() => ((s * 9301 + 49297) % 233280) / 233280, item, 30);
      total++;
      const keys = Object.keys(e), groups = keys.map((k) => ENCHANTMENTS.find((d) => d.key === k)!.group).filter(Boolean);
      if (new Set(groups).size !== groups.length || keys.some((k) => ENCHANTMENTS.find((d) => d.key === k)!.treasure)) bad++;
      if (item === "diamond_sword" && keys.some((k) => k === "efficiency" || k === "protection")) bad++;
    }
  }
  check("phù phép đúng loại đồ, không xung đột (Sắc bén / Phán xét, Cảm ứng tơ / May mắn...), không ra phù phép kho báu", bad === 0, `${bad}/${total}`);
}
// ---- hiệu ứng ----
{
  const plain = digRate(B.STONE, { tool: { kind: "pickaxe", tier: "iron" }, headInWater: false, onGround: true });
  const eff = digRate(B.STONE, { tool: { kind: "pickaxe", tier: "iron", ench: { efficiency: 5 } }, headInWater: false, onGround: true });
  check("Hiệu suất V: đào đá nhanh hơn nhiều", eff > plain * 2, `${plain.toFixed(2)} → ${eff === Infinity ? "ngay" : eff.toFixed(2)}`);
  const rng = () => 0.99;
  const silk = blockDrops(B.ORE_DIAMOND, 0, { kind: "pickaxe", tier: "iron", ench: { silk_touch: 1 } }, rng);
  const fort = blockDrops(B.ORE_DIAMOND, 0, { kind: "pickaxe", tier: "iron", ench: { fortune: 3 } }, rng);
  const lapis = blockDrops(B.ORE_LAPIS, 0, { kind: "pickaxe", tier: "stone" }, () => 0.5);
  check("Cảm ứng tơ: quặng rơi nguyên khối; May mắn III: kim cương rơi tới 4", silk[0]?.item === "ore_diamond" && fort[0]?.item === "diamond" && fort[0]!.count === 4);
  check("quặng lưu ly (cuốc đá) rơi 4–9 viên; giá sách rơi 3 sách", (lapis[0]?.count ?? 0) >= 4 && (lapis[0]?.count ?? 0) <= 9 &&
    blockDrops(B.BOOKSHELF, 0, { kind: "axe", tier: "wood" }, rng).filter((s) => s.item === "book").length === 3);
  check("Sắc bén V +3; Phán xét V +12.5 với xác sống, 0 với nhện", meleeBonus({ sharpness: 5 }, "pig") === 3 &&
    meleeBonus({ smite: 5 }, "zombie") === 12.5 && meleeBonus({ smite: 5 }, "spider") === 0);
  const s = createPlayer(0, 70, 0), t = createPlayer(0, 70, 0);
  Object.assign(t, armorEnchState([{ ...stack("iron_boots"), ench: { protection: 4, feather_falling: 4 } }, null, null, null]));
  const d1 = hurt(s, 10, "fall"), d2 = hurt(t, 10, "fall");
  check("Bảo vệ IV + Rơi nhẹ IV: rơi mất ít hơn hẳn (EPF 16 → −64%)", d1 === 10 && Math.abs(d2 - 3.6) < 0.01, `${d1} → ${d2}`);
  const inv = new Inventory();
  inv.main[0] = { ...stack("iron_pickaxe"), ench: { unbreaking: 3 } };
  for (let i = 0; i < 400; i++) inv.damageSlot("main", 0, 1);
  check("Không phá vỡ III: mòn ~1/4", inv.main[0]!.damage > 60 && inv.main[0]!.damage < 140, `${inv.main[0]!.damage}/400`);
}
// ---- công thức, mía ----
{
  const has = (out: string): boolean => RECIPES.some((r) => r.out.item === out);
  check("công thức: giấy (mía), sách, giá sách, bàn phù phép, khối lưu ly", ["paper", "book", "bookshelf", "enchanting_table", "lapis_block"].every(has));
  const at = (cells: Record<string, number>) => (x: number, y: number, z: number): number => cells[`${x},${y},${z}`] ?? 0;
  check("mía chỉ bám trên đất / cát / cỏ có nước ngay cạnh, hoặc trên mía",
    hasSupport(B.SUGAR_CANE, 0, 1, 0, at({ "0,0,0": B.SAND, "1,0,0": B.WATER })) && !hasSupport(B.SUGAR_CANE, 0, 1, 0, at({ "0,0,0": B.SAND })) &&
    hasSupport(B.SUGAR_CANE, 0, 2, 0, at({ "0,1,0": B.SUGAR_CANE })));
  const gen = new ChunkGenerator(seedFromString("dat-moi-mbgwo2"));
  let cane = 0, lapis = 0;
  for (let cx = -6; cx <= 6; cx++) for (let cz = -6; cz <= 6; cz++) {
    const c = gen.generate(cx, cz);
    for (let i = 0; i < c.data.length; i++) {
      if (c.data[i] === B.SUGAR_CANE) cane++;
      if (c.data[i] === B.ORE_LAPIS || c.data[i] === B.ORE_LAPIS_DEEP) lapis++;
    }
  }
  check("thế giới có mía (cạnh nước) và quặng lưu ly", cane > 20 && lapis > 50, `mía ${cane}, lưu ly ${lapis}`);
  void blockIndex;
}

// ---- server ----
const game = new Game({ seed: "phuphep", port: 0, spawn: "fixed", debug: true, world: "d", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!;
p.inv.main.fill(null);
const X = Math.floor(game.spawn.x) + 40, Z = Math.floor(game.spawn.z), Y = 110;
standAt(p, X + 0.5, Y, Z + 0.5);
const ticks = (n: number): void => { for (let i = 0; i < n; i++) game.tick(); };
ticks(90);
for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
  game.w.setCell(X + dx, Y - 1, Z + dz, B.STONE, 0);
  for (let y = Y; y < Y + 5; y++) game.w.setCell(X + dx, y, Z + dz, 0, 0);
}
ticks(10);
game.life.mobs.list.splice(0);
{
  game.items.xp(30, X + 0.5, Y, Z + 0.5);
  ticks(40);
  check("quả cầu kinh nghiệm bay về / nhặt được: cộng XP", p.state.xp === 30, `${p.state.xp}`);
  const z = game.life.mobs.spawn("zombie", X + 2.5, Y, Z + 0.5);
  p.lookYaw = Math.PI / 2 * 3;
  p.pitch = 0;
  p.inv.main[p.inv.selected] = { ...stack("diamond_sword"), ench: { sharpness: 5 } };
  z.health = 1;
  game.message(f.conn, JSON.stringify({ t: "hitMob", id: z.id, lag: 0 }));
  ticks(60);
  check("giết quái (do mình đánh): rơi 5 XP", p.state.xp === 35, `${p.state.xp} ${z.dead} ${z.health}`);
  p.state.health = 0;
  p.state.dead = true;
  game.message(f.conn, JSON.stringify({ t: "respawnReq" }));
  p.reset(X + 0.5, Y, Z + 0.5);
  check("chết rồi hồi sinh: không mất XP (người dùng chọn)", p.state.xp === 35);
}
{
  // bàn phù phép + 15 giá sách
  const TX = X, TZ = Z;
  game.w.setCell(TX, Y, TZ, B.ENCHANTING_TABLE, 0);
  let placed = 0;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++)
    for (const dy of [0, 1]) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 && placed < 16 && !(dx === 0 && dz === 2)) {
      game.w.setCell(TX + dx, Y + dy, TZ + dz, B.BOOKSHELF, 0);
      placed++;
    }
  check("giá sách quanh bàn (cách 1 ô trống): tối đa 15", countShelves(game.w, TX, Y, TZ) === 15);
  p.state.xp = xpTotalAt(30);
  standAt(p, TX + 0.5, Y, TZ + 1.5);
  game.actions.enchanting.open(p, TX, Y, TZ);
  check("mở bàn phù phép: 2 ô, gửi hạt giống + số giá sách", p.container?.kind === "enchant" && f.msgs.some((m) => m.t === "enchantInfo" && m.shelves === 15));
  p.inv.ext[0] = stack("diamond_pickaxe");
  p.inv.ext[1] = stack("lapis_lazuli", 5);
  const seed = p.xpSeed, offer = enchantOffers(seed, "diamond_pickaxe", 15)[2]!;
  game.message(f.conn, JSON.stringify({ t: "enchant", i: 2 }));
  check("chọn lựa chọn 3: món có đúng phù phép đã hiện, tốn 3 lưu ly + 3 cấp, hạt giống đổi",
    JSON.stringify(p.inv.ext[0]?.ench) === JSON.stringify(offer.ench) && p.inv.ext[1]?.count === 2 && xpLevel(p.state.xp).level === 27 && p.xpSeed !== seed);
  p.inv.ext[0] = stack("book", 3);
  game.message(f.conn, JSON.stringify({ t: "enchant", i: 0 }));
  check("phù phép sách: thành sách phù phép, sách thừa về túi", p.inv.ext[0]?.item === "enchanted_book" && !!p.inv.ext[0]?.ench && p.inv.count("book") === 2);
  const lvl = xpLevel(p.state.xp).level;
  p.state.xp = 0;
  p.inv.ext[0] = stack("iron_sword");
  game.message(f.conn, JSON.stringify({ t: "enchant", i: 0 }));
  check("không đủ cấp: không phù phép được", !p.inv.ext[0]?.ench && lvl > 0);
  game.life.interact.clock = () => performance.now();
  game.actions.enchanting.open(p, TX, Y, TZ); // mở lại: đồ cũ trả về túi
  check("đóng bàn phù phép: đồ trong ô trả về túi", p.inv.count("iron_sword") === 1 && p.inv.count("lapis_lazuli") === 1, `${p.inv.count("iron_sword")} ${p.inv.count("lapis_lazuli")}`);
}

// ---- (sửa lỗi người dùng báo 2026-11-15) táo vàng: tim vàng (Hấp thụ), ăn được cả khi no ----
{
  const s = createPlayer(0, 70, 0);
  s.hunger = 20;
  const food = { hunger: 4, saturation: 9.6, alwaysEdible: true, heal: 4, healTimeS: 5, absorb: 4, absorbS: 120 };
  check("táo vàng ăn được khi no", canEat(s, food));
  eat(s, food);
  check("ăn táo vàng: 2 tim vàng (4 máu phụ) trong 2 phút + hồi máu", s.absorb === 4 && s.absorbS === 120 && s.healLeft === 4);
  const lost = hurt(s, 3, "mob");
  check("bị đánh: tim vàng mất trước, máu thật giữ nguyên (vẫn tính là trúng đòn)", s.absorb === 1 && s.health === 20 && lost === 3);
  for (let i = 0; i < 20 * 121; i++) tickSurvival(s, 0.05);
  check("hết 2 phút: tim vàng biến mất", s.absorb === 0 && s.absorbS === 0);
}
