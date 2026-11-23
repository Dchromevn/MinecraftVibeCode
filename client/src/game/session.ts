// Phiên chơi phía client (Giai đoạn 4a–5a): túi đồ (theo server, đoán trước bằng InvSync), vật phẩm rơi
// (server gửi), hotbar + thanh sinh tồn, màn hình túi đồ (E), bàn chế tạo / rương / lò do server mở.
// Đến 5c máu, đói, giáp đỡ đòn, chết do client tính và báo server (server rải đồ khi chết).
import * as THREE from "three";
import {
  ANVIL_RULES, B, CROPS, ENCHANT_RULES, FURNACE_RULES, GRIND_RULES, SMITH_RULES, Inventory, armorEnchState, chestRules, type FurnaceEntity, type ServerMsg, type World,
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
import { TradeScreen } from "../ui/tradeScreen.js";
import { enchantView, type EnchantInfo } from "../ui/enchantView.js";
import { stationView } from "../ui/stationViews.js";
import { compassState } from "../ui/itemIcons.js";

type OpenMsg = Extract<ServerMsg, { t: "open" }>;

export class Session {
  readonly inv = new Inventory();
  readonly items: ItemEntities;
  readonly hud: SurvivalHud;
  readonly screen: InventoryScreen;
  readonly invSync: InvSync;
  readonly trade: TradeScreen; // (8a) đổi đồ với dân làng
  /** Bản sao trạng thái lò đang mở (server gửi) để vẽ lửa / tiến độ. */
  private readonly furnace: FurnaceEntity = { kind: "furnace", x: 0, y: 0, z: 0, slots: [], burnLeft: 0, burnMax: 0, cook: 0 };
  private deathShown = false;
  /** (8b2) Bàn phù phép đang mở: hạt giống lựa chọn + số giá sách (server gửi). */
  enchantInfo: EnchantInfo = { seed: 0, shelves: 0 };

  constructor(
    scene: THREE.Scene, atlas: Atlas, private readonly world: World, private readonly player: PlayerController,
    private readonly fly: FlyCamera, private readonly canvas: HTMLCanvasElement,
    private spawn: { x: number; y: number; z: number },
    private readonly conn: Connection,
  ) {
    this.items = new ItemEntities(scene, atlas);
    this.invSync = new InvSync(this.inv, conn);
    this.hud = new SurvivalHud(() => this.respawn());
    this.screen = new InventoryScreen(this.inv, (a) => this.invSync.act(a), () => lockPointer(this.canvas));
    this.trade = new TradeScreen(this.inv, (m) => conn.send(m), () => lockPointer(this.canvas));
    document.addEventListener("keydown", (e) => {
      if (this.player.state.dead) return;
      if (this.trade.open && (e.code === "KeyE" || e.code === "Escape")) return void (e.preventDefault(), this.trade.close());
      if (e.code === "KeyE" && (this.fly.locked || this.screen.open)) {
        e.preventDefault();
        if (this.screen.open) this.screen.close();
        else if (this.player.state.rideId) this.conn.send({ t: "rideInv" }); // (7d) đang cưỡi: thú có rương thì server mở rương của thú
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
    this.inv.extRules = m.kind === "furnace" ? FURNACE_RULES : m.kind === "enchant" ? ENCHANT_RULES : m.kind === "anvil" ? ANVIL_RULES
      : m.kind === "grindstone" ? GRIND_RULES : m.kind === "smithing" ? SMITH_RULES : chestRules(m.size);
    this.furnace.slots = this.inv.ext;
    document.exitPointerLock();
    const title = m.kind === "furnace" ? STR.blocks.furnace : m.size > 27 ? STR.chestLarge : STR.blocks.chest;
    this.screen.showContainer(m.kind, {
      title: title ?? "", size: m.size, furnace: m.kind === "furnace" ? this.furnace : undefined,
      view: m.kind === "enchant" ? (slot) => enchantView(this.inv, () => this.enchantInfo, () => this.player.state.xp, slot, (i) => this.conn.send({ t: "enchant", i }))
        : m.kind === "anvil" || m.kind === "grindstone" || m.kind === "smithing" ? (slot) => stationView(m.kind as "anvil", this.inv, () => this.player.state.xp,
          () => this.player.flying && this.player.canFly, slot,
          (name) => this.conn.send(m.kind === "anvil" ? { t: "anvilTake", name } : m.kind === "smithing" ? { t: "smithTake" } : { t: "grindTake" }))
        : undefined,
      onClose: () => {
        this.inv.ext = [];
        this.inv.extRules = null;
      },
    });
  }

  furnaceProgress(m: Extract<ServerMsg, { t: "furnace" }>): void {
    Object.assign(this.furnace, { burnLeft: m.burnLeft, burnMax: m.burnMax, cook: m.cook });
  }

  /** (8a) Server gửi bảng đổi đồ. */
  trades(m: Extract<ServerMsg, { t: "trades" }>): void {
    if (this.player.state.dead) return;
    this.screen.close();
    document.exitPointerLock();
    this.trade.show(m);
  }

  /** Debug (?debug=1, server bật chế độ thử): xin server thêm vật phẩm. */
  give(key: string, count = 1): void {
    this.conn.send({ t: "give", item: key, count });
  }

  /** (7a) Server báo điểm hồi sinh mới (giường / giường mất). */
  setRespawn(p: { x: number; y: number; z: number }): void {
    this.spawn = { x: p.x, y: p.y, z: p.z };
  }

  respawn(): void {
    this.player.requestRespawn(this.spawn); // áp dụng ở bước vật lý kế tiếp, server làm cùng bước
    this.deathShown = false;
    this.hud.showDeath(false);
    lockPointer(this.canvas);
  }

  update(dt: number): void {
    const s = this.player.state;
    // giáp: điểm + độ cứng cho công thức (đoán trước); giáp mòn, chết, giẫm ruộng do server tính (5c)
    const a = this.inv.armorStats();
    s.armorPoints = a.points;
    Object.assign(s, armorEnchState(this.inv.armor)); // (8b2) phù phép giáp (đoán trước như giáp)
    s.armorToughness = a.toughness;
    if (s.dead && !this.deathShown) {
      this.deathShown = true;
      this.screen.close();
      this.trade.ended();
      this.hud.showDeath(true);
      document.exitPointerLock();
    }
    this.items.update(dt);
    Object.assign(compassState, { x: s.x, z: s.z, yaw: this.fly.yaw }); // (10d2) kim la bàn
    this.hud.update(this.inv, s);
    if (this.screen.open) this.screen.refresh();
    this.trade.refresh();
  }
}
