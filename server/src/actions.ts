// Hành động của người chơi (server kiểm tra rồi áp dụng): đào xong một ô, chuột phải (mở bàn chế tạo /
// rương / lò, cửa, cuốc đất, xô, đặt block), ăn, giáp mòn, chết. Từ chối thì gửi lại ô thật để
// client bỏ phần đã đoán trước.
import {
  B, BLOCKS, PLAYER, breakAt, canPlace, doorUpper, isLiquidId, isReplaceable, itemDef, mergeChest, placeCells, placementCells,
  playerBox, stack, toolWear, type NetHit, type BlockEntities,
} from "../../shared/src/index.js";
import type { Containers } from "./containers.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerTicker } from "./ticker.js";
import type { ServerWorld } from "./serverWorld.js";

const REACH_FLY = 12; // như client khi bay (Giai đoạn 5b: chỉ quản trị viên)
const USABLE = new Set<number>([B.WORKBENCH, B.CHEST, B.FURNACE, B.DOOR]);

export class Actions {
  constructor(
    private readonly w: ServerWorld,
    private readonly ticker: ServerTicker,
    private readonly entities: BlockEntities,
    private readonly containers: Containers,
    private readonly items: ServerItems,
  ) {}

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

  /** Người chơi báo đã đào xong ô (x, y, z). (Thời gian đào kiểm ở 5c.) */
  dig(p: ServerPlayer, x: number, y: number, z: number): void {
    const cell = this.w.getCell(x, y, z), id = cell & 255;
    if (!this.inReach(p, x, y, z) || cell <= 0 || isLiquidId(id) || BLOCKS[id]!.hardness === Infinity) {
      this.correct(p, [{ x, y, z }]);
      return;
    }
    const tool = p.heldTool();
    if (id === B.CHEST || id === B.FURNACE) {
      this.containers.closeAt(x, y, z);
      for (const s of this.entities.remove(x, y, z, id)) this.items.pop(s, x, y, z);
    }
    this.ticker.spawnDrops(breakAt(this.ticker.acc, x, y, z, this.ticker.startFalling), tool);
    const wear = toolWear(id, tool);
    if (wear > 0) p.inv.damageSlot("main", p.inv.selected, wear);
    p.invDirty = true;
  }

  /** Chuột phải. hit: ô đang nhắm; src: nguồn chất lỏng nhắm khi cầm xô rỗng. */
  use(p: ServerPlayer, hit: NetHit | null, src: { x: number; y: number; z: number } | null, sneaking: boolean, yaw: number): void {
    if (p.dead) return;
    const held = p.inv.held, def = held ? itemDef(held.item) : undefined;
    if (held?.item === "bucket") return this.fillBucket(p, src);
    if (!hit || !this.inReach(p, hit.x, hit.y, hit.z)) return;
    const cell = this.w.getCell(hit.x, hit.y, hit.z), id = cell & 255;
    if (cell < 0) return;
    if (!sneaking && USABLE.has(id)) return this.useBlock(p, hit.x, hit.y, hit.z, cell);
    if (def?.tool?.kind === "hoe") {
      if ((id === B.DIRT || id === B.GRASS) && this.w.getCell(hit.x, hit.y + 1, hit.z) === B.AIR) {
        this.ticker.acc.setCell(hit.x, hit.y, hit.z, B.FARMLAND, 0);
        p.inv.damageSlot("main", p.inv.selected, 1);
        p.invDirty = true;
      } else this.correct(p, [hit]);
      return;
    }
    if (def?.liquid !== undefined) return this.emptyBucket(p, hit, def.liquid);
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
    } else if (id === B.CHEST || id === B.FURNACE) this.containers.open(p, x, y, z);
    else if (id === B.DOOR) {
      const lowerY = doorUpper(cell >> 8) ? y - 1 : y;
      for (const yy of [lowerY, lowerY + 1]) {
        const c = this.w.getCell(x, yy, z);
        if ((c & 255) === B.DOOR) this.ticker.acc.setCell(x, yy, z, B.DOOR, (c >> 8) ^ 4);
      }
    }
  }

  private place(p: ServerPlayer, t: NetHit, cell: number, sneaking: boolean, yaw: number): void {
    const held = p.inv.held;
    const places = held ? itemDef(held.item)?.places : undefined;
    const into = isReplaceable(cell & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const cells = places === undefined ? null : placementCells(places, x, y, z, t.nx, t.ny, t.nz, yaw);
    const get = (a: number, b: number, c: number): number => this.w.getCell(a, b, c);
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
    const c = this.w.getCell(src.x, src.y, src.z), id = c & 255;
    if (c < 0 || !isLiquidId(id) || ((c >> 8) & 15) !== 0) return this.correct(p, [src]);
    this.ticker.acc.setCell(src.x, src.y, src.z, B.AIR, 0);
    this.swapHeld(p, id === B.WATER ? "water_bucket" : "lava_bucket");
  }

  private emptyBucket(p: ServerPlayer, t: NetHit, liquid: number): void {
    const into = isReplaceable(this.w.getCell(t.x, t.y, t.z) & 255);
    const x = into ? t.x : t.x + t.nx, y = into ? t.y : t.y + t.ny, z = into ? t.z : t.z + t.nz;
    const cur = this.w.getCell(x, y, z);
    if (cur < 0 || y < 1 || y > 127 || !isReplaceable(cur & 255)) return this.correct(p, [{ x, y, z }]);
    if (cur > 0 && !isLiquidId(cur & 255)) this.ticker.spawnDrops([{ id: cur & 255, meta: cur >> 8, forced: true, x, y, z }], null);
    this.ticker.acc.setCell(x, y, z, liquid, 0);
    this.swapHeld(p, "bucket");
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

  /** Ăn xong món đang cầm (đói / no do client tính đến 5c). Súp trả lại bát. */
  eat(p: ServerPlayer): void {
    const food = p.inv.held ? itemDef(p.inv.held.item)?.food : undefined;
    if (!food || p.dead) return;
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

  armorWear(p: ServerPlayer, n: number): void {
    if (!Number.isInteger(n) || n <= 0 || n > 20) return;
    for (let i = 0; i < 4; i++) p.inv.damageSlot("armor", i, n);
    p.invDirty = true;
  }

  died(p: ServerPlayer): void {
    if (p.dead) return;
    p.dead = true;
    this.containers.close(p);
    this.items.scatter(p.inv.takeAll(), p.x, p.y, p.z);
    p.invDirty = true;
  }
}
