// Kiểm tra 5b (thư mục tạm, không đụng server/data): tài khoản + mật khẩu, lưu rồi khởi động lại server
// thì block đã sửa, rương, vật phẩm rơi, người chơi (vị trí, máu, túi đồ) còn nguyên; ghi file an toàn;
// quản trị viên; chunk lưu bằng bộ sinh thế giới cũ vẫn giữ đúng nhà đã xây.
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { B, NET, WORLDGEN_VERSION, blockIndex, chunkKey, createItemEntity, type ServerMsg } from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import type { ServerConfig } from "../server/src/config.js";
import { ServerWorld } from "../server/src/serverWorld.js";
import { check } from "./harness.js";
import { flyPacket } from "./netHelpers.js";

const dir = mkdtempSync(join(tmpdir(), "voxel-save-"));
const cfg = (o: Partial<ServerConfig> = {}): ServerConfig =>
  ({ seed: "luu", port: 0, spawn: "fixed", debug: true, world: "w", admins: [], adminAll: true, dataDir: dir, ...o });

function join5(game: Game, name: string, password: string) {
  const msgs: ServerMsg[] = [];
  const conn = { send: (d: string | ArrayBuffer) => void (typeof d === "string" && msgs.push(JSON.parse(d) as ServerMsg)), close: () => undefined };
  game.message(conn, JSON.stringify({ t: "hello", name, password, version: NET.PROTOCOL_VERSION }));
  const send = (m: object): void => game.message(conn, JSON.stringify(m));
  const welcome = msgs.find((m) => m.t === "welcome") as Extract<ServerMsg, { t: "welcome" }> | undefined;
  const reject = (msgs.find((m) => m.t === "reject") as { reason: string } | undefined)?.reason;
  return { conn, msgs, send, welcome, reject };
}

try {
  // ---- lần chạy 1 ----
  const g1 = new Game(cfg());
  const lan = join5(g1, "Lan", "abc123");
  const short = join5(g1, "Moi", "ab");
  const sp = g1.spawn, X = Math.floor(sp.x), Z = Math.floor(sp.z);
  g1.message(lan.conn, flyPacket(X + 0.5, 100, Z + 0.5));
  Object.assign(g1.online().find((p) => p.name === "Lan")!.state, { health: 13, hunger: 9, saturation: 1 }); // (5c) server tính máu / đói
  for (let i = 0; i < 160; i++) g1.tick();
  lan.send({ t: "inv", seq: 1, a: { t: "select", n: 0 } });
  lan.send({ t: "inv", seq: 2, a: { t: "throwHeld", all: true } }); // bộ đồ thử đã đầy túi: bỏ bớt một ô
  lan.send({ t: "give", item: "diamond_block", count: 7 });
  // nhà nhỏ: một cột đá cuội trên trời, một rương có đồ, một vật phẩm rơi
  for (let y = 95; y < 98; y++) g1.ticker.acc.setCell(X + 2, y, Z + 2, B.COBBLE, 0);
  g1.ticker.acc.setCell(X + 3, 95, Z + 2, B.CHEST, 0);
  g1.entities.placed(X + 3, 95, Z + 2, B.CHEST);
  const chest = g1.entities.obtain(X + 3, 95, Z + 2, B.CHEST)!;
  chest.slots[4] = { item: "emerald", count: 5, damage: 0 };
  g1.items.list.push(createItemEntity({ item: "apple", count: 3, damage: 0 }, X + 0.5, 64, Z + 0.5));
  g1.saveAll();
  g1.disconnect(lan.conn);
  const files = readdirSync(join(dir, "w")), regions = readdirSync(join(dir, "w", "region"));
  check("lần đầu dùng tên thì tạo tài khoản; mật khẩu ngắn bị từ chối", !!lan.welcome && short.reject === "pwshort");
  check("đã ghi world.json, entities.json, accounts.json, file vùng, file người chơi; không còn file .tmp",
    ["world.json", "entities.json", "accounts.json"].every((f) => files.includes(f)) && regions.length > 0
    && existsSync(join(dir, "w", "players", "lan.json")) && !files.some((f) => f.endsWith(".tmp")) && !regions.some((f) => f.endsWith(".tmp")),
    `${files.join(",")} | ${regions.join(",")}`);

  // ---- khởi động lại (seed trong cấu hình đổi: vẫn dùng seed đã lưu) ----
  const g2 = new Game(cfg({ seed: "khac" }));
  const wrong = join5(g2, "Lan", "sai_mat_khau");
  const back = join5(g2, "Lan", "abc123");
  const edits = g2.w.editsOf((X + 2) >> 4, (Z + 2) >> 4);
  const cell = (x: number, y: number, z: number): number => {
    for (let i = 0; i < edits.length; i += 2) if (edits[i] === blockIndex(x & 15, y, z & 15)) return edits[i + 1]!;
    return -1;
  };
  check("khởi động lại: dùng seed đã lưu, giữ điểm hồi sinh", g2.seed === g1.seed && g2.spawn.x === g1.spawn.x && g2.spawn.z === g1.spawn.z);
  check("khởi động lại: block đã sửa còn (cột đá cuội, rương)", [95, 96, 97].every((y) => cell(X + 2, y, Z + 2) === B.COBBLE) && (cell(X + 3, 95, Z + 2) & 255) === B.CHEST);
  check("khởi động lại: đồ trong rương, vật phẩm rơi còn",
    g2.entities.obtain(X + 3, 95, Z + 2, B.CHEST)!.slots[4]?.item === "emerald" && g2.items.list.some((e) => e.stack.item === "apple" && e.stack.count === 3));
  const inv = back.msgs.find((m) => m.t === "inv") as Extract<ServerMsg, { t: "inv" }> | undefined;
  g2.tick();
  const inv2 = (back.msgs.filter((m) => m.t === "inv").pop() ?? inv) as Extract<ServerMsg, { t: "inv" }> | undefined;
  check("sai mật khẩu bị từ chối; đúng mật khẩu: vị trí, máu, đói, túi đồ như lúc thoát",
    wrong.reject === "password" && !!back.welcome && Math.abs(back.welcome.spawn.y - 100) < 1e-9 && back.welcome.health === 13
    && back.welcome.hunger === 9 && !!inv2?.s.main.some((s) => s?.item === "diamond_block" && s.count === 7),
    `từ chối ${wrong.reject}, y ${back.welcome?.spawn.y}, máu ${back.welcome?.health}`);

  // ---- quản trị viên ----
  const g3 = new Game(cfg({ admins: ["Boss"], debug: false, adminAll: false }));
  const boss = join5(g3, "boss", "boss123"), mai = join5(g3, "Mai", "abc123");
  g3.message(mai.conn, flyPacket(0, 100, 0)); // người thường gửi "đang bay": bỏ qua
  const maiP = () => g3.online().find((p) => p.name === "Mai")!;
  check("quản trị viên theo cấu hình (không phân biệt hoa thường); người thường gửi 'đang bay' bị bỏ qua",
    boss.welcome?.admin === true && mai.welcome?.admin === false && !maiP().flying);

  // ---- (9a) /admin: ai cũng bật / tắt được, lưu theo người chơi ----
  const errKey = (): string | undefined => (mai.msgs.filter((m) => m.t === "chat" && m.kind === "error").pop() as { key?: string } | undefined)?.key;
  const before = mai.msgs.length;
  mai.send({ t: "chat", text: "/give Mai stone 1" });
  const giveDenied = errKey() === "notAdmin";
  mai.send({ t: "chat", text: "/locate village" });
  const locateOk = mai.msgs.slice(before).filter((m) => m.t === "chat" && m.kind === "error").length === 1; // chỉ lỗi của /give
  mai.send({ t: "chat", text: "/admin" });
  const onMsg = mai.msgs.some((m) => m.t === "admin" && m.on) && boss.msgs.some((m) => m.t === "chat" && m.kind === "info" && m.key === "adminOn");
  g3.message(mai.conn, flyPacket(0, 100, 0));
  const flewAdmin = maiP().flying;
  mai.send({ t: "chat", text: "/admin off" }); // thoát chế độ quản trị
  const offOk = !maiP().admin && !maiP().flying && mai.msgs.some((m) => m.t === "admin" && !m.on);
  check("/admin: người thường bị chặn /give, dùng được /locate; /admin bật (báo cả server, bay được), /admin lần nữa tắt và thôi bay",
    giveDenied && locateOk && onMsg && flewAdmin && offOk);
  mai.send({ t: "chat", text: "/admin" });
  g3.disconnect(mai.conn);
  const mai2 = join5(g3, "Mai", "abc123");
  check("/admin: thoát vào lại vẫn giữ chế độ quản trị", mai2.welcome?.admin === true);

  // ---- chunk lưu bằng bộ sinh thế giới cũ: tính lại ô đã sửa từ nguyên nội dung ----
  const w = new ServerWorld(g1.seed);
  const gen = new ServerWorld(g1.seed);
  gen.updateLoaded([{ cx: 0, cz: 0 }]);
  const ch = gen.world.getChunk(0, 0)!;
  const data = ch.data.slice(), meta = ch.meta.slice();
  data[blockIndex(5, 120, 5)] = B.GOLD_BLOCK;
  w.loadSaved([{ cx: 0, cz: 0, worldgen: WORLDGEN_VERSION - 1, edits: [], data, meta }]);
  const e0 = w.editsOf(0, 0);
  check("file lưu từ bộ sinh cũ: ô đã sửa tính lại từ nguyên nội dung chunk, đánh dấu để lưu lại",
    e0.length === 2 && e0[0] === blockIndex(5, 120, 5) && e0[1] === B.GOLD_BLOCK && w.takeSaves().some((c) => chunkKey(c.cx, c.cz) === chunkKey(0, 0)));

  // ---- (9a) seed "random" + điểm khởi đầu ngẫu nhiên: mỗi thế giới mới khác nhau, khởi động lại thì giữ; debug tắt: vào tay trắng ----
  const rnd = (world: string): Game => new Game(cfg({ seed: "random", spawn: "random", world, debug: false, adminAll: false }));
  const r1 = rnd("r1"), r2 = rnd("r2"), r1b = rnd("r1");
  const empty = join5(r1, "Tam", "abc123");
  check("seed random: hai thế giới mới khác seed / điểm khởi đầu; mở lại giữ nguyên; debug tắt thì người mới không có đồ",
    r1.seedText !== r2.seedText && (r1.spawn.x !== r2.spawn.x || r1.spawn.z !== r2.spawn.z) && r1b.seedText === r1.seedText &&
    r1b.spawn.x === r1.spawn.x && r1b.spawn.z === r1.spawn.z && !!empty.welcome &&
    r1.online().find((p) => p.name === "Tam")!.inv.main.every((sl) => !sl), `${r1.seedText} / ${r2.seedText}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
