// Trò chơi trên server (Giai đoạn 5a–6a): người chơi vào bằng tên + mật khẩu, vòng lặp 20 tick / giây, nhận
// gói tin của client (kiểm tra rồi áp dụng), phát thay đổi block / người chơi / vật phẩm / túi đồ (sync.ts).
// Thế giới, rương / lò, vật phẩm rơi, người chơi lưu xuống server/data (storage.ts): tự lưu mỗi 60 giây và khi
// tắt server. 6a: đánh nhau (combat.ts), chat + lệnh quản trị (chat.ts), vùng an toàn quanh điểm hồi sinh.
// 7a: ngày đêm + giường (clock.ts), sinh vật (mobs/), gói tin xử lý trong handlers.ts.
// 10a: hai cõi chạy song song (realm.ts): thế giới chính và Vực Lửa (lưu ở <thế giới>/nether), đi qua cổng (portals.ts).
// Các thuộc tính w, items, life... là của thế giới chính (giữ như trước cho bộ kiểm tra); người chơi dùng realmOf(p).
import { join } from "node:path";
import {
  B, BastionLocator, COMBAT, locateOverworld, type LocateKind, DIM, FortressLocator, HUNGER, NetherBiomes, NET, PLAYER, SAVE, STARTER_KIT, TerrainSampler, WORLDGEN_VERSION, BIN, applyInvAction, binType, decodeInput, dismount,
  fixedSpawn, mulberry32, netherSeed, randomSpawn, restoreInv, seedFromString, stack, type ClientMsg,
} from "../../shared/src/index.js";
import { loadStructures } from "./structFile.js";
import { Chat } from "./chat.js";
import { CustomStructs } from "./customStructs.js";
import { Clock } from "./clock.js";
import { handleMessage } from "./handlers.js";
import { WorldStorage } from "./storage.js";
import type { ServerConfig } from "./config.js";
import { ServerPlayer, type Conn } from "./player.js";
import { anchorSpawn } from "./anchors.js";
import { Realm, type RealmHost } from "./realm.js";
import { Portals, lightPortal } from "./portals.js";
const NAME_RE = new RegExp(`^[A-Za-z0-9_]{1,${NET.NAME_MAX}}$`);

export class Game {
  readonly seed: number;
  readonly realms: Realm[];
  readonly portals: Portals;
  readonly chat: Chat;
  readonly clock: Clock;
  readonly customs: CustomStructs; // (8a) nhà tự lưu
  private fortresses: FortressLocator | null = null; // (10c) /locate fortress
  private sampler: TerrainSampler | null = null; // /locate công trình thế giới chính
  private bastions: BastionLocator | null = null; private netherBiomes: NetherBiomes | null = null; // (10d2) /locate bastion
  /** Thời gian chạy tick gần nhất (ms) — F3. */
  tickMs = 0;
  readonly spawn: { x: number; y: number; z: number };
  private readonly players = new Map<Conn, ServerPlayer>();
  readonly storage: WorldStorage;
  readonly seedText: string; // chuỗi seed (đã lưu, hoặc từ cấu hình / ngẫu nhiên)
  private nextId = 1;
  private tickNo = 0;

  // ---- thế giới chính (giữ tên cũ) ----
  get w() { return this.realms[0]!.w; }
  get entities() { return this.realms[0]!.entities; }
  get items() { return this.realms[0]!.items; }
  get ticker() { return this.realms[0]!.ticker; }
  get containers() { return this.realms[0]!.containers; }
  get actions() { return this.realms[0]!.actions; }
  get movement() { return this.realms[0]!.movement; }
  get combat() { return this.realms[0]!.combat; }
  get archery() { return this.realms[0]!.archery; }
  get explosions() { return this.realms[0]!.explosions; }
  get life() { return this.realms[0]!.life; }

  /** Cõi người chơi đang ở. */
  realmOf(p: ServerPlayer): Realm {
    return this.realms[p.dim] ?? this.realms[0]!;
  }

  constructor(readonly cfg: ServerConfig) {
    loadStructures(); // (7e) mẫu công trình từ client.jar (cùng file với client)
    const dir = cfg.dataDir ? join(cfg.dataDir, cfg.world) : null;
    this.storage = new WorldStorage(dir);
    const meta = this.storage.loadWorld();
    // (9a) seed "random" (hoặc rỗng): thế giới mới lấy seed ngẫu nhiên; thế giới đã lưu luôn dùng seed đã lưu
    const randomSeed = !cfg.seed || cfg.seed.toLowerCase() === "random";
    if (meta && !randomSeed && meta.seed !== cfg.seed) console.log(`[server] thế giới "${cfg.world}" đã lưu với seed "${meta.seed}" (bỏ qua seed "${cfg.seed}" trong cấu hình)`);
    this.seedText = meta?.seed ?? (randomSeed ? Math.random().toString(36).slice(2, 12) : cfg.seed);
    this.seed = seedFromString(this.seedText);
    if (meta) this.spawn = meta.spawn;
    else {
      const sampler = new TerrainSampler(this.seed);
      // (9a) "random": mỗi thế giới mới một điểm khởi đầu ngẫu nhiên (không theo seed); "fixed": gần gốc. Lưu ngay vào world.json.
      const s = cfg.spawn === "fixed" ? fixedSpawn(sampler) : randomSpawn(sampler, cfg.dataDir ? Math.random : mulberry32(this.seed));
      this.spawn = { x: s.x + 0.5, y: s.h + 1, z: s.z + 0.5 };
    }
    const host: RealmHost = {
      cfg, online: () => this.online(), time: () => this.clock.time, respawnPos: (p) => this.respawnOf(p), died: (p) => this.died(p),
      bed: (p, x, y, z, cell) => {
        if (p.dim === DIM.NETHER) { // (10a) giường ở Vực Lửa nổ (sức nổ 5)
          this.realmOf(p).w.setCell(x, y, z, 0, 0);
          return this.realmOf(p).explosions.explode(x + 0.5, y + 0.5, z + 0.5, 5, { by: "bed", grief: true });
        }
        this.clock.useBed(p, x, y, z, cell);
      },
    };
    const safe = { x: this.spawn.x, z: this.spawn.z, r: COMBAT.SAFE_ZONE_RADIUS };
    this.realms = [
      new Realm(host, DIM.OVERWORLD, this.seed, this.storage, mulberry32(this.seed ^ 0x5eed), safe),
      new Realm(host, DIM.NETHER, this.seed, new WorldStorage(dir ? join(dir, "nether") : null), mulberry32(this.seed ^ 0x6e7468), { x: 0, z: 0, r: 0 }),
    ];
    this.portals = new Portals({ realms: this.realms, online: () => this.online() });
    for (const r of this.realms) r.actions.onIgnite = (x, y, z) => lightPortal(r.w, x, y, z); // khung đá vỏ chai → cổng
    this.customs = new CustomStructs(this.storage, this.w, () => this.w.pool);
    this.clock = new Clock({
      w: this.w, online: () => this.realms[0]!.players(this), worldSpawn: this.spawn, info: (key, args) => this.chat.info(key, args),
      monstersNear: (x, y, z, h, v) => this.life.mobs.monstersNear(x, y, z, h, v),
    }, meta?.time);
    if (cfg.sleepPercent !== undefined) this.clock.sleepPercent = cfg.sleepPercent;
    const terrain = new TerrainSampler(this.seed);
    this.chat = new Chat({
      online: () => this.online(),
      setPvp: (on) => { for (const r of this.realms) r.combat.pvp = on; },
      teleport: (p, x, y, z) => {
        if (y < 0) y = p.dim === DIM.OVERWORLD ? (() => { // /tp x z: đứng trên mặt đất / mặt nước
          const col = terrain.column(Math.floor(x), Math.floor(z));
          return Math.max(col.height, col.waterTop) + 1.5;
        })() : standY(this.realmOf(p), x, z);
        this.portals.transfer(p, p.dim, { x, y, z });
        p.send({ t: "tp", x, y, z });
      },
      kick: (p) => p.conn.close(), time: () => this.clock.time,
      setTime: (t) => this.clock.set(t),
      summon: (p, key, n) => this.realmOf(p).life.summon(p, key, n),
      give: (p, item, n) => {
        for (let left = n, rest; left > 0; left -= 64) if ((rest = p.inv.add(stack(item, Math.min(64, left))))) this.realmOf(p).items.throwFrom(rest, p);
        p.invDirty = true;
      },
      structure: (p, name, a, b) => this.customs.save(p, name, a, b, this.online()), // (8a)
      dim: (p) => this.portals.travel(p), // (10a) quản trị viên: /nether — sang cõi kia như qua cổng
      locate: (p, kind) => { // (10c) /locate fortress, (10d2) /locate bastion
        const k = p.dim === DIM.NETHER ? 1 : 1 / 8, ns = netherSeed(this.seed);
        if (kind !== "fortress" && kind !== "bastion") // công trình thế giới chính: dò quanh vị trí tương ứng ở thế giới chính
          return locateOverworld((this.sampler ??= new TerrainSampler(this.seed)), kind as LocateKind, p.x * 8 * k, p.z * 8 * k);
        if (kind === "bastion") return (this.bastions ??= new BastionLocator(ns, (x, z) => (this.netherBiomes ??= new NetherBiomes(ns)).at(x, z))).nearest(p.x * k, p.z * k);
        return (this.fortresses ??= new FortressLocator(ns)).nearest(p.x * k, p.z * k);
      },
    });
    // nạp thế giới đã lưu (chunk lưu bằng bộ sinh cũ đã chuyển: lưu ngay, lần sau khởi động nhanh)
    for (const r of this.realms) if (r.load()) r.storage.saveChunks(r.w.takeSaves());
    if (!meta) this.storage.saveWorld(this.worldMeta());
  }

  /** Điểm hồi sinh: (10d2) cạnh mỏ neo hồi sinh còn nạp ở Vực Lửa; không thì về thế giới chính (giường / điểm của thế giới). */
  private respawnOf(p: ServerPlayer): { x: number; y: number; z: number } {
    const a = anchorSpawn(p, this.realms[1]!.w, true);
    if (a && p.dim !== DIM.NETHER) this.portals.transfer(p, DIM.NETHER, a);
    if (a) return a;
    const r = this.clock.respawnPos(p);
    if (p.dim !== DIM.OVERWORLD) this.portals.transfer(p, DIM.OVERWORLD, r);
    return r;
  }

  /** Người chơi vừa chết: rải đồ, thông báo chết. */
  private died(p: ServerPlayer): void {
    const r = this.realmOf(p);
    r.archery.cancel(p);
    this.clock.wake(p);
    p.awakeS = 0;
    r.actions.died(p);
    this.chat.death(p);
  }

  private worldMeta() {
    return { format: SAVE.FORMAT_VERSION, seed: this.seedText, worldgen: WORLDGEN_VERSION, spawn: this.spawn, time: this.clock.time };
  }

  /** (9a) Bật sẵn chế độ quản trị lần đầu vào: tên trong cấu hình (bài thử: adminAll = mọi người). Sau đó theo /admin. */
  private isAdmin(name: string): boolean {
    return !!this.cfg.adminAll || this.cfg.admins.some((a) => a.toLowerCase() === name.toLowerCase());
  }

  /** Dữ liệu lưu của người chơi; đang chết thì lưu như đã hồi sinh (đồ đã rơi tại chỗ chết) ở thế giới chính. */
  private playerSave(p: ServerPlayer) {
    const s = p.toSave();
    if (!p.dead) return s;
    return { ...s, ...this.clock.respawnPos(p), dim: DIM.OVERWORLD, health: PLAYER.MAX_HEALTH, hunger: HUNGER.MAX, saturation: HUNGER.START_SATURATION };
  }

  /** Lưu mọi thứ (tự lưu định kỳ: chunk ghi không chặn luồng chính; khi tắt server: đồng bộ). */
  saveAll(background = false): void {
    let n = 0;
    for (const r of this.realms) n += r.save(background);
    for (const p of this.online()) this.storage.savePlayer(this.playerSave(p));
    this.storage.saveWorld(this.worldMeta());
    this.customs.flush();
    if (n) console.log(`[server] đã lưu ${n} chunk, ${this.online().length} người chơi`);
  }

  online(): ServerPlayer[] {
    return [...this.players.values()];
  }

  disconnect(conn: Conn): void {
    const p = this.players.get(conn);
    if (!p) return;
    const r = this.realmOf(p);
    this.players.delete(conn);
    r.containers.close(p);
    this.clock.wake(p);
    if (p.state.rideId) dismount(p.state, (x, y, z) => r.w.getCell(x, y, z), p.lookYaw); // (7d) xuống thú trước khi lưu
    for (const s of applyInvAction(p.inv, { t: "close" })) p.inv.add(s);
    this.storage.savePlayer(this.playerSave(p));
    for (const o of this.online()) {
      o.send({ t: "leave", id: p.id });
      o.knownLooks.delete(p.id);
    }
    this.chat.info("leave", [p.name]);
    console.log(`[server] ${p.name} thoát (còn ${this.players.size})`);
  }

  message(conn: Conn, raw: string | ArrayBuffer): void {
    if (typeof raw !== "string") {
      // gói nhị phân: phím bấm (5c); sai định dạng thì bỏ
      const p = this.players.get(conn);
      if (!p || binType(raw) !== BIN.INPUT) return;
      const pkt = decodeInput(raw);
      if (pkt) this.realmOf(p).movement.input(p, pkt);
      return;
    }
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }
    const p = this.players.get(conn);
    try {
      if (!p) {
        if (msg.t === "hello") this.hello(conn, msg.name, msg.password, msg.version);
        return;
      }
      handleMessage(this, p, msg);
    } catch (err) {
      console.error(`[server] gói tin lỗi từ ${p?.name ?? "?"}:`, err);
    }
  }

  private hello(conn: Conn, name: unknown, password: unknown, version: unknown): void {
    const reject = (reason: string): void => {
      conn.send(JSON.stringify({ t: "reject", reason }));
      conn.close();
    };
    if (version !== NET.PROTOCOL_VERSION) return reject("version");
    if (typeof name !== "string" || !NAME_RE.test(name)) return reject("name");
    if (typeof password !== "string" || password.length < SAVE.PASSWORD_MIN || password.length > SAVE.PASSWORD_MAX) return reject("pwshort");
    if (this.online().some((o) => o.name.toLowerCase() === name.toLowerCase())) return reject("taken");
    const owner = !!this.cfg.ownerToken && password === this.cfg.ownerToken; // app desktop: chủ máy vào thế giới của mình
    if (!owner && this.storage.login(name, password) === "wrong") return reject("password");
    const p = new ServerPlayer(this.nextId++, name, conn, this.isAdmin(name));
    const back = this.storage.loadPlayer(name);
    if (back) {
      restoreInv(p.inv, back.inv);
      Object.assign(p, { x: back.x, y: back.y, z: back.z, health: back.health, hunger: back.hunger, saturation: back.saturation, spawnPoint: back.spawn, awakeS: back.awake ?? 0, xpSeed: back.xpSeed ?? p.xpSeed });
      p.state.xp = back.xp ?? 0;
      p.dim = back.dim === DIM.NETHER ? DIM.NETHER : DIM.OVERWORLD;
      if (typeof back.admin === "boolean" && !this.cfg.adminAll) p.admin = back.admin; // (9a)
    } else {
      Object.assign(p, this.spawn);
      if (this.cfg.debug) for (const [k, n] of STARTER_KIT) p.inv.add(stack(k, n));
    }
    this.players.set(conn, p);
    p.send({
      t: "welcome", id: p.id, name: p.name, seed: this.seed, debug: this.cfg.debug, admin: p.admin, dim: p.dim,
      spawn: { x: p.x, y: p.y, z: p.z }, respawn: this.clock.respawnPos(p),
      health: p.health, hunger: p.hunger, saturation: p.saturation, safe: this.realms[0]!.safe, time: this.clock.time, customs: this.customs.forClient(),
    });
    this.chat.info("join", [p.name]);
    for (const o of this.online()) {
      if (o === p || o.dim !== p.dim) continue; // (10a) chỉ thấy người cùng cõi
      o.send({ t: "join", id: p.id, name: p.name });
      p.send({ t: "join", id: o.id, name: o.name });
    }
    console.log(`[server] ${name} vào game (${this.players.size} người)`);
  }

  /** Một tick (gọi 20 lần / giây). */
  tick(): void {
    const t0 = performance.now();
    this.tickNo++;
    for (const r of this.realms) r.tick(this, this.tickNo, () => { if (r.dim === DIM.OVERWORLD) this.clock.tick(); });
    this.portals.tick(1 / NET.SERVER_TICK_RATE);
    this.tickMs = performance.now() - t0;
  }

  start(): void {
    setInterval(() => this.tick(), 1000 / NET.SERVER_TICK_RATE);
    setInterval(() => this.saveAll(true), SAVE.AUTOSAVE_S * 1000);
  }
}

/** (10a) /tp x z ở Vực Lửa: chỗ đứng (2 ô trống trên khối đặc) thấp nhất trên biển dung nham. */
function standY(r: Realm, x: number, z: number): number {
  const fx = Math.floor(x), fz = Math.floor(z), id = (y: number): number => r.w.cellLoading(fx, y, fz) & 255;
  for (let y = 33; y < 120; y++) if (id(y) === 0 && id(y + 1) === 0 && id(y - 1) !== 0 && id(y - 1) !== B.LAVA) return y + 0.01;
  return 100;
}
