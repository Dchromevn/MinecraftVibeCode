// Tick thế giới phía client (Giai đoạn 4b–4c; Giai đoạn 5 chuyển lên server): random tick 20 lần /
// giây cho các chunk quanh người chơi, chất lỏng chảy, lò nung chạy cả khi đóng, giẫm đất cày.
import {
  B, BlockEntities, CROPS, LIQUIDS, LiquidSim, RANDOM_TICK, blockDrops, furnaceLit, isFarmPlant, randomTick,
  type BlockId, type ItemStack, type PlayerState, type Rng, type TickWorld, type World,
} from "../../../shared/src/index.js";

const SECTIONS = 8;

export class WorldTicker {
  /** Số ô random tick mỗi đoạn mỗi tick (đổi được bằng lệnh debug). */
  speed: number = RANDOM_TICK.SPEED;
  /** Chất lỏng: gọi liquids.notify khi block đổi để nước / dung nham chảy lại. */
  readonly liquids: LiquidSim;
  private acc = 0;
  private readonly tw: TickWorld;
  /** Chunk đã quét tìm chất lỏng hở (chunk gỡ khỏi bộ nhớ rồi tải lại thì quét lại). */
  private readonly scanned = new WeakSet<object>();

  constructor(
    private readonly world: World,
    readonly entities: BlockEntities,
    private readonly rng: Rng,
    onChange: (x: number, y: number, z: number) => void,
    pop: (s: ItemStack, x: number, y: number, z: number) => void,
  ) {
    const drop = (id: number, meta: number, x: number, y: number, z: number): void => {
      for (const s of blockDrops(id, meta, null, rng, true)) pop(s, x, y, z);
    };
    this.liquids = new LiquidSim({
      getCell: (x, y, z) => world.getCell(x, y, z),
      setCell: (x, y, z, id, meta) => {
        if (world.setBlock(x, y, z, id as BlockId, meta)) onChange(x, y, z);
      },
      drop,
    });
    this.tw = {
      getCell: (x, y, z) => world.getCell(x, y, z),
      setCell: (x, y, z, id, meta) => {
        if (!world.setBlock(x, y, z, id as BlockId, meta)) return;
        onChange(x, y, z);
        this.liquids.notify(x, y, z); // lá rụng, cây bật ra cạnh nước...
      },
      light: (x, y, z) => world.lightAt(x, y, z),
      drop,
    };
  }

  /** Giẫm lên đất cày: xác suất (quãng rơi − 0.5) biến thành đất. */
  trample(s: PlayerState): void {
    if (s.landFall <= CROPS.TRAMPLE_MIN_FALL) return;
    const x = Math.floor(s.x), y = Math.floor(s.y - 0.01), z = Math.floor(s.z);
    if (this.world.getBlock(x, y, z) !== B.FARMLAND || this.rng() >= s.landFall - CROPS.TRAMPLE_MIN_FALL) return;
    const above = this.world.getBlock(x, y + 1, z);
    if (isFarmPlant(above)) {
      this.tw.drop(above, this.world.getMeta(x, y + 1, z), x, y + 1, z);
      this.tw.setCell(x, y + 1, z, B.AIR, 0);
    }
    this.tw.setCell(x, y, z, B.DIRT, 0);
  }

  update(dt: number, px: number, pz: number): void {
    // lò nung: đổi trạng thái cháy thì đổi dữ liệu phụ (mặt lò sáng + ánh sáng 13)
    this.entities.tickFurnaces(dt, (e, lit) => {
      const m = this.world.getMeta(e.x, e.y, e.z);
      if (this.world.getBlock(e.x, e.y, e.z) !== B.FURNACE || furnaceLit(m) === lit) return;
      this.tw.setCell(e.x, e.y, e.z, B.FURNACE, lit ? m | 4 : m & ~4);
    });
    this.acc = Math.min(this.acc + dt, 0.25);
    const step = 1 / RANDOM_TICK.TPS;
    const ccx = Math.floor(px / 16), ccz = Math.floor(pz / 16), r = RANDOM_TICK.RADIUS;
    while (this.acc >= step) {
      this.acc -= step;
      for (let cz = ccz - r; cz <= ccz + r; cz++)
        for (let cx = ccx - r; cx <= ccx + r; cx++) {
          const c = this.world.getChunk(cx, cz);
          if (!c?.light) continue; // chưa có ánh sáng (chưa dựng mesh): bỏ qua
          // chunk mới vào vùng mô phỏng: mạch nước / dung nham sinh sẵn bắt đầu chảy
          if (!this.scanned.has(c)) {
            this.scanned.add(c);
            this.liquids.scanChunk(c.cx, c.cz, c.data);
          }
          for (let sy = 0; sy < SECTIONS; sy++)
            for (let k = 0; k < this.speed; k++) {
              const n = Math.floor(this.rng() * 4096);
              randomTick(this.tw, cx * 16 + (n & 15), sy * 16 + (n >> 8), cz * 16 + ((n >> 4) & 15), this.rng);
            }
        }
      this.liquids.step(LIQUIDS.MAX_UPDATES_PER_TICK);
    }
  }
}
