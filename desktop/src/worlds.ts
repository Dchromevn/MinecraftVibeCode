// Danh sách thế giới của app desktop: worlds.json trong thư mục dữ liệu người dùng; mỗi thế giới một thư mục data/<id>.
// Hai loại: "solo" (Chơi một mình) và "server" (Tạo server — mở cho bạn bè), tách riêng. Thư mục thế giới cũ chưa có trong
// danh sách (ví dụ data/world1 của bản trước) được nhận làm thế giới chơi một mình, giữ nguyên thư mục.
import { shell } from "electron";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type WorldKind = "solo" | "server";

export interface WorldEntry {
  id: string; // tên thư mục trong data/
  name: string;
  kind: WorldKind;
  seed: string; // seed người chơi nhập lúc tạo ("" = ngẫu nhiên)
  created: number;
  lastPlayed: number; // 0 = chưa chơi
}

const NAME_MAX = 32;

export class Worlds {
  private readonly file: string;
  readonly dataDir: string;

  constructor(userDir: string) {
    this.file = join(userDir, "worlds.json");
    this.dataDir = join(userDir, "data");
  }

  private load(): WorldEntry[] {
    let list: WorldEntry[] = [];
    try {
      list = JSON.parse(readFileSync(this.file, "utf8")) as WorldEntry[];
    } catch {
      // chưa có / hỏng: dựng lại từ thư mục
    }
    if (!Array.isArray(list)) list = [];
    // nhận thư mục thế giới đã có mà chưa nằm trong danh sách
    if (existsSync(this.dataDir)) {
      for (const id of readdirSync(this.dataDir)) {
        const dir = join(this.dataDir, id);
        if (list.some((w) => w.id === id) || !statSync(dir).isDirectory() || !existsSync(join(dir, "world.json"))) continue;
        const t = statSync(join(dir, "world.json")).mtimeMs;
        list.push({ id, name: id, kind: "solo", seed: "", created: t, lastPlayed: t });
      }
    }
    return list;
  }

  private save(list: WorldEntry[]): void {
    mkdirSync(this.dataDir, { recursive: true });
    writeFileSync(this.file, JSON.stringify(list, null, 2));
  }

  /** Seed thật của thế giới (world.json do server ghi), không có thì seed lúc tạo. */
  private realSeed(w: WorldEntry): string {
    try {
      const m = JSON.parse(readFileSync(join(this.dataDir, w.id, "world.json"), "utf8")) as { seed?: unknown };
      if (typeof m.seed === "string") return m.seed;
    } catch {
      // chưa chơi lần nào
    }
    return w.seed;
  }

  list(kind: WorldKind): WorldEntry[] {
    return this.load().filter((w) => w.kind === kind).map((w) => ({ ...w, seed: this.realSeed(w) }))
      .sort((a, b) => b.lastPlayed - a.lastPlayed || b.created - a.created);
  }

  get(id: string): WorldEntry | null {
    return this.load().find((w) => w.id === id) ?? null;
  }

  /** Thế giới chơi gần nhất (mở app thì server chạy sẵn thế giới này). */
  last(): WorldEntry | null {
    return this.load().filter((w) => w.lastPlayed > 0).sort((a, b) => b.lastPlayed - a.lastPlayed)[0] ?? null;
  }

  create(kind: WorldKind, name: string, seed: string): WorldEntry {
    const list = this.load();
    const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const w: WorldEntry = { id, name: name.trim().slice(0, NAME_MAX) || id, kind, seed: seed.trim().slice(0, NAME_MAX), created: Date.now(), lastPlayed: 0 };
    this.save([...list, w]);
    return w;
  }

  touch(id: string): void {
    const list = this.load();
    const w = list.find((e) => e.id === id);
    if (!w) return;
    w.lastPlayed = Date.now();
    this.save(list);
  }

  /** Xóa: thư mục chuyển vào Thùng rác (lấy lại được), bỏ khỏi danh sách. */
  async remove(id: string): Promise<void> {
    const dir = join(this.dataDir, id);
    if (existsSync(dir)) await shell.trashItem(dir);
    this.save(this.load().filter((w) => w.id !== id));
  }
}
