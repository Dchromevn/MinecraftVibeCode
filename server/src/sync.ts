// Gửi dữ liệu cho người chơi (tách từ game.ts, Giai đoạn 6a): đăng ký chunk, mỗi tick phát thay đổi block,
// trạng thái của chính mình, vị trí / đồ cầm / giáp của người khác, vật phẩm rơi, túi đồ.
import { NET, chunkKey, encodePlayers } from "../../shared/src/index.js";
import type { Movement } from "./movement.js";
import type { ServerPlayer } from "./player.js";
import type { ServerItems } from "./serverItems.js";
import type { ServerWorld } from "./serverWorld.js";
import { totemTick } from "./totem.js";

const num = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v);

/** Gói "sub": chunk client cần / bỏ. Luôn trả lời (kể cả rỗng): client chờ gói này rồi mới dựng mesh. */
export function subscribe(w: ServerWorld, p: ServerPlayer, add: unknown, remove: unknown): void {
  const pairs = (v: unknown): number[] => (Array.isArray(v) ? v.filter(num).slice(0, 4000) : []);
  const rem = pairs(remove);
  for (let i = 0; i + 1 < rem.length; i += 2) p.subs.delete(chunkKey(rem[i]!, rem[i + 1]!));
  const a = pairs(add);
  for (let i = 0; i + 1 < a.length; i += 2) {
    const cx = a[i]!, cz = a[i + 1]!;
    p.subs.add(chunkKey(cx, cz));
    p.send({ t: "chunk", cx, cz, cells: w.editsOf(cx, cz) });
  }
}

/** Cuối mỗi tick: thay đổi block (ch = [x, y, z, cell, ...]) cho người giữ chunk đó, rồi phần riêng từng người. */
export function sendTick(all: ServerPlayer[], ch: number[], movement: Movement, items: ServerItems, extra?: (p: ServerPlayer) => void): void {
  if (ch.length)
    for (const p of all) {
      const list: number[] = [];
      for (let i = 0; i < ch.length; i += 4)
        if (p.subs.has(chunkKey(ch[i]! >> 4, ch[i + 2]! >> 4))) list.push(ch[i]!, ch[i + 1]!, ch[i + 2]!, ch[i + 3]!);
      if (list.length) p.send({ t: "blocks", list });
    }
  for (const p of all) {
    totemTick(p, all); // (8c) vật tổ bất tử: cờ đang cầm, tiêu vật tổ vừa cứu mạng
    movement.tick(p); // trạng thái do server tính → chủ nhân
    const near = all.filter((o) => o !== p && Math.hypot(o.x - p.x, o.z - p.z) <= NET.PLAYER_VIEW);
    if (near.length) p.conn.send(encodePlayers(near.map((o) => o.pos())));
    for (const o of near) {
      const look = o.look(), key = JSON.stringify(look);
      if (p.knownLooks.get(o.id) === key) continue;
      p.knownLooks.set(o.id, key);
      p.send({ t: "look", id: o.id, ...look });
    }
    items.sync(p);
    extra?.(p); // mũi tên (6b)
    p.flushInv();
  }
}
