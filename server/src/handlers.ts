// Gói tin JSON từ người chơi đã vào game (tách từ game.ts ở Giai đoạn 7a để file dưới 300 dòng): kiểm tra kiểu dữ
// liệu rồi chuyển tới đúng bộ phận.
import { applyInvAction, itemDef, stack, type ClientMsg } from "../../shared/src/index.js";
import { subscribe } from "./sync.js";
import type { Game } from "./game.js";
import type { ServerPlayer } from "./player.js";

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function handleMessage(g: Game, p: ServerPlayer, m: ClientMsg): void {
  const r = g.realmOf(p); // (10a) cõi người chơi đang ở
  switch (m.t) {
    case "ping":
      if (num(m.c)) p.send({ t: "pong", c: m.c, chunks: r.w.world.chunks.size, tickMs: Math.round(g.tickMs * 10) / 10 });
      return;
    case "sub":
      if ((m.d ?? 0) !== p.dim) return; // (10a) gói của cõi cũ (gửi trước khi client biết đã chuyển cõi): bỏ
      return subscribe(r.w, p, m.add, m.remove);
    case "attack":
      if (num(m.id) && num(m.lag)) r.combat.attack(p, m.id, m.lag);
      return;
    case "hitMob": // (7a)
      if (num(m.id) && num(m.lag)) r.life.interact.attack(p, m.id, m.lag);
      return;
    case "useMob":
      if (num(m.id)) r.life.interact.use(p, m.id);
      return;
    case "rideInv": // (7d) phím túi đồ khi đang cưỡi thú có rương
      return r.life.riding.openRidden(p);
    case "trade": // (8a)
      if (num(m.mob) && num(m.i)) r.life.villagers.trade(p, m.mob, m.i, m.all === true);
      return;
    case "tradeClose":
      p.trading = 0;
      return;
    case "enchant": // (8b2)
      if (num(m.i)) r.actions.enchanting.enchant(p, m.i);
      return;
    case "anvilTake": // (8b3)
      return r.actions.stations.anvilTake(p, typeof m.name === "string" ? m.name : "");
    case "grindTake":
      return r.actions.stations.grindTake(p);
    case "smithTake": // (10d2)
      return r.actions.stations.smithTake(p);
    case "wake":
      return g.clock.wake(p);
    case "chat":
      return g.chat.message(p, m.text);
    case "draw":
      return r.archery.draw(p);
    case "shoot":
      if (num(m.power)) r.archery.shoot(p, m.power);
      return;
    case "digStart":
      if ([m.x, m.y, m.z].every(num)) r.actions.digStart(p, m.x, m.y, m.z);
      return;
    case "dig":
      if ([m.x, m.y, m.z].every(num)) r.actions.dig(p, m.x, m.y, m.z);
      return;
    case "use":
      return r.actions.use(p, m.hit, m.src, !!m.sneaking, num(m.yaw) ? m.yaw : p.yaw);
    case "inv": {
      if (!m.a || typeof m.a !== "object") return;
      p.ack = num(m.seq) ? m.seq : p.ack;
      if ((m.a.t === "select" && m.a.n !== p.inv.selected) || m.a.t === "swapHands") {
        r.combat.heldChanged(p); // đổi đồ: đặt lại hồi đòn, thôi kéo cung
        r.archery.cancel(p);
      }
      for (const s of applyInvAction(p.inv, m.a)) r.items.throwFrom(s, p);
      if (m.a.t === "close") r.containers.close(p);
      p.invDirty = true;
      r.containers.changed(p);
      return;
    }
    case "give":
      if (p.admin && typeof m.item === "string" && itemDef(m.item) && num(m.count)) {
        p.inv.add(stack(m.item, Math.max(1, Math.min(64, Math.floor(m.count)))));
        p.invDirty = true;
      }
      return;
  }
}
