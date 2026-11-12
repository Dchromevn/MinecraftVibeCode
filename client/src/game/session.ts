// Phiên chơi phía client (Giai đoạn 4a–5a): túi đồ (theo server, đoán trước bằng InvSync), vật phẩm rơi
// (server gửi), hotbar + thanh sinh tồn, màn hình túi đồ (E), bàn chế tạo / rương / lò do server mở.
// Đến 5c máu, đói, giáp đỡ đòn, chết do client tính và báo server (server rải đồ khi chết).
import * as THREE from "three";
import {
  B, CROPS, FURNACE_RULES, Inventory, chestRules, type FurnaceEntity, type ServerMsg, type World,
} from "../../../shared/src/index.js";
import { STR } from "../strings.js";
import type { Atlas } from "../atlas.js";
import { ItemEntities } from "../items/itemEntities.js";
import type { Connection } from "../net/connection.js";
import { InvSync } from "../net/invSync.js";
import type { PlayerController } from "../player/playerController.js";
import { lockPointer, type FlyCamera } from "../flyCamera.js";
import { InventoryScreen } from "../ui/inventoryScreen.js";
import { SurvivalHud } from "../ui/survivalHud.js";

type OpenMsg = Extract<ServerMsg, { t: "open" }>;

export class Session {
  readonly inv = new Inventory();
  readonly items: ItemEntities;
  readonly hud: SurvivalHud;
  readonly screen: InventoryScreen;
  readonly invSync: InvSync;
  /** Bản sao trạng thái lò đang mở (server gửi) để vẽ lửa / tiến độ. */
  private readonly furnace: FurnaceEntity = { kind: "furnace", x: 0, y: 0, z: 0, slots: [], burnLeft: 0, burnMax: 0, cook: 0 };
  private deathShown = false;

  constructor(
    scene: THREE.Scene, atlas: Atlas, private readonly world: World, private readonly player: PlayerController,
    private readonly fly: FlyCamera, private readonly canvas: HTMLCanvasElement,
    private readonly spawn: { x: number; y: number; z: number },
    private readonly conn: Connection,
  ) {
    this.items = new ItemEntities(scene, atlas);
    this.invSync = new InvSync(this.inv, conn);
    this.hud = new SurvivalHud(() => this.respawn());
    this.screen = new InventoryScreen(this.inv, (a) => this.invSync.act(a), () => lockPointer(this.canvas));
    document.addEventListener("keydown", (e) => {
      if (this.player.state.dead) return;
      if (e.code === "KeyE" && (this.fly.locked || this.screen.open)) {
        e.preventDefault();
        if (this.screen.open) this.screen.close();
        else this.openScreen("inventory");
      } else if (e.code === "Escape" && this.screen.open) this.screen.close();
    });
  }

  /** Mở túi đồ (lưới 2x2) hoặc bàn chế tạo (lưới 3x3, server cho mở). */
  openScreen(mode: "inventory" | "workbench"): void {
    if (this.player.state.dead) return;
    if (this.screen.open && mode === "inventory") return;
    document.exitPointerLock();
    this.screen.show(mode);
  }

  /** Server cho mở bàn chế tạo / rương / lò. */
  opened(m: OpenMsg): void {
    if (this.player.state.dead) return;
    if (m.kind === "workbench") return this.openScreen("workbench");
    this.inv.ext = new Array(m.size).fill(null);
    this.inv.extRules = m.kind === "furnace" ? FURNACE_RULES : chestRules(m.size);
    this.furnace.slots = this.inv.ext;
    document.exitPointerLock();
    const title = m.kind === "furnace" ? STR.blocks.furnace : m.size > 27 ? STR.chestLarge : STR.blocks.chest;
    this.screen.showContainer(m.kind, {
      title: title ?? "", size: m.size, furnace: m.kind === "furnace" ? this.furnace : undefined,
      onClose: () => {
        this.inv.ext = [];
        this.inv.extRules = null;
      },
    });
  }

  furnaceProgress(m: Extract<ServerMsg, { t: "furnace" }>): void {
    Object.assign(this.furnace, { burnLeft: m.burnLeft, burnMax: m.burnMax, cook: m.cook });
  }

  /** Debug (?debug=1, server bật chế độ thử): xin server thêm vật phẩm. */
  give(key: string, count = 1): void {
    this.conn.send({ t: "give", item: key, count });
  }

  respawn(): void {
    this.player.respawn(this.spawn.x, this.spawn.y, this.spawn.z);
    this.deathShown = false;
    this.hud.showDeath(false);
    lockPointer(this.canvas);
  }

  update(dt: number): void {
    const s = this.player.state;
    // giáp: điểm + độ cứng cho công thức; giáp đỡ đòn thì báo server trừ độ bền
    const a = this.inv.armorStats();
    s.armorPoints = a.points;
    s.armorToughness = a.toughness;
    if (s.armorHits > 0) {
      this.conn.send({ t: "armorWear", n: s.armorHits });
      s.armorHits = 0;
    }
    if (s.dead && !this.deathShown) {
      this.deathShown = true;
      this.screen.close();
      this.conn.send({ t: "died" }); // server rải đồ quanh chỗ chết
      this.hud.showDeath(true);
      document.exitPointerLock();
    }
    // giẫm đất cày: server tung xác suất
    if (!this.player.flying && s.landFall > CROPS.TRAMPLE_MIN_FALL) {
      const x = Math.floor(s.x), y = Math.floor(s.y - 0.01), z = Math.floor(s.z);
      if (this.world.getBlock(x, y, z) === B.FARMLAND) this.conn.send({ t: "trample", x, y, z, fall: s.landFall });
    }
    this.items.update(dt);
    this.hud.update(this.inv, s);
    if (this.screen.open) this.screen.refresh();
  }
}
