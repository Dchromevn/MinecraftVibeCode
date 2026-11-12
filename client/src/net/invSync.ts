// Túi đồ theo server (Giai đoạn 5a): thao tác áp dụng ngay trên máy (đoán trước) và gửi lên server
// kèm số thứ tự. Khi nhận trạng thái chuẩn: lấy trạng thái đó rồi áp lại các thao tác server chưa
// xác nhận — nên không giật lùi khi bấm nhanh, và luôn khớp server.
import { applyInvAction, restoreInv, type InvAction, type InvSnapshot, type Inventory } from "../../../shared/src/index.js";
import type { Connection } from "./connection.js";

export class InvSync {
  private seq = 0;
  private pending: { seq: number; a: InvAction }[] = [];

  constructor(private readonly inv: Inventory, private readonly conn: Connection) {}

  act(a: InvAction): void {
    applyInvAction(this.inv, a); // đồ vứt ra do server tạo
    this.seq++;
    this.pending.push({ seq: this.seq, a });
    this.conn.send({ t: "inv", seq: this.seq, a });
  }

  snapshot(s: InvSnapshot): void {
    restoreInv(this.inv, s);
    this.pending = this.pending.filter((p) => p.seq > s.ack);
    for (const p of this.pending) applyInvAction(this.inv, p.a);
  }
}
