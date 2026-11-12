// Người chơi phía server: kết nối, túi đồ (nguồn sự thật), vị trí / trạng thái client báo lên
// (tin tạm đến 5c), chunk đang theo dõi, rương / lò đang mở, vật phẩm rơi đã gửi.
import {
  Inventory, PLAYER, itemDef, snapshotInv, type HeldTool, type PlayerView, type ServerMsg,
} from "../../shared/src/index.js";
import type { ContainerSession } from "./containers.js";

/** Kết nối tới client (WebSocket thật, hoặc giả lập trong bộ kiểm tra). */
export interface Conn {
  send(data: string): void;
  close(): void;
}

export class ServerPlayer {
  readonly inv = new Inventory();
  /** Số thứ tự lệnh túi đồ cuối cùng đã áp dụng (client dùng để đoán trước / sửa). */
  ack = 0;
  invDirty = true;
  x = 0;
  y = 0;
  z = 0;
  yaw = 0;
  pitch = 0;
  flying = false;
  sneaking = false;
  swing = 0;
  health: number = PLAYER.MAX_HEALTH;
  dead = false;
  /** Chunk client đang giữ (khóa chunkKey): nhận danh sách block đã sửa và thay đổi block. */
  readonly subs = new Set<number>();
  container: ContainerSession | null = null;
  /** Vật phẩm rơi client đang thấy: id → chữ ký vị trí / số lượng lần gửi trước. */
  readonly knownItems = new Map<number, string>();

  constructor(readonly id: number, readonly name: string, readonly conn: Conn) {}

  send(msg: ServerMsg): void {
    this.conn.send(JSON.stringify(msg));
  }

  /** Gửi trạng thái túi đồ nếu có đổi. */
  flushInv(): void {
    if (!this.invDirty) return;
    this.invDirty = false;
    this.send({ t: "inv", s: snapshotInv(this.inv, this.ack) });
  }

  eye(): [number, number, number] {
    return [this.x, this.y + (this.sneaking ? PLAYER.SNEAK_EYE_HEIGHT : PLAYER.EYE_HEIGHT), this.z];
  }

  /** Khoảng cách từ mắt tới tâm ô (x, y, z). */
  distTo(x: number, y: number, z: number): number {
    const [ex, ey, ez] = this.eye();
    return Math.hypot(x + 0.5 - ex, y + 0.5 - ey, z + 0.5 - ez);
  }

  /** Hướng nhìn (vectơ đơn vị) theo yaw / pitch như camera client. */
  lookDir(): { x: number; y: number; z: number } {
    const c = Math.cos(this.pitch);
    return { x: -Math.sin(this.yaw) * c, y: Math.sin(this.pitch), z: -Math.cos(this.yaw) * c };
  }

  heldTool(): HeldTool | null {
    const s = this.inv.held;
    const t = s ? itemDef(s.item)?.tool : undefined;
    return t ? { kind: t.kind, tier: t.tier } : null;
  }

  view(): PlayerView {
    return {
      id: this.id, x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch, sneaking: this.sneaking,
      swing: this.swing, held: this.inv.held?.item ?? null, armor: this.inv.armor.map((s) => s?.item ?? null), dead: this.dead,
    };
  }
}
