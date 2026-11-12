// Phiên chơi sinh tồn (Giai đoạn 4a): túi đồ, vật phẩm rơi, hotbar + thanh sinh tồn, màn hình
// túi đồ (E), giáp (độ bền), chết → văng đồ → hồi sinh. Lệnh debug lấy đồ khi ?debug=1.
import * as THREE from "three";
import {
  B, BlockEntities, FURNACE_RULES, Inventory, PLAYER, STARTER_KIT, chestHalf, chestPartner, chestRules, doorUpper, itemDef, joinChest,
  mulberry32, splitChest, stack, type ChestEntity, type FurnaceEntity, type RayHit, type Rng, type World,
} from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import { WorldTicker } from "./worldTicker.js";
import type { Atlas } from "../atlas.js";
import { ItemEntities } from "../items/itemEntities.js";
import type { PlayerController } from "../player/playerController.js";
import { lockPointer, type FlyCamera } from "../flyCamera.js";
import { InventoryScreen } from "../ui/inventoryScreen.js";
import { SurvivalHud } from "../ui/survivalHud.js";

export class Session {
  readonly inv = new Inventory();
  readonly rng: Rng = mulberry32((Date.now() >>> 0) ^ 0x5eed);
  readonly items: ItemEntities;
  readonly hud: SurvivalHud;
  readonly screen: InventoryScreen;
  readonly entities: BlockEntities;
  readonly ticker: WorldTicker;
  private deathShown = false;
  private readonly dir = new THREE.Vector3();

  constructor(
    scene: THREE.Scene, atlas: Atlas, private readonly world: World, private readonly player: PlayerController,
    private readonly fly: FlyCamera, private readonly canvas: HTMLCanvasElement, private readonly camera: THREE.Camera,
    private readonly spawn: { x: number; y: number; z: number },
    private readonly onChange: (x: number, y: number, z: number) => void,
  ) {
    this.entities = new BlockEntities(world.seed);
    this.items = new ItemEntities(scene, atlas, (x, y, z) => world.getCell(x, y, z), this.rng);
    this.ticker = new WorldTicker(world, this.entities, this.rng, onChange, (s, x, y, z) => this.items.pop(s, x, y, z));
    this.hud = new SurvivalHud(() => this.respawn());
    this.screen = new InventoryScreen(
      this.inv,
      (st) => {
        this.camera.getWorldDirection(this.dir);
        this.items.throw(st, this.camera.position, this.dir);
      },
      () => lockPointer(this.canvas),
    );
    document.addEventListener("keydown", (e) => {
      if (this.player.state.dead) return;
      if (e.code === "KeyE" && (this.fly.locked || this.screen.open)) {
        e.preventDefault();
        if (this.screen.open) this.screen.close();
        else this.openScreen("inventory");
      } else if (e.code === "Escape" && this.screen.open) this.screen.close();
    });
  }

  /** Block ở (x, y, z) vừa đổi do người chơi (đặt, phá, xô, cát rơi): dựng lại mesh và cho chất lỏng chảy lại. */
  blockChanged(x: number, y: number, z: number): void {
    this.onChange(x, y, z);
    this.ticker.liquids.notify(x, y, z);
  }

  /** Mở túi đồ (lưới 2x2) hoặc bàn chế tạo (lưới 3x3). */
  openScreen(mode: "inventory" | "workbench"): void {
    if (this.player.state.dead || this.screen.open) return;
    document.exitPointerLock();
    this.screen.show(mode);
  }

  /** Chuột phải vào block có chức năng: bàn chế tạo, rương, lò nung, cửa. true nếu đã xử lý. */
  useBlock(t: RayHit): boolean {
    const id = t.cell & 255, meta = t.cell >> 8;
    if (id === B.WORKBENCH) this.openScreen("workbench");
    else if (id === B.CHEST) this.openChest(t.x, t.y, t.z, t.cell);
    else if (id === B.FURNACE) this.openFurnace(t.x, t.y, t.z);
    else if (id === B.DOOR) {
      // mở / đóng cả hai nửa
      const lowerY = doorUpper(meta) ? t.y - 1 : t.y;
      for (const y of [lowerY, lowerY + 1]) {
        const m = this.world.getMeta(t.x, y, t.z);
        if (this.world.getBlock(t.x, y, t.z) === B.DOOR && this.world.setBlock(t.x, y, t.z, B.DOOR, m ^ 4)) this.onChange(t.x, y, t.z);
      }
    } else return false;
    return true;
  }

  private openContainer(mode: "chest" | "furnace", title: string, size: number, furnace: FurnaceEntity | undefined, onClose: () => void): void {
    if (this.player.state.dead || this.screen.open) return;
    document.exitPointerLock();
    this.screen.showContainer(mode, {
      title, size, furnace,
      onClose: () => {
        onClose();
        this.inv.ext = [];
        this.inv.extRules = null;
      },
    });
  }

  private openChest(x: number, y: number, z: number, cell: number): void {
    const e = this.entities.obtain(x, y, z, B.CHEST) as ChestEntity;
    const p = chestPartner(cell, x, y, z);
    if (p && this.world.getBlock(p.x, p.y, p.z) === B.CHEST) {
      const pe = this.entities.obtain(p.x, p.y, p.z, B.CHEST) as ChestEntity;
      const [a, b] = chestHalf(cell >> 8) === 1 ? [e, pe] : [pe, e];
      const all = joinChest(a.slots, b.slots);
      this.inv.ext = all;
      this.inv.extRules = chestRules(all.length);
      this.openContainer("chest", STR.chestLarge, all.length, undefined, () => splitChest(all, a.slots, b.slots));
      return;
    }
    this.inv.ext = e.slots;
    this.inv.extRules = chestRules(e.slots.length);
    this.openContainer("chest", STR.blocks.chest ?? "", e.slots.length, undefined, () => undefined);
  }

  private openFurnace(x: number, y: number, z: number): void {
    const e = this.entities.obtain(x, y, z, B.FURNACE) as FurnaceEntity;
    this.inv.ext = e.slots;
    this.inv.extRules = FURNACE_RULES;
    this.openContainer("furnace", STR.blocks.furnace ?? "", 3, e, () => undefined);
  }

  /** Bộ đồ thử khi mới vào game (không phát lại khi hồi sinh). */
  giveStarterKit(): void {
    for (const [k, n] of STARTER_KIT) this.inv.add(stack(k, n));
  }

  /** Debug (?debug=1): thêm vật phẩm vào túi. */
  give(key: string, count = 1): boolean {
    if (!itemDef(key)) return false;
    const left = this.inv.add(stack(key, count));
    return left === null;
  }

  respawn(): void {
    this.player.respawn(this.spawn.x, this.spawn.y, this.spawn.z);
    this.deathShown = false;
    this.hud.showDeath(false);
    lockPointer(this.canvas);
  }

  update(dt: number): void {
    const s = this.player.state;
    // giáp: điểm + độ cứng cho công thức; mỗi lần giáp đỡ đòn thì mọi món mất 1 độ bền
    const a = this.inv.armorStats();
    s.armorPoints = a.points;
    s.armorToughness = a.toughness;
    if (s.armorHits > 0) {
      for (let i = 0; i < 4; i++) this.inv.damageSlot("armor", i, s.armorHits);
      s.armorHits = 0;
    }
    if (s.dead && !this.deathShown) {
      this.deathShown = true;
      this.screen.close();
      this.items.scatter(this.inv.takeAll(), s.x, s.y, s.z);
      this.hud.showDeath(true);
      document.exitPointerLock();
    }
    // khi bay vẫn nhặt đồ quanh camera
    const p = this.player.flying
      ? { x: this.camera.position.x, y: this.camera.position.y - PLAYER.EYE_HEIGHT, z: this.camera.position.z }
      : s;
    this.items.update(dt, s.dead ? null : p, this.inv);
    if (!this.player.flying) this.ticker.trample(s);
    this.ticker.update(dt, p.x, p.z);
    this.hud.update(this.inv, s);
    if (this.screen.open) this.screen.refresh();
  }
}
