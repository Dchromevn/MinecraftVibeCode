// Tiện ích cho bộ kiểm tra server (Giai đoạn 5c): gói nhị phân "đang bay" (quản trị viên báo vị trí), đặt thẳng
// trạng thái người chơi trên server (thay cho gói "move" cũ), kết nối giả giữ cả gói JSON lẫn gói nhị phân.
import { encodeInput, type InputFrame, type ServerMsg } from "../shared/src/index.js";
import type { ServerPlayer } from "../server/src/player.js";

/** Quản trị viên đang bay tới (x, y, z) — server nhận vị trí, không chạy vật lý. */
export const flyPacket = (x: number, y: number, z: number): ArrayBuffer =>
  encodeInput({ firstSeq: 1, frames: [], pitch: 0, yaw: 0, swing: 0, fly: { x, y, z } });

/** Gói phím bấm: các bước liên tiếp từ firstSeq. */
export const inputPacket = (firstSeq: number, frames: InputFrame[], pitch = 0): ArrayBuffer =>
  encodeInput({ firstSeq, frames, pitch, yaw: frames.length ? frames[frames.length - 1]!.yaw : 0, swing: 0, fly: null });

export const frame = (o: Partial<InputFrame> = {}): InputFrame =>
  ({ forward: 0, strafe: 0, jump: false, sneak: false, sprint: false, yaw: 0, respawn: false, eat: false, ...o });

/** Đặt người chơi đứng ở (x, y, z) trên server (không bay). */
export function standAt(p: ServerPlayer, x: number, y: number, z: number): void {
  Object.assign(p.state, { x, y, z, vx: 0, vy: 0, vz: 0, fallDist: 0 });
  p.flying = false;
}

/** Kết nối giả: gói JSON vào msgs, gói nhị phân vào bins. */
export function fakeConn(): { msgs: ServerMsg[]; bins: ArrayBuffer[]; closed: boolean; conn: { send(d: string | ArrayBuffer): void; close(): void } } {
  const f = {
    msgs: [] as ServerMsg[], bins: [] as ArrayBuffer[], closed: false,
    conn: {
      send: (d: string | ArrayBuffer): void => {
        if (typeof d === "string") f.msgs.push(JSON.parse(d) as ServerMsg);
        else f.bins.push(d);
      },
      close: (): void => void (f.closed = true),
    },
  };
  return f;
}
