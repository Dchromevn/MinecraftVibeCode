// Đọc file trong client.jar (zip) bằng zlib có sẵn của Node — dùng chung cho các công cụ nhập dữ liệu (7e: mẫu công trình).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

export interface Jar {
  name: string;
  /** Mọi đường dẫn file trong jar bắt đầu bằng prefix. */
  list(prefix: string): string[];
  /** Nội dung một file, hoặc null nếu không có. */
  read(path: string): Buffer | null;
}

/** Mở file .jar đầu tiên trong thư mục dir (null nếu chưa có). */
export function openJar(dir: string): Jar | null {
  const name = existsSync(dir) ? readdirSync(dir).find((f) => f.toLowerCase().endsWith(".jar")) : undefined;
  if (!name) return null;
  const zip = readFileSync(join(dir, name));
  const items = new Map<string, { method: number; size: number; offset: number }>();
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("file jar hỏng (không thấy thư mục zip)");
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = zip.readUInt16LE(eocd + 10); n > 0; n--) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("thư mục zip lỗi");
    const nameLen = zip.readUInt16LE(p + 28), extra = zip.readUInt16LE(p + 30), comment = zip.readUInt16LE(p + 32);
    const f = zip.toString("utf8", p + 46, p + 46 + nameLen).replaceAll("\\", "/");
    items.set(f, { method: zip.readUInt16LE(p + 10), size: zip.readUInt32LE(p + 20), offset: zip.readUInt32LE(p + 42) });
    p += 46 + nameLen + extra + comment;
  }
  return {
    name,
    list: (prefix) => [...items.keys()].filter((k) => k.startsWith(prefix) && !k.endsWith("/")),
    read: (path) => {
      const it = items.get(path);
      if (!it) return null;
      const start = it.offset + 30 + zip.readUInt16LE(it.offset + 26) + zip.readUInt16LE(it.offset + 28);
      const raw = zip.subarray(start, start + it.size);
      return it.method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    },
  };
}
