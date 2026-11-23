// Gói nhị phân MOBS (Giai đoạn 7a): sinh vật mới / vừa đổi trong tầm nhìn + sinh vật đã mất. Server chỉ gửi con nào
// đã di chuyển / đổi trạng thái, nên đàn bò đứng yên không tốn băng thông.
import { BIN } from "./netCodec.js";

export interface NetMob {
  id: number;
  kind: number; // chỉ số trong MOB_DEFS
  flags: number; // MOB_FLAG
  variant: number; // màu len (cừu) hoặc biến thể nhiệt độ (lợn, bò, gà)
  x: number; y: number; z: number;
  yaw: number; // hướng thân (rad, như người chơi: 0 = nhìn về −Z)
  pitch: number; // đầu cúi / ngẩng (rad)
  extra: number; // (7c) byte riêng từng loài (MOB_EXTRA)
}

const BYTES = 22;
const TAU = Math.PI * 2;

export function encodeMobs(up: readonly NetMob[], gone: readonly number[]): ArrayBuffer {
  const buf = new ArrayBuffer(3 + up.length * BYTES + 2 + gone.length * 4);
  const v = new DataView(buf);
  v.setUint8(0, BIN.MOBS);
  v.setUint16(1, up.length);
  let o = 3;
  for (const m of up) {
    v.setUint32(o, m.id);
    v.setUint8(o + 4, m.kind);
    v.setUint8(o + 5, m.flags);
    v.setUint8(o + 6, m.variant);
    v.setFloat32(o + 7, m.x); v.setFloat32(o + 11, m.y); v.setFloat32(o + 15, m.z);
    v.setUint8(o + 19, Math.round((((m.yaw % TAU) + TAU) % TAU) / TAU * 256) & 255);
    v.setInt8(o + 20, Math.max(-127, Math.min(127, Math.round((m.pitch / Math.PI) * 254))));
    v.setUint8(o + 21, m.extra & 255);
    o += BYTES;
  }
  v.setUint16(o, gone.length);
  o += 2;
  for (const id of gone) {
    v.setUint32(o, id);
    o += 4;
  }
  return buf;
}

export function decodeMobs(buf: ArrayBuffer): { up: NetMob[]; gone: number[] } | null {
  if (buf.byteLength < 5) return null;
  const v = new DataView(buf), n = v.getUint16(1);
  if (buf.byteLength < 3 + n * BYTES + 2) return null;
  const up: NetMob[] = [];
  let o = 3;
  for (let i = 0; i < n; i++, o += BYTES)
    up.push({
      id: v.getUint32(o), kind: v.getUint8(o + 4), flags: v.getUint8(o + 5), variant: v.getUint8(o + 6),
      x: v.getFloat32(o + 7), y: v.getFloat32(o + 11), z: v.getFloat32(o + 15),
      yaw: (v.getUint8(o + 19) / 256) * TAU, pitch: (v.getInt8(o + 20) / 254) * Math.PI, extra: v.getUint8(o + 21),
    });
  const g = v.getUint16(o);
  o += 2;
  if (buf.byteLength !== o + g * 4) return null;
  const gone: number[] = [];
  for (let i = 0; i < g; i++, o += 4) gone.push(v.getUint32(o));
  return { up, gone };
}
