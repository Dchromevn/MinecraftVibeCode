// Hành động của người chơi (server kiểm tra rồi áp dụng): đào xong một ô, chuột phải (mở bàn chế tạo /
// rương / lò, cửa, cuốc đất, xô, đặt block), ăn, giáp mòn, chết. Từ chối thì gửi lại ô thật để
// client bỏ phần đã đoán trước. 7a: giường (ngủ, đặt điểm hồi sinh), bột xương, ném trứng.
import {
  B, BLOCKS, DIM, HUNGER, NET, PLAYER, addExhaustion, breakAt, canPlace, digRate, doorUpper, isDoor, isFullSolid, isLiquidId, isReplaceable, isSwitch,
  isUsableBlock, itemDef, mergeChest, placeCells, XP, canHarvest, randInt, isAnvil,
  planPlace,
  playerBox, stack, toolWear, type NetHit, type BlockEntities,
} from "../../shared/src/index.js";
import { Enchanting } from "./enchanting.js";
import { Workstations } from "./workstations.js";
import type { Containers } from "./containers.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerTicker } from "./ticker.js";
import type { ServerWorld } from "./serverWorld.js";

const REACH_FLY = 12; // như client khi bay (Giai đoạn 5b: chỉ quản trị viên)
/** Ô quanh một khối khung cổng có thể là lòng cổng: 6 mặt, rồi 8 ô chéo trong mặt phẳng đứng (khối ở góc khung). */
const FRAME_NEAR: readonly (readonly [number, number, number])[] = [
  [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
];

export class Actions {
  /** Được sửa block ở cột (x, z) không — vùng an toàn quanh điểm hồi sinh (6a; Game đặt, tự báo người chơi). */
  canEdit: (p: ServerPlayer, x: number, z: number) => boolean = () => true;
  /** (7a) chuột phải vào giường (Clock.useBed); ném trứng (Archery.throwEgg) — Game gắn. */
  onBed: (p: ServerPlayer, x: number, y: number, z: number, cell: number) => void = () => undefined;
  onThrow: (p: ServerPlayer) => void = () => undefined;
  /** (7b) block bị phá (đá nhiễm ra mọt đá; 10d1: khối vàng làm người lợn tức); (10d1) mở rương; TNT bị châm bằng bật lửa. */
  onBroken: (p: ServerPlayer, id: number, x: number, y: number, z: number) => void = () => undefined;
  onOpen: (p: ServerPlayer, id: number, x: number, y: number, z: number) => void = () => undefined;
  onSpecial: (p: ServerPlayer, x: number, y: number, z: number, cell: number) => void = () => undefined; // (10d2) mỏ neo hồi sinh, đá nam châm
  onTnt: (p: ServerPlayer, x: number, y: number, z: number) => void = () => undefined;
  /** (7c) Đổ xô cá: thả con cá ra (x, y, z). */
  onFish: (key: string, x: number, y: number, z: number) => void = () => undefined;
  /** (10a) Cõi (Vực Lửa: nước bốc hơi); châm lửa ở ô trống trong khung đá vỏ chai → cổng (true nếu thành cổng). */
  dim = 0;
  onIgnite: (x: number, y: number, z: number) => boolean = () => false;
  /** (7d) Chuột phải hàng rào / tường: buộc các con đang dắt (true = đã xử lý). */
  onFence: (p: ServerPlayer, x: number, y: number, z: number, id: number) => boolean = () => false;

  constructor(
    private readonly w: ServerWorld,
    private readonly ticker: ServerTicker,
    private readonly entities: BlockEntities,
    private readonly containers: Containers,
    private readonly items: ServerItems,
  ) {
    this.enchanting = new Enchanting(w, containers, items);
    this.stations = new Workstations(w, containers, items);
  }

  /** (8b3) Đe, đá mài. */
  readonly stations: Workstations;

  /** (8b2) Bàn phù phép. */
  readonly enchanting: Enchanting;

  private reach(p: ServerPlayer): number {
    return (p.flying ? REACH_FLY : PLAYER.REACH) + 1.5;
  }

  private inReach(p: ServerPlayer, x: number, y: number, z: number): boolean {
    return !p.dead && p.distTo(x, y, z) <= this.reach(p);
  }

  /** Gửi lại giá trị thật của các ô (client đã đoán sai). */
  private correct(p: ServerPlayer, cells: { x: number; y: number; z: number }[]): void {
    const list: number[] = [];
    for (const c of cells) {
      const v = this.w.getCell(c.x, c.y, c.z);
      if (v >= 0) list.push(c.x, c.y, c.z, v);
    }
    if (list.length) p.send({ t: "blocks", list });
  }

  /** Bắt đầu đào ô (x, y, z): ghi lại thời điểm để kiểm tra thời gian đào (5c). */
  digStart(p: ServerPlayer, x: number, y: number, z: number): void {
    if (this.inReach(p, x, y, z)) p.digging = { x, y, z, at: Date.now() };
  }

  /**
   * Đào đủ thời gian chưa: thời gian cần theo công thức đào (công cụ đang cầm, dưới nước, trên không — theo
   * trạng thái server), cho phép nhanh hơn tới DIG_TIME_FACTOR (trễ mạng). Quản trị viên đang bay: phá ngay.
   */
  private dugLongEnough(p: ServerPlayer, x: number, y: number, z: number, id: number): boolean {
    if (p.flying && p.admin) return true;
    const rate = digRate(id, { tool: p.heldTool(), headInWater: p.state.headInWater, onGround: p.state.onGround, aqua: !!p.inv.armor[0]?.ench?.aqua_affinity });
    if (rate === Infinity) return true;
    const d = p.digging;
    if (!d || d.x !== x || d.y !== y || d.z !== z || rate <= 0) return false;
    return (Date.now() - d.at) / 1000 >= NET.DIG_TIME_FACTOR / rate - NET.DIG_SLACK_S;
  }

  /** Người chơi báo đã đào xong ô (x, y, z): kiểm tầm với, block, thời gian đào. */
  dig(p: ServerPlayer, x: number, y: number, z: number): void {
    const cell = this.w.getCell(x, y, z), id = cell & 255;
    if (!this.canEdit(p, x, z) || !this.inReach(p, x, y, z) || cell <= 0 || isLiquidId(id) || BLOCKS[id]!.hardness === Infinity || !this.dugLongEnough(p, x, y, z, id)) {
      this.correct(p, [{ x, y, z }]);
      return;
    }
    p.digging = null;
    if (!p.flying) addExhaustion(p.state, HUNGER.DIG);
    const tool = p.heldTool();
    if (id === B.CHEST || id === B.FURNACE) {
      this.containers.closeAt(x, y, z);
      for (const s of this.entities.remove(x, y, z, id)) this.items.pop(s, x, y, z);
    }
    this.ticker.spawnDrops(breakAt(this.ticker.acc, x, y, z, this.ticker.startFalling), tool);
    this.onBroken(p, id, x, y, z);
    const orb = XP.ORE[BLOCKS[id]!.key]; // (8b2) quặng cho kinh nghiệm (không khi Cảm ứng tơ)
    if (orb && !tool?.ench?.silk_touch && canHarvest(id, tool)) {
      const n = randInt(Math.random, orb[0], orb[1]);
      if (n > 0) this.items.pop(stack(XP.ORB_KEY, n), x, y, z);
    }
    const wear = toolWear(id, tool);
    if (wear > 0) p.inv.damageSlot("main", p.inv.selected, wear);
    p.invDirty = true;
  }

  /** Chuột phải. hit: ô đang nhắm; src: nguồn chất lỏng nhắm khi cầm xô rỗng. */
  use(p: ServerPlayer, hit: NetHit | null, src: { x: number; y: number; z: number } | null, sneaking: boolean, yaw: number): void {
    if (p.dead) return;
    const held = p.inv.held, def = held ? itemDef(held.item) : undefined;
    if (held?.item === "bucket") return this.fillBucket(p, src);
    if (def?.use === "throw") return this.onThrow(p);
    if (!hit || !this.inReach(p, hit.x, hit.y, hit.z)) return;
    const cell = this.w.getCell(hit.x, hit.y, hit.z), id = cell & 255;
    if (cell < 0) return;
    if (!sneaking && this.onFence(p, hit.x, hit.y, hit.z, id)) return; // (7d) buộc / gỡ dây dắt ở hàng rào
    if (!sneaking && isUsableBlock(id)) return this.useBlock(p, hit.x, hit.y, hit.z, cell);
    if (id === B.LODESTONE && (held?.item === "compass" || held?.item === "lodestone_compass")) return this.onSpecial(p, hit.x, hit.y, hit.z, cell); // (10d2)
    if (!this.canEdit(p, hit.x, hit.z)) {
      const n = { x: hit.x + hit.nx, y: hit.y + hit.ny, z: hit.z + hit.nz };
      return this.correct(p, [hit, n, { ...n, y: n.y + 1 }]);
    }
    if (held?.item === "flint_and_steel" || held?.item === "fire_charge") return this.ignite(p, hit); // (10c) cầu lửa nhỏ: châm như bật lửa
    if (def?.use === "block") {
      // bột xương: cây trồng / thân / cây non lớn ngay một bậc
      if (this.ticker.boneMeal(hit.x, hit.y, hit.z)) {
        p.inv.takeHeld(1);
        p.invDirty = true;
      }
      return;
    }
    if (def?.tool?.kind === "hoe") {
      if ((id === B.DIRT || id === B.GRASS) && this.w.getCell(hit.x, hit.y + 1, hit.z) === B.AIR) {
        this.ticker.acc.setCell(hit.x, hit.y, hit.z, B.FARMLAND, 0);
        p.inv.damageSlot("main", p.inv.selected, 1);
        p.invDirty = true;
      } else this.correct(p, [hit]);
      return;
    }
    if (def?.liquid !== undefined) return this.emptyBucket(p, hit, def.liquid, def.releases);
    // cà rốt / khoai tây chỉ trồng khi nhắm mặt trên đất cày; thức ăn khác thì ăn (gói "eat")
    if (def?.food && !(def.places !== undefined && id === B.FARMLAND && hit.ny === 1)) return;
    this.place(p, hit, cell, sneaking, yaw);
  }

  private useBlock(p: ServerPlayer, x: number, y: number, z: number, cell: number): void {
    const id = cell & 255;
    if (id === B.WORKBENCH) {
      this.containers.close(p);
      for (const s of p.inv.setCraftSize(3)) this.items.throwFrom(s, p);
      p.invDirty = true;
      p.send({ t: "open", kind: "workbench", size: 9 });
    } else if (id === B.CHEST || id === B.FURNACE) this.containers.open(p, x, y, z), this.onOpen(p, id, x, y, z);
    else if (id === B.ENCHANTING_TABLE) this.enchanting.open(p, x, y, z); // (8b2)
    else if (isAnvil(id) || id === B.GRINDSTONE || id === B.SMITHING_TABLE) this.stations.open(p, id === B.GRINDSTONE ? "grindstone" : id === B.SMITHING_TABLE ? "smithing" : "anvil", x, y, z); // (8b3, 10d2)
    else if (isSwitch(id)) this.ticker.pressSwitch(x, y, z);
    else if (id === B.BED) this.onBed(p, x, y, z, cell);
    else if (id === B.RESPAWN_ANCHOR) this.onSpecial(p, x, y, z, cell); // (10d2)
    else if (isDoor(id)) {
      const lowerY = doorUpper(cell >> 8) ? y - 1 : y;
      for (const yy of [lowerY, lowerY + 1]) {
        const c = this.w.getCell(x, yy, z);
        if ((c & 255) === id) this.ticker.acc.setCell(x, yy, z, id, (c >> 8) ^ 4);
      }
    }
  }

  /** Bật lửa: đốt lửa lên mặt trên khối đầy (lửa không lan, tự tắt), mất 1 độ bền. */
  private ignite(p: ServerPlayer, t: NetHit): void {
    const fx = t.x + t.nx, fy = t.y + t.ny, fz = t.z + t.nz;
    const lit = (x: number, y: number, z: number): boolean => { // ô trống / lửa là lòng của khung đá vỏ chai đủ → châm cả lòng
      const id = this.w.getCell(x, y, z) & 255;
      return (id === B.AIR || id === B.FIRE) && this.onIgnite(x, y, z);
    };
    // (10a) khung cổng Vực Lửa: ô trước mặt; bấm vào mặt nào của khối khung (cả góc khung) cũng được — thử các ô quanh khối đó
    if (lit(fx, fy, fz) || ((this.w.getCell(t.x, t.y, t.z) & 255) === B.OBSIDIAN && FRAME_NEAR.some(([a, b, c]) => lit(t.x + a, t.y + b, t.z + c)))) {
      this.spend(p);
      return;
    }
    if ((this.w.getCell(t.x, t.y, t.z) & 255) === B.TNT) {
      this.onTnt(p, t.x, t.y, t.z); // châm TNT
      this.spend(p);
      return;
    }
    const above = this.w.getCell(t.x, t.y + 1, t.z);
    const under = this.w.getCell(t.x, t.y, t.z) & 255;
    if (t.ny !== 1 || !(isFullSolid(under) || under === B.SOUL_SAND) || above < 0 || !isReplaceable(above & 255) || isLiquidId(above & 255))
      return this.correct(p, [{ x: t.x, y: t.y + 1, z: t.z }]);
    const soul = under === B.SOUL_SAND || under === B.SOUL_SOIL; // (10b) lửa linh hồn: cháy mãi
    this.ticker.acc.setCell(t.x, t.y + 1, t.z, soul ? B.SOUL_FIRE : B.FIRE, 0);
    if (!soul) this.ticker.scheduleFire(t.x, t.y + 1, t.z);
    this.spend(p);
  }

  /** Bật lửa mất 1 độ bền; (10c) cầu lửa nhỏ mất 1 viên. */
  private spend(p: ServerPlayer): void {
    if (p.inv.held?.item === "fire_charge") p.inv.takeHeld(1);
    else p.inv.damageSlot("main", p.inv.selected, 1);
    p.invDirty = true;
  }

  private place(p: ServerPlayer, t: NetHit, cell: number, sneaking: boolean, yaw: number): void {
    const held = p.inv.held;
    const places = held ? itemDef(held.item)?.places : undefined;
    const into = isReplaceable(cell & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const get = (a: number, b: number, c: number): number => this.w.getCell(a, b, c);
    const fy = typeof t.fy === "number" && Number.isFinite(t.fy) ? t.fy : 0;
    const cells = places === undefined ? null : planPlace(places, { ...t, fy }, yaw, get, held ? itemDef(held.item)?.meta : undefined);
    if (!cells || !canPlace(cells, get, p.flying ? null : playerBox(p))) {
      this.correct(p, [t, { x, y, z }, { x, y: y + 1, z }]);
      return;
    }
    this.ticker.spawnDrops(placeCells(this.ticker.acc, cells, this.ticker.startFalling), null);
    for (const c of cells) this.entities.placed(c.x, c.y, c.z, c.id);
    if (places === B.CHEST && !sneaking)
      for (const m of mergeChest(cells[0]!, get)) this.ticker.acc.setCell(m.x, m.y, m.z, m.id, m.meta);
    p.inv.takeHeld(1);
    p.invDirty = true;
  }

  private fillBucket(p: ServerPlayer, src: { x: number; y: number; z: number } | null): void {
    if (!src || !this.inReach(p, src.x, src.y, src.z)) return;
    if (!this.canEdit(p, src.x, src.z)) return this.correct(p, [src]);
    const c = this.w.getCell(src.x, src.y, src.z), id = c & 255;
    if (c < 0 || !isLiquidId(id) || ((c >> 8) & 15) !== 0) return this.correct(p, [src]);
    this.ticker.acc.setCell(src.x, src.y, src.z, B.AIR, 0);
    this.swapHeld(p, id === B.WATER ? "water_bucket" : "lava_bucket");
  }

  private emptyBucket(p: ServerPlayer, t: NetHit, liquid: number, fish?: string): void {
    const into = isReplaceable(this.w.getCell(t.x, t.y, t.z) & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const cur = this.w.getCell(x, y, z);
    if (cur < 0 || y < 1 || y > 127 || !isReplaceable(cur & 255)) return this.correct(p, [{ x, y, z }]);
    if (cur > 0 && !isLiquidId(cur & 255)) this.ticker.spawnDrops([{ id: cur & 255, meta: cur >> 8, forced: true, x, y, z }], null);
    if (this.dim === DIM.NETHER && liquid === B.WATER) { // (10a) Vực Lửa: nước bốc hơi (xô vẫn rỗng, cá trong xô mất)
      p.send({ t: "fx", kind: "smoke", x: x + 0.5, y: y + 0.5, z: z + 0.5 });
      return this.swapHeld(p, "bucket");
    }
    this.ticker.acc.setCell(x, y, z, liquid, 0);
    this.swapHeld(p, "bucket");
    if (fish) this.onFish(fish, x + 0.5, y + 0.1, z + 0.5);
  }

  /** Đổi 1 món đang cầm thành món khác (cả chồng 1 thì đổi tại chỗ; không thì vào túi, đầy thì rơi ra). */
  private swapHeld(p: ServerPlayer, key: string): void {
    const inv = p.inv;
    if ((inv.held?.count ?? 0) <= 1) inv.main[inv.selected] = stack(key);
    else {
      inv.takeHeld(1);
      const left = inv.add(stack(key));
      if (left) this.items.throwFrom(left, p);
    }
    p.invDirty = true;
  }

  /** Ăn xong món đang cầm (đói / no đã cộng trong bước vật lý, movement.ts): trừ món ăn, súp trả lại bát. */
  consumeHeldFood(p: ServerPlayer): void {
    const food = p.inv.held ? itemDef(p.inv.held.item)?.food : undefined;
    if (!food) return;
    p.inv.takeHeld(1);
    if (food.returns) this.swapHeldEmpty(p, food.returns);
    p.invDirty = true;
  }

  private swapHeldEmpty(p: ServerPlayer, key: string): void {
    if (!p.inv.held) p.inv.main[p.inv.selected] = stack(key);
    else {
      const left = p.inv.add(stack(key));
      if (left) this.items.throwFrom(left, p);
    }
  }

  /** Người chơi vừa chết (server tính): đóng rương / lò, rải hết đồ quanh chỗ chết. */
  died(p: ServerPlayer): void {
    this.containers.close(p);
    this.items.scatter(p.inv.takeAll(), p.x, p.y, p.z);
    p.invDirty = true;
  }
}
