// Trò chơi trên server (Giai đoạn 5a): người chơi vào bằng tên, vòng lặp 20 tick / giây, nhận gói
// tin của client (kiểm tra rồi áp dụng), phát thay đổi block / người chơi / vật phẩm / túi đồ.
// Chưa lưu xuống đĩa (5b): người chơi thoát rồi vào lại trong lúc server còn chạy thì giữ túi đồ, vị trí.
import {
  BlockEntities, NET, STARTER_KIT, TerrainSampler, applyInvAction, chunkKey, fixedSpawn, itemDef, mulberry32, randomSpawn,
  restoreInv, seedFromString, snapshotInv, stack, type ClientMsg, type InvSnapshot,
} from "../../shared/src/index.js";
import type { ServerConfig } from "./config.js";
import { Actions } from "./actions.js";
import { Containers } from "./containers.js";
import { ServerPlayer, type Conn } from "./player.js";
import { ServerItems } from "./serverItems.js";
import { ServerTicker } from "./ticker.js";
import { ServerWorld } from "./serverWorld.js";

const NAME_RE = new RegExp(`^[A-Za-z0-9_]{1,${NET.NAME_MAX}}$`);
const num = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v);

export class Game {
  readonly seed: number;
  readonly w: ServerWorld;
  readonly entities: BlockEntities;
  readonly items: ServerItems;
  readonly ticker: ServerTicker;
  readonly containers: Containers;
  readonly actions: Actions;
  readonly spawn: { x: number; y: number; z: number };
  private readonly players = new Map<Conn, ServerPlayer>();
  /** Người đã thoát (theo tên): túi đồ + vị trí, trả lại khi vào lại. */
  private readonly away = new Map<string, { inv: InvSnapshot; x: number; y: number; z: number }>();
  private nextId = 1;
  private tickNo = 0;

  constructor(readonly cfg: ServerConfig) {
    this.seed = seedFromString(cfg.seed);
    const rng = mulberry32(this.seed ^ 0x5eed);
    this.w = new ServerWorld(this.seed);
    this.entities = new BlockEntities(this.seed);
    this.items = new ServerItems(this.w, rng);
    this.ticker = new ServerTicker(this.w, this.entities, this.items, rng, (x, y, z, cell) => {
      for (const p of this.online()) if (p.subs.has(chunkKey(x >> 4, z >> 4))) p.send({ t: "fall", x, y, z, cell });
    });
    this.containers = new Containers(this.w, this.entities);
    this.actions = new Actions(this.w, this.ticker, this.entities, this.containers, this.items);
    const sampler = new TerrainSampler(this.seed);
    const s = cfg.spawn === "fixed" ? fixedSpawn(sampler) : randomSpawn(sampler, mulberry32(this.seed));
    this.spawn = { x: s.x + 0.5, y: s.h + 1, z: s.z + 0.5 };
  }

  online(): ServerPlayer[] {
    return [...this.players.values()];
  }

  disconnect(conn: Conn): void {
    const p = this.players.get(conn);
    if (!p) return;
    this.players.delete(conn);
    this.containers.close(p);
    for (const s of applyInvAction(p.inv, { t: "close" })) p.inv.add(s);
    this.away.set(p.name, { inv: snapshotInv(p.inv, 0), x: p.x, y: p.y, z: p.z });
    for (const o of this.online()) o.send({ t: "leave", id: p.id });
    console.log(`[server] ${p.name} thoát (còn ${this.players.size})`);
  }

  message(conn: Conn, raw: string): void {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }
    const p = this.players.get(conn);
    try {
      if (!p) {
        if (msg.t === "hello") this.hello(conn, msg.name, msg.version);
        return;
      }
      this.handle(p, msg);
    } catch (err) {
      console.error(`[server] gói tin lỗi từ ${p?.name ?? "?"}:`, err);
    }
  }

  private hello(conn: Conn, name: unknown, version: unknown): void {
    const reject = (reason: string): void => {
      conn.send(JSON.stringify({ t: "reject", reason }));
      conn.close();
    };
    if (version !== NET.PROTOCOL_VERSION) return reject("version");
    if (typeof name !== "string" || !NAME_RE.test(name)) return reject("name");
    if (this.online().some((o) => o.name.toLowerCase() === name.toLowerCase())) return reject("taken");
    const p = new ServerPlayer(this.nextId++, name, conn);
    const back = this.away.get(name);
    if (back) {
      restoreInv(p.inv, back.inv);
      Object.assign(p, { x: back.x, y: back.y, z: back.z });
    } else {
      Object.assign(p, this.spawn);
      if (this.cfg.debug) for (const [k, n] of STARTER_KIT) p.inv.add(stack(k, n));
    }
    this.players.set(conn, p);
    p.send({ t: "welcome", id: p.id, name: p.name, seed: this.seed, spawn: back ? { x: p.x, y: p.y, z: p.z } : this.spawn, debug: this.cfg.debug });
    for (const o of this.online()) {
      if (o === p) continue;
      o.send({ t: "join", id: p.id, name: p.name });
      p.send({ t: "join", id: o.id, name: o.name });
    }
    console.log(`[server] ${name} vào game (${this.players.size} người)`);
  }

  private handle(p: ServerPlayer, m: ClientMsg): void {
    switch (m.t) {
      case "move":
        if (![m.x, m.y, m.z, m.yaw, m.pitch].every(num)) return;
        Object.assign(p, { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch, flying: !!m.flying, sneaking: !!m.sneaking });
        if (num(m.swing)) p.swing = m.swing;
        if (!m.dead) p.dead = false; // hồi sinh
        return;
      case "sub":
        return this.subscribe(p, m.add, m.remove);
      case "dig":
        if ([m.x, m.y, m.z].every(num)) this.actions.dig(p, m.x, m.y, m.z);
        return;
      case "use":
        return this.actions.use(p, m.hit, m.src, !!m.sneaking, num(m.yaw) ? m.yaw : p.yaw);
      case "eat":
        return this.actions.eat(p);
      case "inv": {
        if (!m.a || typeof m.a !== "object") return;
        p.ack = num(m.seq) ? m.seq : p.ack;
        for (const s of applyInvAction(p.inv, m.a)) this.items.throwFrom(s, p);
        if (m.a.t === "close") this.containers.close(p);
        p.invDirty = true;
        this.containers.changed(p);
        return;
      }
      case "trample":
        if ([m.x, m.y, m.z, m.fall].every(num) && p.distTo(m.x, m.y, m.z) < 4) this.ticker.trample(m.x, m.y, m.z, m.fall);
        return;
      case "armorWear":
        return this.actions.armorWear(p, m.n);
      case "died":
        return this.actions.died(p);
      case "give":
        if (this.cfg.debug && typeof m.item === "string" && itemDef(m.item) && num(m.count)) {
          p.inv.add(stack(m.item, Math.max(1, Math.min(64, Math.floor(m.count)))));
          p.invDirty = true;
        }
        return;
    }
  }

  private subscribe(p: ServerPlayer, add: unknown, remove: unknown): void {
    const pairs = (v: unknown): number[] => (Array.isArray(v) ? v.filter(num).slice(0, 4000) : []);
    const rem = pairs(remove);
    for (let i = 0; i + 1 < rem.length; i += 2) p.subs.delete(chunkKey(rem[i]!, rem[i + 1]!));
    const a = pairs(add);
    for (let i = 0; i + 1 < a.length; i += 2) {
      const cx = a[i]!, cz = a[i + 1]!;
      p.subs.add(chunkKey(cx, cz));
      const cells = this.w.editsOf(cx, cz);
      if (cells.length) p.send({ t: "chunk", cx, cz, cells });
    }
  }

  /** Một tick (gọi 20 lần / giây). */
  tick(): void {
    this.tickNo++;
    const all = this.online();
    const centers = all.map((p) => ({ cx: Math.floor(p.x / 16), cz: Math.floor(p.z / 16) }));
    this.w.updateLoaded(centers);
    this.w.updateLight();
    this.ticker.tick(centers);
    this.items.step(1 / NET.SERVER_TICK_RATE, all);
    this.containers.tick(this.tickNo);
    // phát thay đổi block cho người đang giữ chunk đó
    const ch = this.w.takeChanges();
    if (ch.length)
      for (const p of all) {
        const list: number[] = [];
        for (let i = 0; i < ch.length; i += 4)
          if (p.subs.has(chunkKey(ch[i]! >> 4, ch[i + 2]! >> 4))) list.push(ch[i]!, ch[i + 1]!, ch[i + 2]!, ch[i + 3]!);
        if (list.length) p.send({ t: "blocks", list });
      }
    for (const p of all) {
      const list = all.filter((o) => o !== p && Math.hypot(o.x - p.x, o.z - p.z) <= NET.PLAYER_VIEW).map((o) => o.view());
      if (list.length) p.send({ t: "players", list });
      this.items.sync(p);
      p.flushInv();
    }
  }

  start(): void {
    setInterval(() => this.tick(), 1000 / NET.SERVER_TICK_RATE);
  }
}
