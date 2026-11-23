// Bảng F3 (Giai đoạn 5c): ping, số gói / KB mỗi giây hai chiều, số lần bị server sửa vị trí, số bước chờ xác
// nhận, chunk client / server, thời gian một tick của server. Bật / tắt bằng F3 (chặn phím tìm kiếm của trình duyệt).
import type { NetClient } from "../net/netClient.js";
import type { PlayerController } from "../player/playerController.js";
import { STR } from "../strings.js";

export class NetDebug {
  shown = false;
  private last = { t: performance.now(), inP: 0, inB: 0, outP: 0, outB: 0 };
  private rate = { inP: 0, inB: 0, outP: 0, outB: 0 };

  constructor(private readonly net: NetClient, private readonly player: PlayerController, private readonly clientChunks: () => number) {
    document.addEventListener("keydown", (e) => {
      if (e.code !== "F3") return;
      e.preventDefault();
      this.shown = !this.shown;
    });
  }

  /** Dòng hiển thị (gọi khoảng 1 lần / giây cùng HUD); rỗng khi tắt. */
  lines(): string[] {
    const s = this.net.conn.stats, now = performance.now(), dt = Math.max(0.001, (now - this.last.t) / 1000);
    this.rate = {
      inP: (s.inPackets - this.last.inP) / dt, inB: (s.inBytes - this.last.inB) / dt,
      outP: (s.outPackets - this.last.outP) / dt, outB: (s.outBytes - this.last.outB) / dt,
    };
    this.last = { t: now, inP: s.inPackets, inB: s.inBytes, outP: s.outPackets, outB: s.outBytes };
    if (!this.shown) return [STR.netHint];
    const r = this.rate, i = this.net.info, p = this.player.prediction;
    return [
      `${STR.netPing}: ${i.ping} ms · ${STR.netIn}: ${r.inP.toFixed(0)} ${STR.netPackets}/s ${(r.inB / 1024).toFixed(1)} KB/s · ${STR.netOut}: ${r.outP.toFixed(0)} ${STR.netPackets}/s ${(r.outB / 1024).toFixed(1)} KB/s`,
      `${STR.netCorrections}: ${this.player.corrections} · ${STR.netPending}: ${Math.max(0, p.seq - p.lastAck)} · chunk ${STR.netClient} ${this.clientChunks()} / server ${i.serverChunks} · ${STR.netTick}: ${i.serverTickMs} ms`,
    ];
  }
}
