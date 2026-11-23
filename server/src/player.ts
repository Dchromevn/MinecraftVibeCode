// Người chơi phía server: kết nối, túi đồ (nguồn sự thật), trạng thái vật lý / sinh tồn do server tính từ phím
// bấm (Giai đoạn 5c), chunk đang theo dõi, rương / lò đang mở, vật phẩm rơi và người chơi khác đã gửi.
import {
  Inventory, NET, PLAYER, RIDE_BACK_FLAG, createPlayer, itemDef, snapshotInv, type HeldTool, type PlayerPos, type PlayerState, type ServerMsg,
} from "../../shared/src/index.js";
import type { ContainerSession } from "./containers.js";
import type { PlayerSave } from "./storage.js";

/** Kết nối tới client (WebSocket thật, hoặc giả lập trong bộ kiểm tra). Dữ liệu nhị phân: ArrayBuffer. */
export interface Conn {
  send(data: string | ArrayBuffer): void;
  close(): void;
}

export class ServerPlayer {
  readonly inv = new Inventory();
  /** Số thứ tự lệnh túi đồ cuối cùng đã áp dụng (client dùng để đoán trước / sửa). */
  ack = 0;
  invDirty = true;
  /** Trạng thái vật lý + sinh tồn (vị trí, vận tốc, máu, đói...) — nguồn sự thật. */
  state: PlayerState = createPlayer(0, 0, 0);
  /** Bước vật lý cuối cùng đã chạy (số thứ tự client gửi). */
  lastSeq = 0;
  /** Số bước vật lý còn được chạy (nạp PHYSICS_HZ mỗi giây thật): chặn gửi phím nhanh để chạy nhanh. */
  budget: number = NET.INPUT_BURST;
  /** Lần nạp số bước gần nhất (ms, đồng hồ của Movement). */
  budgetAt = -1;
  stateDirty = true;
  yaw = 0; // theo bước vật lý cuối
  /** Hướng nhìn ngang lúc client gửi gói gần nhất — hướng đánh / dùng (6a; khi bay không có bước vật lý). */
  lookYaw = 0;
  pitch = 0;
  flying = false;
  swing = 0;
  /** Đang đào ô nào, bắt đầu lúc nào (ms) — kiểm tra thời gian đào. */
  digging: { x: number; y: number; z: number; at: number } | null = null;
  /** Đã xử lý cái chết hiện tại chưa (rải đồ một lần). */
  deathHandled = false;
  /** Ô giường đặt điểm hồi sinh (7a); null = điểm hồi sinh thế giới. Giường mất thì về điểm của thế giới. */
  spawnPoint: { x: number; y: number; z: number; dim?: number } | null = null; // (10d2) dim: mỏ neo hồi sinh ở Vực Lửa
  /** Chunk client đang giữ (khóa chunkKey): nhận danh sách block đã sửa và thay đổi block. */
  readonly subs = new Set<number>();
  container: ContainerSession | null = null;
  /** (7d) Lần gửi trước có dây dắt nào trong tầm nhìn (để gửi danh sách rỗng một lần khi hết). */
  hadLeashes = false;
  /** (8a) Đang mở bảng đổi đồ với sinh vật id này (0 = không). */
  trading = 0;
  /** (8b2) Hạt giống 3 lựa chọn của bàn phù phép (đổi sau mỗi lần phù phép, như Minecraft). */
  xpSeed = Math.floor(Math.random() * 2 ** 31);
  /** (8b2) Bàn phù phép đang mở (vị trí) — null = không. */
  enchantAt: { x: number; y: number; z: number } | null = null;
  /** (8b3) Đe / đá mài đang mở. */
  stationAt: { x: number; y: number; z: number } | null = null;
  /** (10a) Cõi đang ở (0 thế giới chính, 1 Vực Lửa); đã đứng trong cổng bao lâu; chờ sau khi vừa sang. */
  dim = 0;
  portalS = 0;
  portalCdS = 0;
  portalPending = false; // đang chờ tải chunk chỗ đến
  /** Vật phẩm rơi client đang thấy: id → chữ ký vị trí / số lượng lần gửi trước. */
  readonly knownItems = new Map<number, string>();
  /** Đồ cầm / giáp của người chơi khác đã gửi cho người này: id → khóa. */
  readonly knownLooks = new Map<number, string>();
  // ---- Giai đoạn 6a ----
  /** Vị trí 1 giây gần nhất (mỗi tick) — tua lại khi kiểm tra đòn đánh của người khác (bù trễ). */
  readonly hist: { t: number; x: number; y: number; z: number; sneaking: boolean }[] = [];
  /** Lần đánh / đổi đồ trên tay gần nhất (ms) — hệ số hồi đòn. */
  lastAttackAt = -1e9;
  /** Bước vật lý gần nhất có chạy nhanh không (đẩy lùi mạnh, chí mạng). */
  sprinting = false;
  /** Ai đánh mình gần nhất, lúc nào (ms) — thông báo chết. */
  lastAttacker: { name: string; at: number } | null = null;
  /** Thời điểm các tin chat gần đây (ms) — chống spam. */
  readonly chatTimes: number[] = [];
  /** Lần báo lỗi "vùng an toàn / PvP tắt" gần nhất (ms) — không báo dồn dập. */
  noticeAt = -1e9;
  /** Đang giơ khiên (theo bước vật lý cuối), từ lúc nào (ms); khiên bị rìu khóa tới lúc nào (ms). */
  blocking = false;
  blockSince = 0;
  shieldOffUntil = -1e9;
  /** Đang kéo cung (6b), bắt đầu lúc nào (ms). */
  drawing = false;
  drawAt = 0;
  /** Mũi tên client đang thấy: id → "s" (đã cắm) / "f" (đang bay). */
  readonly knownArrows = new Map<number, string>();
  // ---- Giai đoạn 7a ----
  /** Sinh vật client đang thấy: id → chữ ký trạng thái lần gửi trước. */
  readonly knownMobs = new Map<number, string>();
  /** Đang nằm giường (ô giường), bao lâu rồi (giây), máu lúc nằm xuống (bị đánh thì dậy). */
  sleeping: { x: number; y: number; z: number } | null = null;
  sleepS = 0;
  sleepHealth = 0;
  // ---- Giai đoạn 7b ----
  /** Ném ngọc hư không lần kế được từ lúc này (ms). */
  pearlReadyAt = 0;
  /** Giây đã thức từ lần ngủ / chết gần nhất (bóng ma đêm khi ≥ 3 ngày); lưu theo tài khoản. */
  awakeS = 0;
  /** Giây tới lần thử sinh bóng ma đêm kế. */
  phantomS = 60;

  constructor(readonly id: number, readonly name: string, readonly conn: Conn, public admin = false) {}

  get x(): number { return this.state.x; }
  set x(v: number) { this.state.x = v; }
  get y(): number { return this.state.y; }
  set y(v: number) { this.state.y = v; }
  get z(): number { return this.state.z; }
  set z(v: number) { this.state.z = v; }
  get health(): number { return this.state.health; }
  set health(v: number) { this.state.health = v; }
  get hunger(): number { return this.state.hunger; }
  set hunger(v: number) { this.state.hunger = v; }
  get saturation(): number { return this.state.saturation; }
  set saturation(v: number) { this.state.saturation = v; }
  get dead(): boolean { return this.state.dead; }
  get sneaking(): boolean { return this.state.sneaking; }

  /** Đặt lại trạng thái (vào game, hồi sinh) ở vị trí chân (x, y, z). */
  reset(x: number, y: number, z: number): void {
    this.state = { ...createPlayer(x, y, z), xp: this.state.xp }; // (8b2) chết không mất XP (người dùng chọn)
    this.deathHandled = false;
    this.stateDirty = true;
  }

  /** Dữ liệu lưu của người chơi (Giai đoạn 5b). */
  toSave(): PlayerSave {
    return {
      name: this.name, x: this.x, y: this.y, z: this.z, health: this.health, hunger: this.hunger, saturation: this.saturation,
      spawn: this.spawnPoint, inv: snapshotInv(this.inv, 0), awake: Math.round(this.awakeS), xp: this.state.xp, xpSeed: this.xpSeed,
      dim: this.dim, admin: this.admin,
    };
  }

  send(msg: ServerMsg): void {
    this.conn.send(JSON.stringify(msg));
  }

  /** Gửi trạng thái túi đồ nếu có đổi. */
  flushInv(): void {
    if (!this.invDirty) return;
    this.invDirty = false;
    this.send({ t: "inv", s: snapshotInv(this.inv, this.ack) });
  }

  eye(): [number, number, number] {
    return [this.x, this.y + (this.sneaking ? PLAYER.SNEAK_EYE_HEIGHT : PLAYER.EYE_HEIGHT), this.z];
  }

  /** Khoảng cách từ mắt tới tâm ô (x, y, z). */
  distTo(x: number, y: number, z: number): number {
    const [ex, ey, ez] = this.eye();
    return Math.hypot(x + 0.5 - ex, y + 0.5 - ey, z + 0.5 - ez);
  }

  /** Hướng nhìn (vectơ đơn vị) theo yaw / pitch như camera client. */
  lookDir(): { x: number; y: number; z: number } {
    const c = Math.cos(this.pitch);
    return { x: -Math.sin(this.lookYaw) * c, y: Math.sin(this.pitch), z: -Math.cos(this.lookYaw) * c };
  }

  heldTool(): HeldTool | null {
    const s = this.inv.held;
    const t = s ? itemDef(s.item)?.tool : undefined;
    return t ? { kind: t.kind, tier: t.tier, ench: s?.ench } : null;
  }

  pos(): PlayerPos {
    return {
      id: this.id, x: this.x, y: this.y, z: this.z, yaw: this.lookYaw, pitch: this.pitch, sneaking: this.sneaking, dead: this.dead,
      blocking: this.blocking, drawing: this.drawing, sleeping: !!this.sleeping, swing: this.swing, ride: this.state.rideId + (this.state.rideBack ? RIDE_BACK_FLAG : 0),
    };
  }

  /** Giáp đỡ đòn (state.armorHits): mỗi món đang mặc mất độ bền. */
  wearArmor(): void {
    const hits = this.state.armorHits;
    if (hits <= 0) return;
    for (let i = 0; i < 4; i++) this.inv.damageSlot("armor", i, hits);
    this.state.armorHits = 0;
    this.invDirty = true;
  }

  /** Đồ cầm + giáp (gửi cho người khác khi đổi). */
  look(): { held: string | null; off: string | null; armor: (string | null)[] } {
    const h = this.inv.held; // (8b2) đồ phù phép: thêm "*" để người khác thấy ánh tím
    return { held: h ? h.item + (h.ench ? "*" : "") : null, off: this.inv.offhand[0]?.item ?? null, armor: this.inv.armor.map((s) => s?.item ?? null) };
  }
}
