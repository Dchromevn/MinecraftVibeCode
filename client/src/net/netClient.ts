// Nối client với server (Giai đoạn 5a, 5c): chuyển gói tin tới đúng bộ phận (block, người chơi khác, túi đồ,
// rương / lò, vật phẩm rơi, cát rơi), gửi phím bấm từng bước vật lý 20 lần / giây (gói nhị phân), nhận trạng
// thái thật của mình từ server (đoán trước + sửa lại), đo ping (F3), gom đăng ký chunk, báo mất kết nối.
// 6a: gửi đòn đánh (kèm độ trễ để server tua lại), chat; nhận chat, trúng đòn, dịch chuyển.
// 7a: sinh vật (gói nhị phân MOBS, trúng đòn), giờ trong ngày, nằm / rời giường, điểm hồi sinh mới.
import * as THREE from "three";
import {
  BIN, NET, PLAYER, binType, decodeMobs, decodePlayers, decodeState, encodeInput, type PlayerView, type ServerMsg, type World, type CustomStructure,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { Session } from "../game/session.js";
import type { InteractNet, Interaction } from "../interact/interaction.js";
import type { PlayerController } from "../player/playerController.js";
import { showDisconnected } from "../ui/pauseMenu.js";
import type { ChunkManager } from "../world/chunkManager.js";
import type { Connection } from "./connection.js";
import { RemotePlayers } from "./remotePlayers.js";
import type { ClientMobs, MobView } from "../mobs/clientMobs.js";
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
  selfId: number; // (7d) id của mình (đầu dây dắt mình đang cầm)
}

/** Số liệu mạng cho F3. */
export interface NetInfo {
  ping: number;
  serverChunks: number;
  serverTickMs: number;
}

export class NetClient {
  readonly sync: WorldSync;
  readonly remote: RemotePlayers;
  readonly info: NetInfo = { ping: 0, serverChunks: 0, serverTickMs: 0 };
  /** Tăng mỗi lần vung tay (người khác thấy hoạt ảnh). */
  swings = 0;
  private sendT = 0;
  private pingT = 0;
  private session: Session | null = null;
  private interact: Interaction | null = null;
  /** Tin chat / thông báo (6a). */
  onChat: (m: Extract<ServerMsg, { t: "chat" }>) => void = () => undefined;
  /** Ai đó trúng đòn (6a). */
  onHurt: (m: Extract<ServerMsg, { t: "hurt" }>) => void = () => undefined;
  /** (6b) mũi tên, hiệu ứng. */
  onArrows: (m: Extract<ServerMsg, { t: "arrows" }>) => void = () => undefined;
  onFx: (m: Extract<ServerMsg, { t: "fx" }>) => void = () => undefined;
  onFangs: (m: Extract<ServerMsg, { t: "fangs" }>) => void = () => undefined; // (8c) nanh pháp sư
  /** (10a) Đã sang cõi khác (sau khi bỏ chunk / sinh vật / vật phẩm / người khác): worker, mũi tên, bầu trời. */
  onDim: (dim: number) => void = () => undefined;
  /** (7a) sinh vật mới / đổi / mất; trúng đòn; giờ; nằm / dậy; điểm hồi sinh mới. */
  /** Sinh vật phía client (gói MOBS, mobHurt, dây dắt). */
  mobs: ClientMobs | null = null;
  /** (8a) Có nhà tự lưu mới: gửi cho worker sinh chunk. */
  onCustoms: ((list: CustomStructure[], cuts: number[]) => void) | null = null;
  onTime: (time: number) => void = () => undefined;
  /** (9a) Chế độ quản trị của mình đổi. */
  onAdmin: (on: boolean) => void = () => undefined;
  onSleep: (on: boolean) => void = () => undefined;
  onRespawnAt: (p: { x: number; y: number; z: number }) => void = () => undefined;
  /** (7b) TNT bắt đầu cháy ngòi. */
  onTnt: (m: Extract<ServerMsg, { t: "tnt" }>) => void = () => undefined;
  /** Đồ cầm + giáp của người chơi khác (gói "look", chỉ gửi khi đổi). */
  private readonly looks = new Map<number, { held: string | null; off: string | null; armor: (string | null)[] }>();

  constructor(readonly conn: Connection, private readonly d: NetDeps) {
    // thay đổi do server (nước chảy, cây lớn, người khác): việc nền, không chen trước việc tải chunk mới
    this.sync = new WorldSync(d.world, conn, (x, _y, z, light) => d.chunks.onBlockChanged(x, z, { urgent: false, light }));
    d.chunks.onGenStart = (cx, cz) => this.sync.genStart(cx, cz);
    d.chunks.onAdded = (c) => this.sync.added(c);
    d.chunks.onRemoved = (cx, cz) => this.sync.removed(cx, cz);
    d.chunks.isReady = (k) => this.sync.ready(k);
    this.remote = new RemotePlayers(d.scene, d.atlas);
    conn.onClose = showDisconnected; // (9a) bảng báo + nút về menu chính
  }

  /** Bắt đầu nhận gói tin (sau khi đã tạo session / interaction). */
  start(session: Session, interact: Interaction, early: ServerMsg[]): void {
    this.session = session;
    this.interact = interact;
    this.conn.binHandler = (buf) => this.onBinary(buf);
    this.conn.listen((m) => this.onMessage(m), early);
  }

  /** Hành động đào / chuột phải / túi đồ gửi lên server. */
  actions(): InteractNet {
    return {
      // gửi phím bấm mới nhất ngay trước lệnh: server kiểm tra tầm với / chỗ đặt theo đúng chỗ đang đứng
      digStart: (x, y, z) => {
        this.sendInputs();
        this.conn.send({ t: "digStart", x, y, z });
      },
      dig: (x, y, z) => {
        this.sendInputs();
        this.conn.send({ t: "dig", x, y, z });
      },
      use: (hit, src, sneaking, yaw) => {
        this.sendInputs();
        this.conn.send({ t: "use", hit, src, sneaking, yaw });
      },
      act: (a) => this.session?.invSync.act(a),
      draw: () => {
        this.sendInputs();
        this.conn.send({ t: "draw" });
      },
      shoot: (power) => {
        this.sendInputs(); // server bắn theo đúng chỗ đứng / hướng nhìn hiện tại
        this.conn.send({ t: "shoot", power });
      },
    };
  }

  /** Đánh người chơi id: gửi phím bấm mới nhất trước (server xét đúng chỗ đang đứng / hướng nhìn), kèm độ trễ hình
   *  của mục tiêu trên máy này (ping + nội suy) để server tua lại vị trí mục tiêu. */
  attack(id: number): void {
    this.sendInputs();
    this.conn.send({ t: "attack", id, lag: this.info.ping + NET.INTERP_DELAY_MS });
  }

  /** (7a) Đánh sinh vật id (kèm độ trễ hình như attack). */
  hitMob(id: number): void {
    this.sendInputs();
    this.conn.send({ t: "hitMob", id, lag: this.info.ping + NET.INTERP_DELAY_MS });
  }

  /** (7a) Chuột phải vào sinh vật id. */
  useMob(id: number): void {
    this.sendInputs();
    this.conn.send({ t: "useMob", id });
  }

  wake(): void {
    this.conn.send({ t: "wake" });
  }

  chat(text: string): void {
    this.conn.send({ t: "chat", text });
  }

  private onBinary(buf: ArrayBuffer): void {
    const t = binType(buf);
    if (t === BIN.STATE) {
      const st = decodeState(buf);
      if (st) this.d.player.onServerState(st.seq, st.state);
    } else if (t === BIN.PLAYERS) {
      const views: PlayerView[] = decodePlayers(buf).map((p) => {
        const l = this.looks.get(p.id);
        return { ...p, held: l?.held ?? null, off: l?.off ?? null, armor: l?.armor ?? [null, null, null, null] };
      });
      this.remote.apply(views);
    } else if (t === BIN.MOBS) {
      const m = decodeMobs(buf);
      if (m) this.mobs?.apply(m.up, m.gone);
    }
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
        this.looks.delete(m.id);
        return this.remote.leave(m.id);
      case "look":
        return void this.looks.set(m.id, { held: m.held, off: m.off, armor: m.armor });
      case "pong":
        Object.assign(this.info, { ping: Math.round(performance.now() - m.c), serverChunks: m.chunks, serverTickMs: m.tickMs });
        return;
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
      case "chat":
        return this.onChat(m);
      case "admin": // (9a) /admin bật / tắt chế độ quản trị
        return this.onAdmin(m.on);
      case "hurt":
        return this.onHurt(m);
      case "tp":
        return this.d.player.teleport(m.x, m.y, m.z);
      case "shieldOff":
        return this.interact!.shieldOff(m.s);
      case "arrows":
        return this.onArrows(m);
      case "fx":
        return this.onFx(m);
      case "fangs":
        return this.onFangs(m);
      case "dim": // (10a) qua cổng / hồi sinh từ Vực Lửa: dựng lại thế giới của cõi mới
        this.sync.reset(m.dim);
        this.d.chunks.reset();
        this.remote.clear();
        this.looks.clear();
        this.mobs?.clear();
        s.items.clear();
        this.onDim(m.dim);
        return this.d.player.teleport(m.x, m.y, m.z);
      case "mobHurt":
        return this.mobs?.hurt(m.id, m.crit);
      case "leashes": // (7d)
        return this.mobs?.leashes.apply(m.list);
      case "trades": // (8a)
        return s.trades(m);
      case "tradeEnd":
        return s.trade.ended();
      case "enchantInfo": // (8b2)
        return void (s.enchantInfo = { seed: m.seed, shelves: m.shelves });
      case "customs":
        return this.onCustoms?.(m.list, m.cuts);
      case "time":
        return this.onTime(m.time);
      case "sleep":
        return this.onSleep(m.on);
      case "respawnAt":
        return this.onRespawnAt(m);
      case "tnt":
        return this.onTnt(m);
    }
  }

  /** (7d) Cho ClientMobs: thú đang được cưỡi (người cưỡi vẽ ở đâu) và vị trí người chơi (đầu dây dắt). */
  mobView(): MobView {
    const riders = new Map(this.remote.rides), s = this.d.player.state;
    if (s.rideId && !s.rideBack) riders.set(s.rideId, { x: s.x, y: s.y, z: s.z, yaw: this.d.yaw() });
    return { riders, self: s.rideId, player: (id) => (id === this.d.selfId ? { x: s.x, y: s.y, z: s.z } : this.remote.position(id)) };
  }

  update(dt: number): void {
    this.sync.flush();
    this.remote.update(dt);
    this.sendT += dt;
    if (this.sendT >= 1 / NET.MOVE_HZ) this.sendInputs();
    this.pingT += dt;
    if (this.pingT >= NET.PING_S) {
      this.pingT = 0;
      this.conn.send({ t: "ping", c: performance.now() });
    }
  }

  /** Gửi các bước vật lý server chưa xác nhận (gói nhị phân); đang bay (quản trị viên) thì gửi vị trí. */
  private sendInputs(): void {
    this.sendT = 0;
    const p = this.d.player, cam = this.d.camera.position;
    const fly = p.flying ? { x: cam.x, y: cam.y - PLAYER.EYE_HEIGHT, z: cam.z } : null;
    const pending = p.prediction.unacked(NET.MAX_PENDING_INPUTS);
    if (!pending && !fly) return;
    this.conn.sendBin(encodeInput({
      firstSeq: pending?.firstSeq ?? p.prediction.seq + 1, frames: pending?.frames ?? [],
      pitch: this.d.pitch(), yaw: this.d.yaw(), swing: this.swings, fly,
    }));
  }
}
