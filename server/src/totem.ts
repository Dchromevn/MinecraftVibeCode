// (8c) Vật tổ bất tử: mỗi tick server đặt cờ "đang cầm" (tay chính hoặc tay phụ) vào trạng thái sinh tồn — hàm hurt dùng chung sẽ cứu
// mạng khi có cờ; vừa cứu xong (totemPop) thì tiêu vật tổ (tay chính trước, như Minecraft) và gửi hiệu ứng cho người xung quanh.
import { NET } from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";

const TOTEM = "totem_of_undying";

export function totemTick(p: ServerPlayer, all: readonly ServerPlayer[]): void {
  const s = p.state, inv = p.inv;
  if (s.totemPop > 0) {
    s.totemPop = 0;
    if (inv.held?.item === TOTEM) inv.main[inv.selected] = null;
    else if (inv.offhand[0]?.item === TOTEM) inv.offhand[0] = null;
    p.invDirty = true;
    p.stateDirty = true;
    for (const o of all)
      if (Math.hypot(o.x - p.x, o.z - p.z) <= NET.PLAYER_VIEW) o.send({ t: "fx", kind: "totem", x: p.x, y: p.y, z: p.z, n: o === p ? 1 : 0 });
  }
  const has = inv.held?.item === TOTEM || inv.offhand[0]?.item === TOTEM ? 1 : 0;
  if (s.totem !== has) {
    s.totem = has;
    p.stateDirty = true;
  }
}
