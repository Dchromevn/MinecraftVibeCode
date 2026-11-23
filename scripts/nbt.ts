// Đọc file NBT của Minecraft (mẫu công trình .nbt trong client.jar: gzip + NBT nhị phân big-endian). Chỉ dùng zlib có sẵn.
import { gunzipSync } from "node:zlib";

export type Nbt = number | bigint | string | Nbt[] | { [k: string]: Nbt } | Int8Array | Int32Array | BigInt64Array;

class Reader {
  o = 0;
  constructor(private readonly b: Buffer) {}
  u8(): number { return this.b.readUInt8(this.o++); }
  i8(): number { return this.b.readInt8(this.o++); }
  i16(): number { const v = this.b.readInt16BE(this.o); this.o += 2; return v; }
  u16(): number { const v = this.b.readUInt16BE(this.o); this.o += 2; return v; }
  i32(): number { const v = this.b.readInt32BE(this.o); this.o += 4; return v; }
  i64(): bigint { const v = this.b.readBigInt64BE(this.o); this.o += 8; return v; }
  f32(): number { const v = this.b.readFloatBE(this.o); this.o += 4; return v; }
  f64(): number { const v = this.b.readDoubleBE(this.o); this.o += 8; return v; }
  str(): string { const n = this.u16(); const s = this.b.toString("utf8", this.o, this.o + n); this.o += n; return s; }

  payload(t: number): Nbt {
    switch (t) {
      case 1: return this.i8();
      case 2: return this.i16();
      case 3: return this.i32();
      case 4: return this.i64();
      case 5: return this.f32();
      case 6: return this.f64();
      case 7: { const n = this.i32(), a = new Int8Array(n); for (let i = 0; i < n; i++) a[i] = this.i8(); return a; }
      case 8: return this.str();
      case 9: { const et = this.u8(), n = this.i32(), a: Nbt[] = []; for (let i = 0; i < n; i++) a.push(this.payload(et)); return a; }
      case 10: {
        const o: { [k: string]: Nbt } = {};
        for (;;) {
          const ct = this.u8();
          if (ct === 0) return o;
          o[this.str()] = this.payload(ct);
        }
      }
      case 11: { const n = this.i32(), a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = this.i32(); return a; }
      case 12: { const n = this.i32(), a = new BigInt64Array(n); for (let i = 0; i < n; i++) a[i] = this.i64(); return a; }
      default: throw new Error(`NBT: kiểu tag lạ ${t} ở ${this.o}`);
    }
  }
}

/** Đọc file NBT (đã / chưa gzip) → compound gốc. */
export function readNbt(buf: Buffer): { [k: string]: Nbt } {
  const b = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  const r = new Reader(b);
  const t = r.u8();
  if (t !== 10) throw new Error("NBT: gốc không phải compound");
  r.str();
  return r.payload(10) as { [k: string]: Nbt };
}

export interface McBlock { name: string; props: Record<string, string> }
export interface McTemplate {
  size: [number, number, number];
  palette: McBlock[];
  blocks: { x: number; y: number; z: number; state: number; nbt?: { [k: string]: Nbt } }[];
}

/** Mẫu công trình .nbt → kích thước, bảng block, danh sách ô (bảng đầu tiên nếu có nhiều "palettes"). */
export function readTemplate(buf: Buffer): McTemplate {
  const root = readNbt(buf);
  const size = root.size as number[];
  // bản cũ: { Name, Properties }; bản mới (client.jar hiện tại): { id, properties }
  const pal = (root.palette ?? (root.palettes as Nbt[][])[0]) as { Name?: string; id?: string; Properties?: Record<string, string>; properties?: Record<string, string> }[];
  const palette = pal.map((p) => ({ name: String(p.id ?? p.Name).replace(/^minecraft:/, ""), props: { ...(p.properties ?? p.Properties ?? {}) } }));
  const blocks = (root.blocks as { pos: number[]; state: number; nbt?: { [k: string]: Nbt } }[]).map((b) => ({
    x: b.pos[0]!, y: b.pos[1]!, z: b.pos[2]!, state: b.state, ...(b.nbt ? { nbt: b.nbt } : {}),
  }));
  return { size: [size[0]!, size[1]!, size[2]!], palette, blocks };
}
