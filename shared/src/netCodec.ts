// Gói tin nhị phân cho gói gửi thường xuyên (Giai đoạn 5c, PLAN.md "GIAO THỨC"): phím bấm theo từng bước vật
// lý (client → server), trạng thái người chơi do server tính (server → client), vị trí người chơi khác.
// Byte đầu là loại gói (BIN). Gói hiếm (túi đồ, chunk, rương...) vẫn là JSON.
import { createPlayer, type PlayerInput, type PlayerState } from "./physics.js";

export const BIN = { INPUT: 1, STATE: 2, PLAYERS: 3, MOBS: 4 } as const;

/** Phím bấm của một bước vật lý (yaw đã làm tròn float32 để hai bên tính giống hệt). */
export interface InputFrame extends PlayerInput {
  respawn: boolean; // bấm hồi sinh ở bước này
  eat: boolean; // ăn xong món đang cầm ở bước này
}

export interface InputPacket {
  firstSeq: number; // số thứ tự bước đầu tiên trong gói (các bước liên tiếp)
  frames: InputFrame[];
  pitch: number;
  /** Hướng nhìn ngang lúc gửi (6a: hướng đánh / dùng; bước vật lý dùng yaw riêng của từng bước). */
  yaw: number;
  swing: number;
  fly: { x: number; y: number; z: number } | null; // quản trị viên đang bay: vị trí chân
}

/** Vị trí người chơi khác (gói PLAYERS). */
export interface PlayerPos {
  id: number;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  sneaking: boolean; dead: boolean;
  blocking?: boolean; // (6a) đang giơ khiên
  drawing?: boolean; // (6b) đang kéo cung
  sleeping?: boolean; // (7a) đang nằm giường
  swing: number;
  ride?: number; // (7d) id thú đang cưỡi (0 = không)
}

/** Phần đầu gói phím bấm: loại, cờ (bit 0 đang bay), số bước, số thứ tự bước đầu, pitch, số lần vung tay, yaw. */
const HEAD = 18;
const FRAME_BYTES = 7;
const MAX_FRAMES = 240;

export function encodeInput(p: InputPacket): ArrayBuffer {
  const fly = !!p.fly;
  const buf = new ArrayBuffer(HEAD + (fly ? 24 : 0) + p.frames.length * FRAME_BYTES);
  const v = new DataView(buf);
  v.setUint8(0, BIN.INPUT);
  v.setUint8(1, fly ? 1 : 0);
  v.setUint16(2, p.frames.length);
  v.setUint32(4, p.firstSeq);
  v.setFloat32(8, p.pitch);
  v.setUint16(12, p.swing & 0xffff);
  v.setFloat32(14, p.yaw);
  let o = HEAD;
  if (p.fly) {
    v.setFloat64(o, p.fly.x); v.setFloat64(o + 8, p.fly.y); v.setFloat64(o + 16, p.fly.z);
    o += 24;
  }
  for (const f of p.frames) {
    v.setInt8(o, Math.sign(f.forward)); v.setInt8(o + 1, Math.sign(f.strafe));
    v.setUint8(o + 2, (f.jump ? 1 : 0) | (f.sneak ? 2 : 0) | (f.sprint ? 4 : 0) | (f.respawn ? 8 : 0) | (f.eat ? 16 : 0) | (f.block ? 32 : 0) | (f.draw ? 64 : 0));
    v.setFloat32(o + 3, f.yaw);
    o += FRAME_BYTES;
  }
  return buf;
}

/** Giải mã gói phím bấm; sai định dạng thì null (server bỏ qua). */
export function decodeInput(buf: ArrayBuffer): InputPacket | null {
  if (buf.byteLength < HEAD) return null;
  const v = new DataView(buf);
  if (v.getUint8(0) !== BIN.INPUT) return null;
  const fly = (v.getUint8(1) & 1) !== 0, n = v.getUint16(2);
  if (n > MAX_FRAMES || buf.byteLength !== HEAD + (fly ? 24 : 0) + n * FRAME_BYTES) return null;
  const p: InputPacket = { firstSeq: v.getUint32(4), frames: [], pitch: v.getFloat32(8), yaw: v.getFloat32(14), swing: v.getUint16(12), fly: null };
  let o = HEAD;
  if (fly) {
    p.fly = { x: v.getFloat64(o), y: v.getFloat64(o + 8), z: v.getFloat64(o + 16) };
    o += 24;
  }
  for (let i = 0; i < n; i++, o += FRAME_BYTES) {
    const b = v.getUint8(o + 2);
    p.frames.push({
      forward: Math.sign(v.getInt8(o)), strafe: Math.sign(v.getInt8(o + 1)),
      jump: (b & 1) !== 0, sneak: (b & 2) !== 0, sprint: (b & 4) !== 0, respawn: (b & 8) !== 0, eat: (b & 16) !== 0, block: (b & 32) !== 0, draw: (b & 64) !== 0,
      yaw: v.getFloat32(o + 3),
    });
  }
  if (![p.pitch, p.yaw, ...p.frames.map((f) => f.yaw), ...(p.fly ? [p.fly.x, p.fly.y, p.fly.z] : [])].every(Number.isFinite)) return null;
  return p;
}

// ---- trạng thái người chơi: mọi trường số (float64) theo thứ tự cố định + các cờ đúng / sai ----
const SAMPLE = createPlayer(0, 0, 0) as unknown as Record<string, unknown>;
export const STATE_NUM = Object.keys(SAMPLE).filter((k) => typeof SAMPLE[k] === "number");
export const STATE_BOOL = Object.keys(SAMPLE).filter((k) => typeof SAMPLE[k] === "boolean");

export function encodeState(seq: number, s: PlayerState): ArrayBuffer {
  const buf = new ArrayBuffer(5 + STATE_NUM.length * 8 + 4);
  const v = new DataView(buf), r = s as unknown as Record<string, number | boolean>;
  v.setUint8(0, BIN.STATE);
  v.setUint32(1, seq);
  STATE_NUM.forEach((k, i) => v.setFloat64(5 + i * 8, r[k] as number));
  let flags = 0;
  STATE_BOOL.forEach((k, i) => { if (r[k]) flags |= 1 << i; });
  v.setUint32(5 + STATE_NUM.length * 8, flags);
  return buf;
}

export function decodeState(buf: ArrayBuffer): { seq: number; state: PlayerState } | null {
  if (buf.byteLength !== 5 + STATE_NUM.length * 8 + 4) return null;
  const v = new DataView(buf);
  const s = createPlayer(0, 0, 0), r = s as unknown as Record<string, number | boolean>;
  STATE_NUM.forEach((k, i) => (r[k] = v.getFloat64(5 + i * 8)));
  const flags = v.getUint32(5 + STATE_NUM.length * 8);
  STATE_BOOL.forEach((k, i) => (r[k] = (flags & (1 << i)) !== 0));
  return { seq: v.getUint32(1), state: s };
}

// ---- người chơi khác ----
const POS_BYTES = 29;

export function encodePlayers(list: readonly PlayerPos[]): ArrayBuffer {
  const buf = new ArrayBuffer(3 + list.length * POS_BYTES);
  const v = new DataView(buf);
  v.setUint8(0, BIN.PLAYERS);
  v.setUint16(1, list.length);
  list.forEach((p, i) => {
    const o = 3 + i * POS_BYTES;
    v.setUint16(o, p.id);
    v.setFloat32(o + 2, p.x); v.setFloat32(o + 6, p.y); v.setFloat32(o + 10, p.z);
    v.setFloat32(o + 14, p.yaw); v.setFloat32(o + 18, p.pitch);
    v.setUint8(o + 22, (p.sneaking ? 1 : 0) | (p.dead ? 2 : 0) | (p.blocking ? 4 : 0) | (p.drawing ? 8 : 0) | (p.sleeping ? 16 : 0));
    v.setUint16(o + 23, p.swing & 0xffff);
    v.setUint32(o + 25, p.ride ?? 0);
  });
  return buf;
}

export function decodePlayers(buf: ArrayBuffer): PlayerPos[] {
  const v = new DataView(buf), n = v.getUint16(1), out: PlayerPos[] = [];
  for (let i = 0; i < n; i++) {
    const o = 3 + i * POS_BYTES, f = v.getUint8(o + 22);
    out.push({
      id: v.getUint16(o), x: v.getFloat32(o + 2), y: v.getFloat32(o + 6), z: v.getFloat32(o + 10),
      yaw: v.getFloat32(o + 14), pitch: v.getFloat32(o + 18), sneaking: (f & 1) !== 0, dead: (f & 2) !== 0, blocking: (f & 4) !== 0, drawing: (f & 8) !== 0, sleeping: (f & 16) !== 0, swing: v.getUint16(o + 23), ride: v.getUint32(o + 25),
    });
  }
  return out;
}

/** Loại gói nhị phân (byte đầu), hoặc −1. */
export const binType = (buf: ArrayBuffer): number => (buf.byteLength ? new DataView(buf).getUint8(0) : -1);
