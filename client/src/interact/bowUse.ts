// Kéo cung (Giai đoạn 6b): giữ chuột phải khi cầm cung (còn mũi tên) thì kéo — báo server lúc bắt đầu kéo, thả chuột thì
// gửi lực (server lấy lực nhỏ hơn giữa client và đồng hồ server). Đổi đồ giữa chừng thì thôi kéo.
// (8b) Nỏ: giữ chuột phải 1.25 giây để lên dây (server lấy 1 mũi tên, nỏ thành "nỏ đã lên dây"), bấm chuột phải lần nữa để bắn.
import { ARCHERY, CROSSBOW, bowPower, crossbowCharge, bowStage, hasArrow, type Inventory } from "../../../shared/src/index.js";

export interface BowNet {
  draw(): void;
  shoot(power: number): void;
}

/** Cung hoặc nỏ. */
export const isBowLike = (item: string | undefined): boolean => item === "bow" || item === "crossbow" || item === "crossbow_loaded";

export class BowUse {
  /** Thời gian đã kéo (giây); 0 = không kéo. */
  private t = 0;
  drawing = false;
  private crossbow = false;
  private loadSent = false;

  constructor(private readonly net: BowNet) {}

  /** Lực hiện tại (0..1). */
  get power(): number {
    return this.drawing && !this.crossbow ? bowPower(this.t) : 0;
  }

  /** Mức hình cung / nỏ đang kéo (0..2), hoặc −1 khi không kéo. */
  get stage(): number {
    if (!this.drawing) return -1;
    return this.crossbow ? Math.min(2, Math.floor((this.t / CROSSBOW.CHARGE_S) * 3)) : bowStage(this.power);
  }

  /** Đang giữ chuột phải với cung / nỏ trên tay; fresh = vừa bấm. */
  hold(dt: number, inv: Inventory, item: string, fresh: boolean): void {
    if (item === "crossbow_loaded") { // nỏ đã lên dây: bấm là bắn
      if (fresh) this.net.shoot(1);
      return;
    }
    if (!this.drawing) {
      if (!hasArrow(inv) || (item === "crossbow" && !fresh && this.loadSent)) return;
      this.drawing = true;
      this.crossbow = item === "crossbow";
      this.loadSent = false;
      this.t = 0;
      this.net.draw();
    }
    this.t += dt;
    if (this.crossbow && this.t >= crossbowCharge(inv.held) && !this.loadSent) { // (8b2) Nạp nhanh // lên dây xong (giữ tiếp không bắn)
      this.loadSent = true;
      this.net.shoot(1);
      this.drawing = false;
    }
  }

  /** Thả chuột: cung bắn nếu đủ lực tối thiểu; nỏ chưa lên dây xong thì thôi. */
  release(): void {
    this.loadSent = false;
    if (!this.drawing) return;
    const p = this.power, crossbow = this.crossbow;
    this.drawing = false;
    this.t = 0;
    if (!crossbow && p >= ARCHERY.MIN_POWER) this.net.shoot(p);
  }

  /** Thôi kéo không bắn (đổi đồ, chết, bay). */
  cancel(): void {
    this.drawing = false;
    this.t = 0;
  }
}
