// Nối client với server (Giai đoạn 5a): chuyển gói tin tới đúng bộ phận (block, người chơi khác, túi
// đồ, rương / lò, vật phẩm rơi, cát rơi), gửi vị trí 20 lần / giây, gom đăng ký chunk, báo mất kết nối.
import * as THREE from "three";
import { NET, PLAYER, type ServerMsg, type World } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { Session } from "../game/session.js";
import type { InteractNet, Interaction } from "../interact/interaction.js";
import type { PlayerController } from "../player/playerController.js";
import { STR } from "../strings.js";
import type { ChunkManager } from "../world/chunkManager.js";
import type { Connection } from "./connection.js";
import { RemotePlayers } from "./remotePlayers.js";
import { WorldSync } from "./worldSync.js";

export interface NetDeps {
  world: World;
  chunks: ChunkManager;
  scene: THREE.Scene;
  atlas: Atlas;
  camera: THREE.Camera;
  player: PlayerController;
  yaw: () => number;
  pitch: () => number;
}

export class NetClient {
  readonly sync: WorldSync;
  readonly remote: RemotePlayers;
  /** Tăng mỗi lần vung tay (người khác thấy hoạt ảnh). */
  swings = 0;
  private moveT = 0;
  private session: Session | null = null;
  private interact: Interaction | null = null;

  constructor(private readonly conn: Connection, private readonly d: NetDeps) {
    this.sync = new WorldSync(d.world, conn, (x, _y, z) => d.chunks.onBlockChanged(x, z));
    d.chunks.onGenStart = (cx, cz) => this.sync.genStart(cx, cz);
    d.chunks.onAdded = (c) => this.sync.added(c);
    d.chunks.onRemoved = (cx, cz) => this.sync.removed(cx, cz);
    this.remote = new RemotePlayers(d.scene, d.atlas);
    conn.onClose = () => {
      const el = document.createElement("div");
      el.id = "disconnected";
      el.textContent = STR.disconnected;
      document.body.appendChild(el);
      document.exitPointerLock();
    };
  }

  /** Bắt đầu nhận gói tin (sau khi đã tạo session / interaction). */
  start(session: Session, interact: Interaction, early: ServerMsg[]): void {
    this.session = session;
    this.interact = interact;
    this.conn.listen((m) => this.onMessage(m), early);
  }

  /** Hành động đào / chuột phải / ăn / túi đồ gửi lên server. */
  actions(): InteractNet {
    return {
      dig: (x, y, z) => this.conn.send({ t: "dig", x, y, z }),
      use: (hit, src, sneaking, yaw) => this.conn.send({ t: "use", hit, src, sneaking, yaw }),
      eat: () => this.conn.send({ t: "eat" }),
      act: (a) => this.session?.invSync.act(a),
    };
  }

  private onMessage(m: ServerMsg): void {
    const s = this.session!;
    switch (m.t) {
      case "chunk":
        return this.sync.chunk(m.cx, m.cz, m.cells);
      case "blocks":
        return this.sync.blocks(m.list);
      case "join":
        return this.remote.join(m.id, m.name);
      case "leave":
        return this.remote.leave(m.id);
      case "players":
        return this.remote.apply(m.list);
      case "inv":
        return s.invSync.snapshot(m.s);
      case "open":
        return s.opened(m);
      case "close":
        return s.screen.close();
      case "furnace":
        return s.furnaceProgress(m);
      case "items":
        return s.items.apply(m.up, m.gone);
      case "fall":
        return this.interact!.falling.start(m.x, m.y, m.z, m.cell & 255, m.cell >> 8);
    }
  }

  update(dt: number): void {
    this.sync.flush();
    this.remote.update(dt);
    this.moveT += dt;
    if (this.moveT < 1 / NET.MOVE_HZ) return;
    this.moveT = 0;
    const p = this.d.player, s = p.state, cam = this.d.camera.position;
    // đang bay: vị trí theo camera (chân = mắt − chiều cao mắt)
    const feet = p.flying ? { x: cam.x, y: cam.y - PLAYER.EYE_HEIGHT, z: cam.z } : s;
    this.conn.send({
      t: "move", x: feet.x, y: feet.y, z: feet.z, yaw: this.d.yaw(), pitch: this.d.pitch(), flying: p.flying,
      sneaking: s.sneaking, swing: this.swings, health: s.health, dead: s.dead,
    });
  }
}
