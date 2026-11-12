// Tick thế giới trên server (20 lần / giây): random tick quanh người chơi, chất lỏng chảy, lò nung,
// cát / sỏi rơi, giẫm đất cày. Chuyển từ client (Giai đoạn 4b–4c) lên server ở Giai đoạn 5a.
import {
  B, CROPS, LIQUIDS, LiquidSim, NET, RANDOM_TICK, blockDrops, createFalling, furnaceLit, isFarmPlant, randomTick, settle,
  stepFalling, type BlockAccess, type BlockEntities, type Dropped, type FallingBlock, type Rng, type TickWorld,
} from "../../shared/src/index.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerWorld } from "./serverWorld.js";

const SECTIONS = 8;
const DT = 1 / NET.SERVER_TICK_RATE;

export class ServerTicker {
  speed: number = RANDOM_TICK.SPEED;
  readonly liquids: LiquidSim;
  /** Đổi block do người chơi / tick: dựng lại chất lỏng xung quanh. */
  readonly acc: BlockAccess;
  private readonly tw: TickWorld;
  private readonly falling: FallingBlock[] = [];

  constructor(
    private readonly w: ServerWorld,
    private readonly entities: BlockEntities,
    private readonly items: ServerItems,
    private readonly rng: Rng,
    /** Cát / sỏi bắt đầu rơi (để client vẽ). */
    private readonly onFall: (x: number, y: number, z: number, cell: number) => void,
  ) {
    const drop = (id: number, meta: number, x: number, y: number, z: number): void => {
      for (const s of blockDrops(id, meta, null, rng, true)) items.pop(s, x, y, z);
    };
    this.liquids = new LiquidSim({ getCell: (x, y, z) => w.getCell(x, y, z), setCell: (x, y, z, id, m) => void w.setCell(x, y, z, id, m), drop });
    this.acc = {
      getCell: (x, y, z) => w.getCell(x, y, z),
      setCell: (x, y, z, id, meta) => {
        if (w.setCell(x, y, z, id, meta)) this.liquids.notify(x, y, z);
      },
    };
    this.tw = { ...this.acc, light: (x, y, z) => w.lightAt(x, y, z), drop };
  }

  /** Bắt đầu rơi (block đã gỡ khỏi thế giới) — dùng làm startFalling cho breakAt / placeCells / settle. */
  readonly startFalling = (x: number, y: number, z: number, id: number, meta: number): void => {
    this.falling.push(createFalling(x, y, z, id, meta));
    this.onFall(x, y, z, id | (meta << 8));
  };

  /** Block rơi ra (phá, mất chỗ bám): tạo vật phẩm. */
  spawnDrops(list: Dropped[], tool: Parameters<typeof blockDrops>[2]): void {
    for (const d of list)
      for (const s of blockDrops(d.id, d.meta, d.forced ? null : tool, this.rng, d.forced)) this.items.pop(s, d.x, d.y, d.z);
  }

  /** Người chơi rơi xuống đất cày từ độ cao fall: xác suất (fall − 0.5) thành đất. */
  trample(x: number, y: number, z: number, fall: number): void {
    if (fall <= CROPS.TRAMPLE_MIN_FALL || (this.w.getCell(x, y, z) & 255) !== B.FARMLAND) return;
    if (this.rng() >= fall - CROPS.TRAMPLE_MIN_FALL) return;
    const above = this.w.getCell(x, y + 1, z);
    if (isFarmPlant(above & 255)) {
      this.tw.drop(above & 255, above >> 8, x, y + 1, z);
      this.acc.setCell(x, y + 1, z, B.AIR, 0);
    }
    this.acc.setCell(x, y, z, B.DIRT, 0);
  }

  /** Một tick. centers: chunk chứa người chơi. */
  tick(centers: readonly { cx: number; cz: number }[]): void {
    for (const c of this.w.fresh.splice(0)) this.liquids.scanChunk(c.cx, c.cz, c.data);
    this.entities.tickFurnaces(DT, (e, lit) => {
      const cell = this.w.getCell(e.x, e.y, e.z), m = cell >> 8;
      if ((cell & 255) !== B.FURNACE || furnaceLit(m) === lit) return;
      this.acc.setCell(e.x, e.y, e.z, B.FURNACE, lit ? m | 4 : m & ~4);
    });
    // random tick: mỗi chunk quanh người chơi (không lặp chunk dùng chung)
    const done = new Set<string>();
    const r = RANDOM_TICK.RADIUS;
    for (const c of centers)
      for (let cz = c.cz - r; cz <= c.cz + r; cz++)
        for (let cx = c.cx - r; cx <= c.cx + r; cx++) {
          const k = `${cx},${cz}`;
          if (done.has(k)) continue;
          done.add(k);
          if (!this.w.world.getChunk(cx, cz)?.light) continue; // chưa có ánh sáng: bỏ qua
          for (let sy = 0; sy < SECTIONS; sy++)
            for (let n = 0; n < this.speed; n++) {
              const i = Math.floor(this.rng() * 4096);
              randomTick(this.tw, cx * 16 + (i & 15), sy * 16 + (i >> 8), cz * 16 + ((i >> 4) & 15), this.rng);
            }
        }
    this.liquids.step(LIQUIDS.MAX_UPDATES_PER_TICK);
    this.stepFalling();
  }

  private stepFalling(): void {
    this.falling.sort((a, b) => a.y - b.y); // khối thấp trước để khối chồng lên đáp đúng thứ tự
    for (let i = 0; i < this.falling.length; i++) {
      const f = this.falling[i]!;
      const r = stepFalling(f, DT, this.acc);
      if (r.kind === "falling") continue;
      this.falling.splice(i--, 1);
      if (r.kind === "lost") {
        this.spawnDrops([{ id: f.id, meta: f.meta, forced: true, x: f.x, y: Math.floor(f.y), z: f.z }], null);
        continue;
      }
      this.spawnDrops([...r.dropped, ...settle(this.acc, [{ x: f.x, y: r.y, z: f.z }], this.startFalling)], null);
    }
  }
}
