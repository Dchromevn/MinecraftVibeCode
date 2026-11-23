// Kiểm tra 6a (phần thêm 2026-11-14): tay trái (đổi tay, Shift+bấm khiên, lưu / nạp, file lưu cũ), khiên (công thức,
// đi chậm khi giơ, đỡ đòn phía trước sau 0.25 giây, mòn, rìu khóa 5 giây, người đánh bị đẩy lùi), quét kiếm, giáp mòn
// theo sức mạnh đòn.
import {
  Inventory, NET, RECIPES, SHIELD, applyInvAction, createPlayer, hurt, restoreInv, snapshotInv, stack, stepPlayer, type ServerMsg,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";
import { fakeConn, frame, inputPacket, standAt } from "./netHelpers.js";

// ---- tay trái ----
{
  const inv = new Inventory();
  inv.main[0] = stack("diamond_sword");
  inv.main[5] = stack("shield");
  applyInvAction(inv, { t: "swapHands" });
  check("F: kiếm sang tay trái, tay phải trống", inv.offhand[0]?.item === "diamond_sword" && inv.main[0] === null);
  applyInvAction(inv, { t: "swapHands" });
  inv.click("main", 5, "left", true); // Shift + bấm khiên
  check("Shift + bấm khiên: vào tay trái", inv.offhand[0]?.item === "shield" && inv.main[5] === null);
  applyInvAction(inv, { t: "offhand", area: "main", i: 0 });
  check("trỏ + F trong túi đồ: đổi ô đó với tay trái", inv.offhand[0]?.item === "diamond_sword" && inv.main[0]?.item === "shield");
  const back = new Inventory();
  restoreInv(back, snapshotInv(inv, 0));
  const old = snapshotInv(inv, 0);
  delete old.offhand; // file lưu từ trước 6a
  const fromOld = new Inventory();
  fromOld.offhand[0] = stack("bread");
  restoreInv(fromOld, old);
  check("lưu / nạp giữ đồ tay trái; file lưu cũ (không có tay trái) nạp được, tay trái trống",
    back.offhand[0]?.item === "diamond_sword" && fromOld.offhand[0] === null);
  check("chết: rơi cả đồ tay trái", inv.takeAll().some((s) => s.item === "diamond_sword") && inv.offhand[0] === null);
}

// ---- khiên: công thức, đi chậm ----
check("công thức khiên: 6 ván + 1 thỏi sắt", RECIPES.some((r) => r.out.item === "shield" && r.key["I"] === "iron_ingot"));
{
  const flat = (x: number, y: number, z: number): number => (y < 64 ? 1 : 0);
  const walk = (block: boolean): number => {
    const s = createPlayer(0.5, 64, 0.5);
    for (let i = 0; i < 120; i++) stepPlayer(s, { forward: 1, strafe: 0, jump: false, sneak: false, sprint: true, yaw: 0, block }, flat);
    return -s.z;
  };
  const free = walk(false), slow = walk(true);
  check("giơ khiên: đi chậm (~20%), không chạy nhanh được", slow < free * 0.25 && slow > 0.1, `${slow.toFixed(2)} / ${free.toFixed(2)} block`);
}

// ---- server ----
const game = new Game({ seed: "khien", port: 0, spawn: "fixed", debug: true, world: "s", admins: [], adminAll: true, dataDir: null });
let now = 200000;
game.combat.clock = game.movement.clock = () => now;
const join = (name: string) => {
  const f = fakeConn();
  game.message(f.conn, JSON.stringify({ t: "hello", name, password: "matkhau", version: NET.PROTOCOL_VERSION }));
  return { f, p: game.online().find((o) => o.name === name)! };
};
const A = join("an"), V = join("binh"), W = join("chi");
const X = Math.floor(game.spawn.x) + 60, Z = Math.floor(game.spawn.z), Y = 110;
const setup = (): void => {
  for (const q of [A, V, W]) {
    Object.assign(q.p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0, armorPoints: 0, armorToughness: 0 });
    q.p.inv.main.fill(null);
    q.p.inv.offhand[0] = null;
    q.p.inv.armor.fill(null);
    q.p.blocking = false;
    q.p.shieldOffUntil = -1e9;
    q.p.hist.length = 0;
    q.p.sprinting = false;
  }
  standAt(A.p, X + 0.5, Y, Z + 0.5);
  standAt(V.p, X + 0.5, Y, Z - 1.5);
  standAt(W.p, X + 30.5, Y, Z + 0.5); // ở xa (không bị quét)
  A.p.lookYaw = 0;
  A.p.pitch = 0;
  A.p.inv.selected = 0;
  A.p.inv.main[0] = stack("diamond_sword");
  V.p.lookYaw = Math.PI; // nhìn về phía A (+Z)
  V.p.inv.offhand[0] = stack("shield");
};
setup();
for (let i = 0; i < 80; i++) game.tick();
const raise = (ago = 1000): void => {
  V.p.blocking = true;
  V.p.blockSince = now - ago;
};
const hit = (): void => {
  now += 1000;
  for (const q of [V, W]) q.p.state.invulnS = 0;
  game.message(A.f.conn, JSON.stringify({ t: "attack", id: V.p.id, lag: 0 }));
};

setup();
raise();
hit();
check("khiên đỡ đòn phía trước: không mất máu, khiên mất 1 + 7 độ bền, người đánh bị đẩy lùi",
  V.p.state.health === 20 && V.p.inv.offhand[0]?.damage === 8 && A.p.state.vz > 1, `máu ${V.p.state.health}, khiên ${V.p.inv.offhand[0]?.damage}`);
setup();
raise(100 - 1000); // hit() cho đồng hồ chạy thêm 1 giây: lúc đánh mới giơ được 0.1 giây
hit();
check("vừa giơ khiên (< 0.25 giây): chưa đỡ được", V.p.state.health < 20);
setup();
raise();
V.p.lookYaw = 0; // quay lưng về phía A
hit();
check("bị đánh từ phía sau: khiên không đỡ", V.p.state.health < 20);
setup();
raise();
A.p.inv.main[0] = stack("diamond_axe");
hit();
const off = V.f.msgs.some((m: ServerMsg) => m.t === "shieldOff" && m.s === SHIELD.DISABLE_S);
check("rìu đánh vào khiên: khiên bị khóa 5 giây, người giơ khiên được báo", V.p.state.health === 20 && off && V.p.shieldOffUntil > now);
raise();
hit();
check("khiên đang bị khóa: không đỡ được", V.p.state.health < 20);
// server bỏ cờ "giơ khiên" khi không cầm khiên
setup();
V.p.inv.offhand[0] = null;
game.message(V.f.conn, inputPacket(V.p.lastSeq + 1, [frame({ block: true })]));
check("không cầm khiên mà gửi \"giơ khiên\": server bỏ qua", !V.p.blocking);
V.p.inv.offhand[0] = stack("shield");
game.message(V.f.conn, inputPacket(V.p.lastSeq + 1, [frame({ block: true })]));
check("cầm khiên: server ghi nhận đang giơ khiên", V.p.blocking && V.p.blockSince === now);

// ---- quét kiếm ----
const sweepSetup = (): void => {
  setup();
  standAt(W.p, X + 1.5, Y, Z - 1.5); // đứng sát mục tiêu
  A.p.state.onGround = true;
};
sweepSetup();
hit();
check("quét kiếm: người đứng sát mục tiêu mất 1 máu và bị đẩy", V.p.state.health === 13 && W.p.state.health === 19 && Math.hypot(W.p.state.vx, W.p.state.vz) > 1,
  `mục tiêu ${V.p.state.health}, bên cạnh ${W.p.state.health}`);
sweepSetup();
A.p.sprinting = true;
hit();
check("đang chạy nhanh: không quét", W.p.state.health === 20);
sweepSetup();
A.p.inv.main[0] = stack("diamond_axe");
hit();
check("rìu: không quét", W.p.state.health === 20);
sweepSetup();
A.p.state.onGround = false;
hit();
check("trên không: không quét", W.p.state.health === 20);
sweepSetup();
standAt(W.p, X + 3.5, Y, Z - 1.5);
hit();
check("người cách mục tiêu 3 block: không bị quét", W.p.state.health === 20);

// ---- giáp mòn theo sức mạnh đòn ----
{
  const s = createPlayer(0, 0, 0);
  s.armorPoints = 20;
  hurt(s, 12, "player");
  const a = s.armorHits;
  const t = createPlayer(0, 0, 0);
  t.armorPoints = 20;
  hurt(t, 2, "player");
  check("giáp mòn = sát thương / 4 (ít nhất 1): đòn 12 → 3, đòn 2 → 1", a === 3 && t.armorHits === 1);
}
