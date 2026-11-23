// Đoán trước + hiệu chỉnh (Giai đoạn 5c): mỗi bước vật lý có số thứ tự; client chạy ngay (không chờ server) và
// nhớ phím bấm + trạng thái sau bước. Server chạy lại đúng các bước đó rồi gửi trạng thái thật kèm số thứ tự:
// khớp thì bỏ lịch sử cũ; lệch thì lấy trạng thái server và chạy lại các bước chưa được xác nhận.
import {
  PLAYER, STATE_BOOL, STATE_NUM, canEat, createPlayer, eat, stepPlayer,
  type CellReader, type FoodDef, type InputFrame, type PlayerInput, type PlayerState,
} from "../../../shared/src/index.js";

interface Entry {
  seq: number;
  frame: InputFrame;
  respawnAt: { x: number; y: number; z: number } | null;
  food: FoodDef | null;
  after: PlayerState;
}

/** Trường do client tự đặt theo túi đồ của mình (không so với server). */
const SKIP = new Set(["armorHits", "armorPoints", "armorToughness"]);
const MAX_HISTORY = 600; // 10 giây

const clone = (s: PlayerState): PlayerState => ({ ...s });

function differs(a: PlayerState, b: PlayerState): boolean {
  const ra = a as unknown as Record<string, number | boolean>, rb = b as unknown as Record<string, number | boolean>;
  for (const k of STATE_NUM) if (!SKIP.has(k) && Math.abs((ra[k] as number) - (rb[k] as number)) > 1e-6) return true;
  for (const k of STATE_BOOL) if (ra[k] !== rb[k]) return true;
  return false;
}

/** Một bước vật lý với hồi sinh / ăn đi kèm — giống hệt Movement.step ở server. */
function applyStep(s: PlayerState, e: Omit<Entry, "after" | "seq">, cell: CellReader): void {
  if (e.frame.respawn && s.dead && e.respawnAt) {
    Object.assign(s, createPlayer(e.respawnAt.x, e.respawnAt.y, e.respawnAt.z), { xp: s.xp }); // (8b2) chết không mất XP
    s.invulnS = PLAYER.RESPAWN_INVULN_S;
  }
  if (e.frame.eat && !s.dead && e.food && canEat(s, e.food)) eat(s, e.food);
  stepPlayer(s, e.frame, cell);
  s.armorHits = 0; // giáp mòn do server trừ
}

export class Prediction {
  seq = 0;
  lastAck = 0;
  pendingRespawn: { x: number; y: number; z: number } | null = null;
  pendingEat: FoodDef | null = null;
  private history: Entry[] = [];

  constructor(private readonly cell: CellReader) {}

  /** Chạy một bước (sửa s tại chỗ) và ghi lịch sử. */
  step(s: PlayerState, inp: PlayerInput): void {
    const frame: InputFrame = { ...inp, yaw: Math.fround(inp.yaw), respawn: !!this.pendingRespawn, eat: !!this.pendingEat };
    const e = { frame, respawnAt: this.pendingRespawn, food: this.pendingEat };
    this.pendingRespawn = null;
    this.pendingEat = null;
    applyStep(s, e, this.cell);
    this.history.push({ ...e, seq: ++this.seq, after: clone(s) });
    if (this.history.length > MAX_HISTORY) this.history.shift();
  }

  /** Các bước server chưa xác nhận (gửi lại mỗi lần cho chắc, mất gói không sao). */
  unacked(max: number): { firstSeq: number; frames: InputFrame[] } | null {
    const h = this.history.length > max ? this.history.slice(-max) : this.history;
    return h.length ? { firstSeq: h[0]!.seq, frames: h.map((e) => e.frame) } : null;
  }

  /**
   * Trạng thái thật của server sau bước seq. Trả về trạng thái mới (đã chạy lại các bước chưa xác nhận) nếu
   * phải sửa; null nếu khớp hoặc gói cũ.
   */
  reconcile(seq: number, server: PlayerState): PlayerState | null {
    if (seq <= this.lastAck) return null;
    this.lastAck = seq;
    const i = this.history.findIndex((e) => e.seq === seq);
    if (i < 0) {
      // không còn lịch sử của bước này: chỉ nhận khi không còn bước nào đang chờ
      if (this.history.some((e) => e.seq > seq)) return null;
      return clone(server);
    }
    const mine = this.history[i]!.after;
    this.history = this.history.slice(i + 1);
    if (!differs(mine, server)) return null;
    const s = clone(server);
    for (const e of this.history) {
      applyStep(s, e, this.cell);
      e.after = clone(s);
    }
    return s;
  }

  /** Sửa trạng thái sau bước vừa chạy (hành động server cũng áp dụng sau đúng bước đó, ví dụ hao sức khi đánh). */
  patchLast(fn: (s: PlayerState) => void): void {
    const e = this.history[this.history.length - 1];
    if (e) fn(e.after);
  }

  /** Đang bay (quản trị viên): bỏ lịch sử, server nhận vị trí trực tiếp. */
  clear(): void {
    this.history = [];
  }
}
