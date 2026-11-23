// Chat và lệnh quản trị viên (Giai đoạn 6a): tin thường gửi cho mọi người (chống spam), lệnh bắt đầu bằng "/":
// /help, /tp <tên>, /kick <tên>, /pvp on|off, /give <tên> <vật phẩm> [số], /time [set day|noon|night|midnight|<tick> | add <tick>]
// (7a), /summon <loài> [số] (7a: gọi sinh vật ra trước mặt để thử), /xp <tên> [set] <số>[L] (cộng / đặt điểm hoặc cấp kinh nghiệm). Thông báo hệ
// thống gửi dạng mã (ChatKey) để client dịch ra chữ (văn bản tiếng Việt gom ở client/src/strings.ts).
// (9a) /admin: ai cũng bật / tắt chế độ quản trị cho mình; người thường vẫn dùng /help, /time (xem giờ), /locate.
import { CHAT, COMBAT, DAMAGE_SOURCES, DAY, LOCATE_ALIAS, LOCATE_KINDS, dayTick, itemDef, xpCommand, xpLevel, type ChatKey, type LocateKind, type ServerMsg } from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";

export interface ChatHost {
  online(): ServerPlayer[];
  setPvp(on: boolean): void;
  teleport(p: ServerPlayer, x: number, y: number, z: number): void;
  kick(p: ServerPlayer): void;
  /** Thêm đồ vào túi; túi đầy thì rơi ra cạnh người nhận. */
  give(p: ServerPlayer, item: string, count: number): void;
  /** (7a) giờ: số tick từ lúc tạo thế giới. */
  time(): number;
  setTime(t: number): void;
  /** Gọi n con loài key ra trước mặt p; false nếu không có loài đó. */
  summon(p: ServerPlayer, key: string, n: number): boolean;
  /** (8a) Lưu vùng thành nhà cho làng; trả về mã lỗi hoặc null. */
  structure(p: ServerPlayer, name: string, a: [number, number, number], b: [number, number, number]): string | null;
  /** (10a) Sang cõi kia như đi qua cổng (/nether). */
  dim(p: ServerPlayer): void;
  /** (10c) Pháo đài Vực Lửa gần nhất (tọa độ Vực Lửa) tính từ chỗ p đứng (ở thế giới chính: tọa độ ÷ 8). */
  /** (10c, 10d2) Vực Lửa: pháo đài / tàn tích (tọa độ Vực Lửa); còn lại: công trình thế giới chính (tọa độ thế giới chính). */
  locate(p: ServerPlayer, kind: string): { x: number; y: number; z: number } | null;
}

const TIME_NAMES: Record<string, number> = { day: DAY.SET_DAY, noon: DAY.SET_NOON, night: DAY.SET_NIGHT, midnight: DAY.SET_MIDNIGHT };

const DEATH_KEY: Record<string, ChatKey> = {
  other: "dieOther", fall: "dieFall", drown: "dieDrown", starve: "dieStarve", lava: "dieLava", fire: "dieFire", cactus: "dieCactus", player: "diePlayer",
  arrow: "dieArrow", mob: "dieMob", explosion: "dieExplosion", magic: "dieMagic", wither: "dieWither",
};

export class Chat {
  /** Đồng hồ (ms) — bài test thay được. */
  clock = (): number => performance.now();

  constructor(private readonly host: ChatHost) {}

  /** Gửi cho mọi người đang online. */
  broadcast(msg: ServerMsg): void {
    for (const o of this.host.online()) o.send(msg);
  }

  info(key: ChatKey, args: string[] = []): void {
    this.broadcast({ t: "chat", kind: "info", key, args });
  }

  private reply(p: ServerPlayer, kind: "info" | "error", key: ChatKey, args: string[] = []): void {
    p.send({ t: "chat", kind, key, args });
  }

  /** Thông báo chết: theo nguồn sát thương cuối; bị người khác đánh trong 5 giây trước đó thì nêu tên người đó. */
  death(p: ServerPlayer): void {
    const src = DAMAGE_SOURCES[p.state.hurtSrc] ?? "other";
    const by = p.lastAttacker && this.clock() - p.lastAttacker.at <= COMBAT.LAST_ATTACKER_S * 1000 ? p.lastAttacker.name : null;
    let key = DEATH_KEY[src] ?? "dieOther";
    if (by && src === "fall") key = "dieFallBy";
    else if (by && src === "explosion") key = "dieExplosionBy";
    else if (by && !["player", "arrow", "mob", "magic"].includes(src)) key = "dieOtherBy";
    p.lastAttacker = null;
    this.broadcast({ t: "chat", kind: "death", key, args: by ? [p.name, by] : [p.name] });
  }

  /** (9a) Bật / tắt chế độ quản trị của p; tắt thì thôi bay (server bỏ cờ bay từ gói phím của người thường). */
  setAdmin(p: ServerPlayer, on: boolean): void {
    p.admin = on;
    if (!on) p.flying = false;
    p.send({ t: "admin", on });
    this.info(on ? "adminOn" : "adminOff", [p.name]);
  }

  /** Tin chat / lệnh từ người chơi p. */
  message(p: ServerPlayer, raw: unknown): void {
    if (typeof raw !== "string") return;
    const text = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, CHAT.MAX_LEN);
    if (!text) return;
    const now = this.clock();
    while (p.chatTimes.length && now - p.chatTimes[0]! > CHAT.RATE_S * 1000) p.chatTimes.shift();
    if (p.chatTimes.length >= CHAT.RATE_N) return this.reply(p, "error", "slowDown");
    p.chatTimes.push(now);
    if (text.startsWith("/")) return this.command(p, text.slice(1).split(/\s+/));
    this.broadcast({ t: "chat", kind: "chat", from: p.name, text });
  }

  private find(name: string | undefined): ServerPlayer | undefined {
    const n = (name ?? "").toLowerCase();
    return this.host.online().find((o) => o.name.toLowerCase() === n);
  }

  private command(p: ServerPlayer, [cmd = "", ...args]: string[]): void {
    const c = cmd.toLowerCase();
    if (c === "help") return this.reply(p, "info", p.admin ? "helpAdmin" : "help");
    if (c === "admin" || c === "unadmin") { // /admin: bật / tắt qua lại · /admin on · /admin off (= /unadmin): thoát chế độ quản trị
      const a = (args[0] ?? "").toLowerCase();
      if (a && a !== "on" && a !== "off") return this.reply(p, "error", "usage", ["/admin · /admin on · /admin off (/unadmin)"]);
      const on = c === "unadmin" ? false : a === "on" ? true : a === "off" ? false : !p.admin;
      if (on === p.admin) return this.reply(p, "info", on ? "adminOn" : "adminOff", [p.name]); // không đổi: chỉ báo lại cho mình
      return this.setAdmin(p, on);
    }
    if (!["tp", "kick", "pvp", "give", "time", "summon", "structure", "xp", "nether", "locate"].includes(c)) return this.reply(p, "error", "unknownCmd", [c]);
    if (c === "time" && !args.length) return this.reply(p, "info", "timeIs", [String(dayTick(this.host.time()))]);
    if (!p.admin && c !== "locate") return this.reply(p, "error", "notAdmin");
    switch (c) {
      case "tp": {
        // tọa độ: /tp x y z hoặc /tp x z (đứng trên mặt đất); "~" = vị trí hiện tại, "~5" = cộng thêm
        const num = (v: string | undefined, base: number): number => (v?.startsWith("~") ? base + (Number(v.slice(1)) || 0) : Number(v));
        if (args.length >= 2 && args.slice(0, 3).every((a) => a.startsWith("~") || Number.isFinite(Number(a)))) {
          const three = args.length >= 3, x = num(args[0], p.x), y = three ? num(args[1], p.y) : -1, z = num(args[three ? 2 : 1], p.z);
          if (![x, y, z].every(Number.isFinite) || Math.abs(x) > 3e7 || Math.abs(z) > 3e7) return this.reply(p, "error", "usage", ["/tp <tên> · /tp x y z · /tp x z"]);
          this.host.teleport(p, Math.floor(x) + 0.5, three ? Math.max(1, Math.min(250, y)) : -1, Math.floor(z) + 0.5);
          return this.reply(p, "info", "tpDone", [`${Math.floor(x)} ${three ? Math.floor(y) : "(mặt đất)"} ${Math.floor(z)}`]);
        }
        const to = this.find(args[0]);
        if (!args[0]) return this.reply(p, "error", "usage", ["/tp <tên> · /tp x y z · /tp x z"]);
        if (!to) return this.reply(p, "error", "noPlayer", [args[0]]);
        this.host.teleport(p, to.x, to.y, to.z);
        return this.reply(p, "info", "tpDone", [to.name]);
      }
      case "kick": {
        const who = this.find(args[0]);
        if (!args[0]) return this.reply(p, "error", "usage", ["/kick <tên>"]);
        if (!who) return this.reply(p, "error", "noPlayer", [args[0]]);
        this.info("kicked", [who.name, p.name]);
        return this.host.kick(who);
      }
      case "pvp": {
        const on = args[0]?.toLowerCase();
        if (on !== "on" && on !== "off") return this.reply(p, "error", "usage", ["/pvp on|off"]);
        this.host.setPvp(on === "on");
        return this.info(on === "on" ? "pvpOn" : "pvpOff", [p.name]);
      }
      case "give": {
        const to = this.find(args[0]), item = args[1] ?? "", n = Math.floor(Number(args[2] ?? 1));
        if (!args[0] || !item || !Number.isFinite(n) || n < 1) return this.reply(p, "error", "usage", ["/give <tên> <vật phẩm> [số]"]);
        if (!to) return this.reply(p, "error", "noPlayer", [args[0]]);
        if (!itemDef(item)) return this.reply(p, "error", "badItem", [item]);
        const count = Math.min(n, 64 * 36);
        this.host.give(to, item, count);
        return this.reply(p, "info", "gave", [String(count), item, to.name]);
      }
      case "xp": { // /xp <tên> <số> (điểm) · /xp <tên> <số>L (cấp) · /xp <tên> set <số>[L]; số âm = bớt
        const to = this.find(args[0]), set = args[1]?.toLowerCase() === "set";
        const total = to ? xpCommand(to.state.xp, args[set ? 2 : 1] ?? "", set) : null;
        if (!args[0] || (to && total === null)) return this.reply(p, "error", "usage", ["/xp <tên> <số> (điểm) · /xp <tên> <số>L (cấp) · /xp <tên> set <số>[L]"]);
        if (!to || total === null) return this.reply(p, "error", "noPlayer", [args[0]]);
        to.state.xp = total;
        to.stateDirty = true;
        return this.reply(p, "info", "xpSet", [to.name, String(xpLevel(total).level), String(total)]);
      }
      case "nether": // (10a) quản trị viên: sang Vực Lửa / về thế giới chính ở tọa độ tương ứng
        return this.host.dim(p);
      case "locate": { // (10c) /locate fortress, (10d2) bastion; công trình thế giới chính: village, outpost, mansion, desert_pyramid...
        const raw = (args[0] ?? "").toLowerCase(), kind = LOCATE_ALIAS[raw] ?? raw;
        if (kind !== "fortress" && kind !== "bastion") {
          if (!LOCATE_KINDS.includes(kind as LocateKind)) return this.reply(p, "error", "usage", [`/locate ${["fortress", "bastion", ...LOCATE_KINDS].join(" | ")}`]);
          const o = this.host.locate(p, kind), name = `place:${kind}`;
          if (!o) return this.reply(p, "info", "locateNotFound", [name]);
          if (p.dim === 0) return this.reply(p, "info", "locateFound", [name, o.x, o.y, o.z, Math.round(Math.hypot(o.x - p.x, o.z - p.z))].map(String));
          return this.reply(p, "info", "locateFoundNether", [name, o.x, o.y, o.z, Math.floor(o.x / 8), Math.floor(o.z / 8)].map(String));
        }
        const f = this.host.locate(p, kind), fort = kind === "fortress";
        if (!f) return this.reply(p, "info", fort ? "locateNone" : "locateBastionNone");
        if (p.dim === 1) return this.reply(p, "info", fort ? "locateFortress" : "locateBastion", [f.x, f.y, f.z, Math.round(Math.hypot(f.x - p.x, f.z - p.z))].map(String));
        return this.reply(p, "info", fort ? "locateFortressOw" : "locateBastionOw", [f.x, f.y, f.z, f.x * 8, f.z * 8].map(String));
      }
      case "summon": {
        const n = Math.max(1, Math.min(20, Math.floor(Number(args[1] ?? 1)) || 1));
        if (!args[0] || !this.host.summon(p, args[0].toLowerCase(), n)) return this.reply(p, "error", "usage", ["/summon zombie|skeleton|spider|pig|cow|sheep|chicken [số]"]);
        return;
      }
      case "structure": { // (8a) /structure save <tên> x1 y1 z1 x2 y2 z2 (~ = vị trí của mình)
        const rel = (v: string | undefined, base: number): number => (v?.startsWith("~") ? Math.floor(base) + (Number(v.slice(1)) || 0) : Math.floor(Number(v)));
        const c6 = [rel(args[2], p.x), rel(args[3], p.y), rel(args[4], p.z), rel(args[5], p.x), rel(args[6], p.y), rel(args[7], p.z)];
        if (args[0] !== "save" || !args[1] || c6.some((v) => !Number.isFinite(v))) return this.reply(p, "error", "usage", ["/structure save <tên> x1 y1 z1 x2 y2 z2"]);
        const err = this.host.structure(p, args[1].toLowerCase(), [c6[0]!, c6[1]!, c6[2]!], [c6[3]!, c6[4]!, c6[5]!]);
        return err ? this.reply(p, "error", "structFail", [err]) : this.info("structSaved", [p.name, args[1].toLowerCase()]);
      }
      default: {
        // time set <tên | tick> / time add <tick>: đặt giờ trong ngày hiện tại (set) hoặc cộng thêm (add)
        const now = this.host.time(), arg = (args[1] ?? "").toLowerCase(), n = Number(arg);
        const v = TIME_NAMES[arg] ?? (Number.isFinite(n) && n >= 0 ? Math.floor(n) : null);
        if (v === null || (args[0] !== "set" && args[0] !== "add")) return this.reply(p, "error", "usage", ["/time set day|noon|night|midnight|<tick> · /time add <tick>"]);
        const t = args[0] === "add" ? now + v : now - dayTick(now) + (v % DAY.TICKS);
        this.host.setTime(t);
        return this.info("timeSet", [p.name, String(dayTick(t))]);
      }
    }
  }
}
