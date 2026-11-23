// Đi giữa các cõi (Giai đoạn 10a; như Minecraft): đứng trong khối cổng Vực Lửa đủ PORTAL.WAIT_S giây (quản trị viên đang bay: ngay) thì
// sang cõi kia ở tọa độ × 8 / ÷ 8; tìm cổng có sẵn quanh chỗ đến (128 block ở thế giới chính, 16 ở Vực Lửa), không có thì dựng cổng
// mới ở chỗ đứng được gần nhất (không có chỗ: nền đá vỏ chai). Sang xong phải bước ra khỏi cổng rồi vào lại mới đi tiếp.
// Chuyển cõi: đóng rương / lò, xuống thú, quên chunk / sinh vật / vật phẩm / người khác đã gửi; client nhận gói "dim" thì dựng lại.
import { B, DIM, NETHER, PLAYER, PORTAL, dismount, findPortal, inPortal, applyInvAction } from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";
import type { Realm } from "./realm.js";
import type { ServerWorld } from "./serverWorld.js";

export interface PortalHost {
  realms: Realm[];
  online(): ServerPlayer[];
}

export class Portals {
  constructor(private readonly h: PortalHost) {}

  /** Mỗi tick: người chơi đứng trong cổng đủ lâu thì sang cõi kia. */
  tick(dt: number): void {
    for (const p of this.h.online()) {
      const w = this.h.realms[p.dim]!.w, s = p.state;
      const inside = !p.dead && inPortal((x, y, z) => w.getCell(x, y, z), s.x, s.y, s.z, PLAYER.WIDTH, PLAYER.HEIGHT);
      p.portalCdS = Math.max(0, p.portalCdS - dt);
      if (!inside) {
        p.portalS = 0;
        p.portalCdS = 0; // ra khỏi cổng: đi tiếp được ngay
        continue;
      }
      if (p.portalCdS > 0 || p.portalPending) continue;
      p.portalS += dt;
      if (p.portalS >= (p.flying ? 0 : PORTAL.WAIT_S)) this.travel(p);
    }
  }

  /** Đi qua cổng sang cõi kia: tải trước chunk chỗ đến ở luồng phụ, xong mới tìm / dựng cổng và chuyển (server không đứng hình). */
  travel(p: ServerPlayer): void {
    if (p.portalPending) return;
    const to = p.dim === DIM.NETHER ? DIM.OVERWORLD : DIM.NETHER, k = to === DIM.NETHER ? 1 / NETHER.SCALE : NETHER.SCALE;
    const w = this.h.realms[to]!.w, s = p.state;
    const tx = Math.floor(s.x * k), tz = Math.floor(s.z * k);
    const ty = to === DIM.NETHER ? Math.max(PORTAL.NETHER_Y[0], Math.min(PORTAL.NETHER_Y[1], Math.floor(s.y))) : Math.floor(s.y);
    const from = p.dim, r = (PORTAL.BUILD_SEARCH >> 4) + 1;
    p.portalPending = true;
    w.preload((tx >> 4) - r, (tz >> 4) - r, (tx >> 4) + r, (tz >> 4) + r, () => {
      p.portalPending = false;
      if (p.dim !== from || p.dead || !this.h.online().includes(p)) return;
      const at = findNear(w, tx, ty, tz, to === DIM.NETHER ? PORTAL.SEARCH_NETHER : PORTAL.SEARCH_OVERWORLD) ?? buildPortal(w, tx, ty, tz, to);
      this.transfer(p, to, { x: at.x + 0.5, y: at.y, z: at.z + 0.5 });
      p.portalS = 0;
      p.portalCdS = Infinity; // đứng yên trong cổng vừa tới: không quay lại — phải bước ra rồi vào lại
    });
  }

  /** Chuyển người chơi sang cõi `to` ở vị trí pos (cả khi hồi sinh từ Vực Lửa về). */
  transfer(p: ServerPlayer, to: number, pos: { x: number; y: number; z: number }): void {
    const from = this.h.realms[p.dim]!, changed = p.dim !== to;
    if (changed) {
      from.containers.close(p);
      for (const st of applyInvAction(p.inv, { t: "close" })) p.inv.add(st);
      p.invDirty = true;
      from.archery.cancel(p);
      if (p.state.rideId) dismount(p.state, (x, y, z) => from.w.getCell(x, y, z), p.lookYaw);
      p.trading = 0;
      for (const o of this.h.online()) if (o !== p && o.dim === p.dim) {
        o.send({ t: "leave", id: p.id });
        o.knownLooks.delete(p.id);
      }
      p.dim = to;
      for (const set of [p.subs, p.knownItems, p.knownLooks, p.knownMobs, p.knownArrows]) set.clear();
      for (const o of this.h.online()) if (o !== p && o.dim === to) {
        o.send({ t: "join", id: p.id, name: p.name });
        p.send({ t: "join", id: o.id, name: o.name });
      }
    }
    Object.assign(p.state, { x: pos.x, y: pos.y, z: pos.z, vx: 0, vy: 0, vz: 0, fallDist: 0 });
    p.stateDirty = true;
    if (changed) p.send({ t: "dim", dim: to, x: pos.x, y: pos.y, z: pos.z });
  }
}

const id = (w: ServerWorld, x: number, y: number, z: number): number => w.cellLoading(x, y, z) & 255;

/** Khối cổng gần (x, y, z) nhất trong bán kính r (ngang); trả về ô đứng ở đáy cổng. Khối cổng luôn là ô đã sửa (không có trong bản sinh
 *  gốc) nên chỉ cần xét danh sách ô đã sửa — không phải tải chunk. */
function findNear(w: ServerWorld, x: number, y: number, z: number, r: number): { x: number; y: number; z: number } | null {
  let best: { x: number; y: number; z: number } | null = null, bd = Infinity;
  for (const [k, m] of w.edits) {
    const cx = Math.floor(k / 0x10000) - 0x8000, cz = (k % 0x10000) - 0x8000;
    if (cx * 16 + 15 < x - r || cx * 16 > x + r || cz * 16 + 15 < z - r || cz * 16 > z + r) continue;
    for (const [i, c] of m) {
      if ((c & 255) !== B.NETHER_PORTAL || ((m.get(i - 256) ?? 0) & 255) === B.NETHER_PORTAL) continue; // chỉ ô đáy
      const px = cx * 16 + (i & 15), pz = cz * 16 + ((i >> 4) & 15), ly = i >> 8;
      if (Math.abs(px - x) > r || Math.abs(pz - z) > r) continue;
      const d = Math.hypot(px - x, (ly - y) * 2, pz - z);
      if (d < bd) [bd, best] = [d, { x: px, y: ly, z: pz }];
    }
  }
  return best;
}

/** Dựng cổng mới (lòng 2 × 3, dọc trục X) ở chỗ đứng được gần (x, y, z) nhất; không có thì dựng nền đá vỏ chai giữa không trung. */
function buildPortal(w: ServerWorld, x: number, y: number, z: number, dim: number): { x: number; y: number; z: number } {
  const lo = dim === DIM.NETHER ? PORTAL.NETHER_Y[0] : 2, hi = dim === DIM.NETHER ? PORTAL.NETHER_Y[1] : 120;
  const solid = (a: number, b: number, c: number): boolean => { const v = id(w, a, b, c); return v !== B.AIR && v !== B.LAVA && v !== B.WATER && v !== B.FIRE; };
  const fits = (a: number, b: number, c: number): boolean => {
    for (let i = -1; i <= 2; i++) {
      if (!solid(a + i, b - 1, c)) return false;
      for (let j = 0; j < 4; j++) if (id(w, a + i, b + j, c) !== B.AIR) return false;
    }
    return true;
  };
  let spot: { x: number; y: number; z: number } | null = null, bd = Infinity;
  for (let dx = -PORTAL.BUILD_SEARCH; dx <= PORTAL.BUILD_SEARCH; dx++)
    for (let dz = -PORTAL.BUILD_SEARCH; dz <= PORTAL.BUILD_SEARCH; dz++) {
      if (Math.hypot(dx, dz) >= bd) continue;
      for (let dy = 0; dy <= hi - lo; dy++) { // từ độ cao đến ra xa dần
        const yy = dy & 1 ? y + ((dy + 1) >> 1) : y - (dy >> 1);
        if (yy < lo || yy > hi || !fits(x + dx, yy, z + dz)) continue;
        const d = Math.hypot(dx, (yy - y) * 0.5, dz);
        if (d < bd) [bd, spot] = [d, { x: x + dx, y: yy, z: z + dz }];
        break;
      }
    }
  const at = spot ?? { x, y: Math.max(lo + 1, Math.min(hi - 4, y)), z };
  if (!spot) // nền 4 × 3 đá vỏ chai, dọn chỗ trống phía trên
    for (let i = -1; i <= 2; i++)
      for (let k = -1; k <= 1; k++) {
        w.setCell(at.x + i, at.y - 1, at.z + k, B.OBSIDIAN, 0);
        for (let j = 0; j < 4; j++) w.setCell(at.x + i, at.y + j, at.z + k, B.AIR, 0);
      }
  for (let i = -1; i <= 2; i++)
    for (let j = -1; j <= 3; j++) {
      const frame = i === -1 || i === 2 || j === -1 || j === 3;
      w.setCell(at.x + i, at.y + j, at.z, frame ? B.OBSIDIAN : B.NETHER_PORTAL, 0);
    }
  return at;
}

/** Châm lửa trong khung: lòng cổng hợp lệ thì thành khối cổng (true). */
export function lightPortal(w: ServerWorld, x: number, y: number, z: number): boolean {
  const shape = findPortal((a, b, c) => w.getCell(a, b, c), x, y, z);
  if (!shape) return false;
  for (const [a, b, c] of shape.cells) w.setCell(a, b, c, B.NETHER_PORTAL, shape.axis);
  return true;
}
