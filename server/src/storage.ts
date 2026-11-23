// Lưu thế giới xuống đĩa (Giai đoạn 5b, PLAN.md "SERVER VÀ LƯU TRỮ"): /server/data/<thế giới>/
//   world.json            seed, phiên bản bộ sinh thế giới, điểm hồi sinh, giờ
//   region/r.<rx>.<rz>.bin  chunk đã sửa, mỗi vùng 32x32 chunk, nén zlib (danh sách ô đã sửa + nguyên nội dung)
//   entities.json         rương, lò nung, vật phẩm rơi; (7a) động vật, danh sách chunk đã sinh động vật
//   players/<tên>.json    vị trí, máu, đói, túi đồ, ô giường đặt điểm hồi sinh (7a)
//   accounts.json         tài khoản (mật khẩu băm scrypt)
// Mọi file ghi an toàn: ghi file .tmp rồi đổi tên. dir = null: chỉ giữ trong bộ nhớ (bộ kiểm tra).
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { deflate, deflateSync, inflate, inflateSync } from "node:zlib";
import { CHUNK_VOLUME, SAVE, type BlockEntity, type CustomStructure, type InvSnapshot, type ItemStack } from "../../shared/src/index.js";
import type { MobSave } from "./mobs/mob.js";

export interface WorldMeta {
  format: number;
  seed: string;
  worldgen: number;
  spawn: { x: number; y: number; z: number };
  time: number; // số tick từ lúc tạo thế giới; giờ trong ngày = time mod 24000 (Giai đoạn 7a)
}

/** Một chunk đã sửa: danh sách ô khác bản sinh gốc [chỉ số, cell, ...] + nguyên nội dung (an toàn khi đổi bộ sinh). */
export interface SavedChunk {
  cx: number;
  cz: number;
  worldgen: number;
  edits: number[];
  data: Uint8Array;
  meta: Uint8Array;
}

export interface PlayerSave {
  name: string;
  x: number; y: number; z: number;
  health: number; hunger: number; saturation: number;
  spawn: { x: number; y: number; z: number } | null; // ô đầu giường đặt điểm hồi sinh (7a); null = điểm của thế giới
  awake?: number; // (7b) giây đã thức (bóng ma đêm); file cũ không có thì 0
  xp?: number; // (8b2) tổng điểm kinh nghiệm
  xpSeed?: number; // (8b2) hạt giống lựa chọn của bàn phù phép (đổi sau mỗi lần phù phép)
  dim?: number; // (10a) cõi đang ở; file cũ không có thì thế giới chính
  admin?: boolean; // (9a) chế độ quản trị (/admin); file cũ không có thì theo danh sách admins trong config
  inv: InvSnapshot;
}

export interface SavedItem { stack: ItemStack; x: number; y: number; z: number; age: number }

/** entities.json. mobs / populated thêm ở 7a (file cũ không có thì coi như rỗng). */
export interface SavedEntities {
  blocks: BlockEntity[];
  items: SavedItem[];
  mobs?: MobSave[];
  populated?: number[];
  hutWitches?: string[]; // nhà phù thủy đã có phù thủy ở nhà (thêm 2026-11-14)
  structMobs?: string[]; // (7f) chỗ sinh vật canh công trình đã sinh (xác đuối ở tàn tích)
}

interface Account { name: string; salt: string; hash: string }

const MAGIC = 0x31525856; // "VXR1"
const regionOf = (c: number): number => Math.floor(c / SAVE.REGION_CHUNKS);
const hashPw = (pw: string, salt: string): Buffer => scryptSync(pw, salt, 32);

export class WorldStorage {
  private accounts = new Map<string, Account>();
  private readonly memPlayers = new Map<string, PlayerSave>();

  constructor(readonly dir: string | null) {
    if (!dir) return;
    mkdirSync(join(dir, "region"), { recursive: true });
    mkdirSync(join(dir, "players"), { recursive: true });
    for (const a of this.readJson<Account[]>("accounts.json", [])) this.accounts.set(a.name.toLowerCase(), a);
  }

  // ---- file ----
  private readJson<T>(rel: string, fallback: T): T {
    if (!this.dir) return fallback;
    const f = join(this.dir, rel);
    if (!existsSync(f)) return fallback;
    return JSON.parse(readFileSync(f, "utf8")) as T;
  }

  private write(rel: string, data: string | Buffer): void {
    if (!this.dir) return;
    const f = join(this.dir, rel), tmp = f + ".tmp";
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(tmp, data);
    renameSync(tmp, f); // ghi xong mới thay file cũ: mất điện giữa chừng không hỏng file đang có
  }

  // ---- thế giới ----
  loadWorld(): WorldMeta | null {
    return this.readJson<WorldMeta | null>("world.json", null);
  }

  saveWorld(m: WorldMeta): void {
    this.write("world.json", JSON.stringify(m, null, 1));
  }

  // ---- vùng chunk ----
  private regionFile(rx: number, rz: number): string {
    return join("region", `r.${rx}.${rz}.bin`);
  }

  private readRegion(rel: string): SavedChunk[] {
    if (!this.dir || !existsSync(join(this.dir, rel))) return [];
    return this.decodeRegion(rel, inflateSync(readFileSync(join(this.dir, rel))));
  }

  private decodeRegion(rel: string, b: Buffer): SavedChunk[] {
    if (b.readUInt32LE(0) !== MAGIC) throw new Error(`file vùng hỏng: ${rel}`);
    const n = b.readUInt32LE(4), out: SavedChunk[] = [];
    let o = 8;
    for (let i = 0; i < n; i++) {
      const cx = b.readInt32LE(o), cz = b.readInt32LE(o + 4), worldgen = b.readUInt16LE(o + 8), ne = b.readUInt32LE(o + 10);
      o += 14;
      const edits: number[] = [];
      for (let k = 0; k < ne; k++, o += 4) edits.push(b.readUInt16LE(o), b.readUInt16LE(o + 2));
      const data = new Uint8Array(b.subarray(o, o + CHUNK_VOLUME));
      const meta = new Uint8Array(b.subarray(o + CHUNK_VOLUME, o + 2 * CHUNK_VOLUME));
      o += 2 * CHUNK_VOLUME;
      out.push({ cx, cz, worldgen, edits, data, meta });
    }
    return out;
  }

  private encodeRegion(list: SavedChunk[]): Buffer {
    return deflateSync(this.rawRegion(list));
  }

  private rawRegion(list: SavedChunk[]): Buffer {
    const size = 8 + list.reduce((s, c) => s + 14 + c.edits.length * 2 + 2 * CHUNK_VOLUME, 0);
    const b = Buffer.alloc(size);
    b.writeUInt32LE(MAGIC, 0);
    b.writeUInt32LE(list.length, 4);
    let o = 8;
    for (const c of list) {
      b.writeInt32LE(c.cx, o); b.writeInt32LE(c.cz, o + 4); b.writeUInt16LE(c.worldgen, o + 8); b.writeUInt32LE(c.edits.length / 2, o + 10);
      o += 14;
      for (let k = 0; k < c.edits.length; k += 2, o += 4) { b.writeUInt16LE(c.edits[k]!, o); b.writeUInt16LE(c.edits[k + 1]!, o + 2); }
      b.set(c.data, o); b.set(c.meta, o + CHUNK_VOLUME);
      o += 2 * CHUNK_VOLUME;
    }
    return b;
  }

  /** Mọi chunk đã lưu (đọc khi khởi động; chỉ chunk đã sửa nên ít). */
  loadAllChunks(): SavedChunk[] {
    if (!this.dir) return [];
    const out: SavedChunk[] = [];
    for (const f of readdirSync(join(this.dir, "region"))) if (/^r\.-?\d+\.-?\d+\.bin$/.test(f)) out.push(...this.readRegion(join("region", f)));
    return out;
  }

  /** Ghi các chunk (gộp theo vùng: đọc file vùng cũ, thay chunk mới, ghi lại). */
  /** Chunk đang lưu dở bằng saveChunksAsync (lưu đồng bộ khi tắt server thì gộp vào để không mất). */
  private inFlight: SavedChunk[] = [];
  private chain: Promise<void> = Promise.resolve();

  /**
   * (sửa ping 2026-11-14) Tự lưu định kỳ: đọc / giải nén / nén / ghi file vùng không chặn luồng chính (zlib chạy ở luồng của
   * Node). Các lần lưu nối tiếp nhau. Chỉ dùng cho tự lưu; khi tắt server dùng saveChunks (đồng bộ, gộp cả phần đang lưu dở).
   */
  saveChunksAsync(list: SavedChunk[]): Promise<void> {
    if (!this.dir || !list.length) return this.chain;
    this.inFlight.push(...list);
    const dir = this.dir;
    this.chain = this.chain.then(async () => {
      for (const [rel, fresh] of this.byRegion(list)) {
        const f = join(dir, rel), tmp = f + ".tmp";
        const old = existsSync(f) ? this.decodeRegion(rel, await promisify(inflate)(await readFile(f))) : [];
        const all = new Map(old.map((c) => [`${c.cx},${c.cz}`, c]));
        for (const c of fresh) all.set(`${c.cx},${c.cz}`, c);
        const raw = this.rawRegion([...all.values()]);
        mkdirSync(dirname(f), { recursive: true });
        await writeFile(tmp, await promisify(deflate)(raw));
        await rename(tmp, f);
      }
      this.inFlight = this.inFlight.filter((c) => !list.includes(c));
    }).catch((err) => console.error("[server] lỗi khi tự lưu chunk:", err));
    return this.chain;
  }

  private byRegion(list: SavedChunk[]): Map<string, SavedChunk[]> {
    const byRegion = new Map<string, SavedChunk[]>();
    for (const c of list) {
      const rel = this.regionFile(regionOf(c.cx), regionOf(c.cz));
      let l = byRegion.get(rel);
      if (!l) byRegion.set(rel, (l = []));
      l.push(c);
    }
    return byRegion;
  }

  saveChunks(list: SavedChunk[]): void {
    list = [...this.inFlight, ...list]; // phần tự lưu chưa ghi xong (bản mới hơn đứng sau, ghi đè)
    this.inFlight = [];
    if (!this.dir || !list.length) return;
    for (const [rel, fresh] of this.byRegion(list)) {
      const all = new Map(this.readRegion(rel).map((c) => [`${c.cx},${c.cz}`, c]));
      for (const c of fresh) all.set(`${c.cx},${c.cz}`, c);
      this.write(rel, this.encodeRegion([...all.values()]));
    }
  }

  // ---- rương, lò, vật phẩm rơi ----
  /** (8a) Nhà người chơi tự lưu (/structure save) + mốc vùng làng. */
  loadCustoms(): { list: CustomStructure[]; cuts: number[] } {
    return this.readJson("structures.json", { list: [], cuts: [] });
  }

  saveCustoms(c: { list: readonly CustomStructure[]; cuts: number[] }): void {
    this.write("structures.json", JSON.stringify(c));
  }

  loadEntities(): SavedEntities {
    return this.readJson<SavedEntities>("entities.json", { blocks: [], items: [] });
  }

  saveEntities(e: SavedEntities): void {
    this.write("entities.json", JSON.stringify(e));
  }

  // ---- người chơi, tài khoản ----
  loadPlayer(name: string): PlayerSave | null {
    const k = name.toLowerCase();
    return this.dir ? this.readJson<PlayerSave | null>(join("players", `${k}.json`), null) : (this.memPlayers.get(k) ?? null);
  }

  savePlayer(p: PlayerSave): void {
    const k = p.name.toLowerCase();
    if (!this.dir) this.memPlayers.set(k, JSON.parse(JSON.stringify(p)) as PlayerSave);
    else this.write(join("players", `${k}.json`), JSON.stringify(p));
  }

  /** Kiểm tra mật khẩu; tên chưa có tài khoản thì tạo mới. */
  login(name: string, password: string): "ok" | "created" | "wrong" {
    const k = name.toLowerCase(), a = this.accounts.get(k);
    if (a) {
      const want = Buffer.from(a.hash, "hex"), got = hashPw(password, a.salt);
      return got.length === want.length && timingSafeEqual(got, want) ? "ok" : "wrong";
    }
    const salt = randomBytes(16).toString("hex");
    this.accounts.set(k, { name, salt, hash: hashPw(password, salt).toString("hex") });
    this.write("accounts.json", JSON.stringify([...this.accounts.values()], null, 1));
    return "created";
  }
}
