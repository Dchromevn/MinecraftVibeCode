// Đồng bộ block với server (Giai đoạn 5a): client tự sinh địa hình theo seed; khi bắt đầu sinh một
// chunk thì đăng ký với server, server gửi danh sách ô đã sửa của chunk đó và mọi thay đổi sau này.
// Ô đến trước khi chunk sinh xong được giữ chờ rồi áp vào ngay lúc chunk vào thế giới.
import { blockIndex, chunkKey, type BlockId, type Chunk, type World } from "../../../shared/src/index.js";
import type { Connection } from "./connection.js";

export class WorldSync {
  /** chunk chưa sinh xong → [chỉ số, cell, ...] chờ áp. */
  private readonly pending = new Map<number, number[]>();
  private readonly generating = new Set<number>();
  private add: number[] = [];
  private remove: number[] = [];

  constructor(
    private readonly world: World,
    private readonly conn: Connection,
    private readonly onChange: (x: number, y: number, z: number) => void,
  ) {}

  genStart(cx: number, cz: number): void {
    this.generating.add(chunkKey(cx, cz));
    this.add.push(cx, cz);
  }

  removed(cx: number, cz: number): void {
    const k = chunkKey(cx, cz);
    this.pending.delete(k);
    this.generating.delete(k);
    this.remove.push(cx, cz);
  }

  /** Chunk vừa sinh xong: ghi các ô đã sửa đang chờ (chưa có mesh nên không cần dựng lại). */
  added(c: Chunk): void {
    const k = chunkKey(c.cx, c.cz);
    this.generating.delete(k);
    const p = this.pending.get(k);
    if (!p) return;
    this.pending.delete(k);
    for (let i = 0; i < p.length; i += 2) {
      c.data[p[i]!] = p[i + 1]! & 255;
      c.meta[p[i]!] = p[i + 1]! >> 8;
    }
    c.modified = true;
  }

  private set(cx: number, cz: number, index: number, cell: number): void {
    const x = cx * 16 + (index & 15), z = cz * 16 + ((index >> 4) & 15), y = index >> 8;
    if (this.world.getChunk(cx, cz)) {
      if (this.world.setBlock(x, y, z, (cell & 255) as BlockId, cell >> 8)) this.onChange(x, y, z);
      return;
    }
    const k = chunkKey(cx, cz);
    if (!this.generating.has(k)) return;
    let p = this.pending.get(k);
    if (!p) this.pending.set(k, (p = []));
    p.push(index, cell);
  }

  /** Gói "chunk": các ô đã sửa của một chunk. */
  chunk(cx: number, cz: number, cells: number[]): void {
    for (let i = 0; i + 1 < cells.length; i += 2) this.set(cx, cz, cells[i]!, cells[i + 1]!);
  }

  /** Gói "blocks": [x, y, z, cell, ...]. */
  blocks(list: number[]): void {
    for (let i = 0; i + 3 < list.length; i += 4) {
      const x = list[i]!, y = list[i + 1]!, z = list[i + 2]!;
      this.set(x >> 4, z >> 4, blockIndex(x & 15, y, z & 15), list[i + 3]!);
    }
  }

  /** Gửi đăng ký / hủy đăng ký gom lại (gọi mỗi khung hình). */
  flush(): void {
    if (!this.add.length && !this.remove.length) return;
    this.conn.send({ t: "sub", add: this.add, remove: this.remove });
    this.add = [];
    this.remove = [];
  }
}
