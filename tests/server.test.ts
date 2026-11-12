// Server 5a (chạy trong node với kết nối giả): vào game bằng tên, chunk / block đồng bộ cho người
// theo dõi, đào và đặt do server kiểm tra, túi đồ theo lệnh, rương dùng chung, nhặt vật phẩm.
import { B, NET, chunkKey, type ServerMsg } from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { check } from "./harness.js";

interface Fake {
  msgs: ServerMsg[];
  closed: boolean;
  conn: { send(d: string): void; close(): void };
}
function fake(): Fake {
  const f: Fake = { msgs: [], closed: false, conn: { send: (d) => void f.msgs.push(JSON.parse(d) as ServerMsg), close: () => void (f.closed = true) } };
  return f;
}
const of = <T extends ServerMsg["t"]>(f: Fake, t: T): Extract<ServerMsg, { t: T }>[] =>
  f.msgs.filter((m) => m.t === t) as Extract<ServerMsg, { t: T }>[];

const game = new Game({ seed: "voxel", port: 0, spawn: "fixed", debug: true });
const send = (f: Fake, m: object): void => game.message(f.conn, JSON.stringify(m));
const a = fake(), b = fake(), c = fake();
send(a, { t: "hello", name: "An", version: NET.PROTOCOL_VERSION });
send(b, { t: "hello", name: "Binh", version: NET.PROTOCOL_VERSION });
send(c, { t: "hello", name: "an", version: NET.PROTOCOL_VERSION });
const w = of(a, "welcome")[0];
check("vào game bằng tên; trùng tên (không phân biệt hoa thường) bị từ chối",
  !!w && w.seed === game.seed && !!of(b, "welcome")[0] && of(c, "reject")[0]?.reason === "taken" && c.closed);
check("người vào sau thấy người trước và ngược lại", of(a, "join").some((m) => m.name === "Binh") && of(b, "join").some((m) => m.name === "An"));

// đứng ở điểm hồi sinh, cho server tải chunk xung quanh
const sp = game.spawn;
for (const f of [a, b]) send(f, { t: "move", x: sp.x, y: sp.y, z: sp.z, yaw: 0, pitch: -1.2, flying: false, sneaking: false, swing: 0, health: 20, dead: false });
for (let i = 0; i < 120; i++) game.tick();
const cx = Math.floor(sp.x / 16), cz = Math.floor(sp.z / 16);
send(b, { t: "sub", add: [cx, cz], remove: [] });
check("server tải chunk quanh người chơi và có ánh sáng", !!game.w.world.getChunk(cx, cz)?.light);

// đào ô ngay dưới chân (trong tầm với)
const gx = Math.floor(sp.x), gy = Math.floor(sp.y) - 1, gz = Math.floor(sp.z);
const before = game.w.getCell(gx, gy, gz);
send(a, { t: "dig", x: gx, y: gy, z: gz });
b.msgs.length = 0;
game.tick();
const blk = of(b, "blocks").flatMap((m) => m.list);
check("đào: server đổi block và gửi cho người theo dõi chunk đó", before > 0 && game.w.getCell(gx, gy, gz) === B.AIR && blk.includes(gx) && blk.length >= 4,
  `ô ${gx},${gy},${gz} trước ${before & 255}`);
a.msgs.length = 0;
send(a, { t: "dig", x: gx + 40, y: gy, z: gz });
game.tick();
check("đào ngoài tầm với: bị từ chối, server gửi lại ô thật", of(a, "blocks").some((m) => m.list[0] === gx + 40));
check("block đã sửa được ghi để gửi cho chunk mới theo dõi", game.w.editsOf(cx, cz).length >= 2);
for (let i = 0; i < 40; i++) game.tick(); // đồ rơi văng ra rồi được nhặt lại

// túi đồ: lệnh chọn ô + đặt block cạnh đó
const pa = game.online().find((p) => p.name === "An")!;
const hasDirtDrop = pa.inv.count("dirt") + pa.inv.count("cobble") + pa.inv.count("sand") > 0;
send(a, { t: "inv", seq: 7, a: { t: "select", n: 6 } }); // cobble trong bộ đồ thử
a.msgs.length = 0;
game.tick();
const inv = of(a, "inv").at(-1);
check("lệnh túi đồ: server áp dụng, trả trạng thái kèm số thứ tự đã xác nhận", pa.inv.selected === 6 && inv?.s.ack === 7);
const held = pa.inv.held?.count ?? 0;
send(a, { t: "use", hit: { x: gx, y: gy - 1, z: gz, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 });
check("đặt block vào hố vừa đào: server kiểm tra rồi đặt, trừ 1 trong túi", game.w.getCell(gx, gy, gz) === B.COBBLE && pa.inv.held?.count === held - 1);
check("đồ đào ra rơi xuống và được nhặt lại (người đứng gần, còn chỗ)", hasDirtDrop || game.items.list.length === 0, `túi có đồ vừa đào: ${hasDirtDrop}`);

// rương: hai người cùng mở thấy cùng đồ
const chx = gx + 2, chy = Math.floor(sp.y), chz = gz;
game.w.setCell(chx, chy, chz, B.CHEST, 0);
game.entities.placed(chx, chy, chz, B.CHEST);
b.msgs.length = 0;
for (const f of [a, b]) send(f, { t: "use", hit: { x: chx, y: chy, z: chz, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 });
send(a, { t: "inv", seq: 8, a: { t: "click", area: "main", i: 6, button: "left", shift: true } }); // Shift: chuyển cả chồng vào rương
game.tick();
const bInv = of(b, "inv").at(-1)?.s;
check("hai người mở cùng rương: A chuyển đồ vào thì B thấy ngay", of(b, "open").length > 0 && !!bInv?.ext.some((s) => s?.item === "cobble"));
send(b, { t: "inv", seq: 1, a: { t: "close" } });
send(a, { t: "inv", seq: 9, a: { t: "close" } });
const ent = game.entities.get(chx, chy, chz) as { slots: ({ item: string } | null)[] } | undefined;
check("đóng rương: đồ nằm lại trong rương", !!ent?.slots.some((s) => s?.item === "cobble"));

// nhảy cột: server kiểm tra chỗ đặt theo vị trí người chơi mà client gửi ngay trước lệnh đặt
{
  const py = Math.floor(sp.y) + 3, px = gx + 6, pz = gz;
  const pp = game.online().find((p) => p.name === "Binh")!;
  game.w.setCell(px, py - 1, pz, B.STONE, 0);
  for (let y = py; y <= py + 4; y++) game.w.setCell(px, y, pz, B.AIR, 0); // cột trống (chỗ thử có thể nằm trong đồi)
  pp.inv.main[6] = { item: "cobble", count: 5, damage: 0 };
  send(b, { t: "inv", seq: 2, a: { t: "select", n: 6 } });
  const mv = (y: number): void => send(b, { t: "move", x: px + 0.5, y, z: pz + 0.5, yaw: 0, pitch: -1.5, flying: false, sneaking: false, swing: 0, health: 20, dead: false });
  const place = (): void => send(b, { t: "use", hit: { x: px, y: py - 1, z: pz, nx: 0, ny: 1, nz: 0 }, src: null, sneaking: false, yaw: 0 });
  mv(py);
  place(); // server còn thấy đứng trong ô → từ chối (đúng: không đặt block vào người)
  const rejected = (game.w.getCell(px, py, pz) & 255) !== B.COBBLE;
  mv(py + 1.2); // client gửi vị trí mới ngay trước lệnh (đã nhảy lên)
  place();
  check("nhảy cột: đứng trong ô thì không đặt được; gửi vị trí đã nhảy lên trước lệnh đặt thì đặt được",
    rejected && (game.w.getCell(px, py, pz) & 255) === B.COBBLE,
    `đầu: ${rejected ? "từ chối" : "đặt luôn"}, sau: ô ${game.w.getCell(px, py, pz) & 255}, nền ${game.w.getCell(px, py - 1, pz) & 255}, cầm ${pp.inv.held?.item}`);
}

// ngắt kết nối rồi vào lại: túi đồ còn
const count = pa.inv.count("planks");
game.disconnect(a.conn);
check("người kia nhận tin rời game", of(b, "leave").length > 0);
const a2 = fake();
send(a2, { t: "hello", name: "An", version: NET.PROTOCOL_VERSION });
const back = game.online().find((p) => p.name === "An")!;
check("thoát rồi vào lại (server còn chạy): túi đồ còn nguyên", back.inv.count("planks") === count && count > 0);
void chunkKey;
