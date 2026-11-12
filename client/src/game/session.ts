// Phiên chơi sinh tồn (Giai đoạn 4a): túi đồ, vật phẩm rơi, hotbar + thanh sinh tồn, màn hình
// túi đồ (E), giáp (độ bền), chết → văng đồ → hồi sinh. Lệnh debug lấy đồ khi ?debug=1.
import * as THREE from "three";
import { Inventory, PLAYER, itemDef, mulberry32, stack, type Rng, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { ItemEntities } from "../items/itemEntities.js";
import type { PlayerController } from "../player/playerController.js";
import { lockPointer, type FlyCamera } from "../flyCamera.js";
import { InventoryScreen } from "../ui/inventoryScreen.js";
import { SurvivalHud } from "../ui/survivalHud.js";
import { nearWorkbench } from "../../../shared/src/index.js";

export class Session {
  readonly inv = new Inventory();
  readonly rng: Rng = mulberry32((Date.now() >>> 0) ^ 0x5eed);
  readonly items: ItemEntities;
  readonly hud: SurvivalHud;
  readonly screen: InventoryScreen;
  private deathShown = false;
  private readonly dir = new THREE.Vector3();

  constructor(
    scene: THREE.Scene, atlas: Atlas, private readonly world: World, private readonly player: PlayerController,
    private readonly fly: FlyCamera, private readonly canvas: HTMLCanvasElement, private readonly camera: THREE.Camera,
    private readonly spawn: { x: number; y: number; z: number },
  ) {
    this.items = new ItemEntities(scene, atlas, (x, y, z) => world.getCell(x, y, z), this.rng);
    this.hud = new SurvivalHud(() => this.respawn());
    this.screen = new InventoryScreen(
      this.inv,
      () => {
        const s = this.player.state;
        return nearWorkbench((x, y, z) => world.getBlock(x, y, z), s.x, s.y + 1, s.z);
      },
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
        if (!this.screen.open) document.exitPointerLock();
        this.screen.toggle();
      } else if (e.code === "Escape" && this.screen.open) this.screen.close();
    });
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
    this.hud.update(this.inv, s);
    if (this.screen.open) this.screen.refresh();
  }
}
