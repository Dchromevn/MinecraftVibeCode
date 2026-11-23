// Ngữ cảnh cho AI sinh vật (tách từ mobs.ts ở Giai đoạn 7c để file dưới 300 dòng): các hàm AI dùng để đọc thế giới, đánh,
// bắn, phối giống, dịch chuyển... nối tới Mobs và MobHost.
import { ALLAY, B, createItemEntity, stack, sunBurnsAt, type CellReader } from "../../../shared/src/index.js";
import type { BrainCtx } from "./brain.js";
import type { MobHost, Mobs } from "./mobs.js";
import type { PathFinder } from "./pathfind.js";
import { canMate } from "./riding.js";
import { allayTarget } from "./illagers.js";

export function brainContext(mobs: Mobs, host: MobHost, paths: PathFinder, dt: number): BrainCtx {
  const cell: CellReader = (x, y, z) => host.w.getCell(x, y, z);
  const at = (m: { x: number; y: number; z: number }) => [Math.floor(m.x), Math.floor(m.y), Math.floor(m.z)] as const;
  return {
    cell, paths, rng: host.rng, dt, players: [],
    brightness: (x, y, z) => mobs.brightness(x, y, z),
    meleeHit: (m, p) => host.meleeHit(m, p),
    shoot: (m, p) => host.shoot(m, p),
    partner: (m) => mobs.list.find((o) => o !== m && canMate(m, o) && !o.dead && !o.baby && o.loveS > 0 &&
      Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z) <= 8) ?? null,
    breed: (a, b) => mobs.breed(a, b),
    layEgg: (m) => host.items.pop(stack("egg"), ...at(m)),
    eatGrass: (m) => mobs.eatGrass(m),
    explode: (m) => host.explode(m),
    teleport: (m, near, r) => mobs.teleport(m, near, r),
    potion: (m, p, k) => host.potion(m, p, k),
    canGrief: (x, z) => host.canGrief(x, z),
    setBlock: (x, y, z, id) => void host.w.setCell(x, y, z, id, 0),
    sunlit: (m) => mobs.darken <= 3 && host.w.world.lightRaw(Math.floor(m.x), Math.floor(m.eyeY), Math.floor(m.z)) >> 4 === 15,
    // ---- 7c ----
    near: (m, r) => mobs.list.filter((o) => o !== m && !o.dead && Math.abs(o.x - m.x) <= r && Math.abs(o.z - m.z) <= r && Math.abs(o.y - m.y) <= r),
    bite: (m, t, dmg) => void mobs.hurt(t, dmg, "other", { from: { x: m.x, z: m.z }, kb: 1, byMob: m }),
    ownerOf: (m) => host.online().find((p) => p.name === m.owner && !p.dead) ?? null,
    spit: (m, p) => host.hitPlayer(m, p, 1, 0),
    ram: (m, p) => host.hitPlayer(m, p, 2, 3),
    effect: (p, fx, s) => host.effect(p, fx, s),
    leashPull: (m) => host.leashPull(m), // (7d)
    isWater: (x, y, z) => (cell(x, y, z) & 255) === B.WATER,
    isDay: () => sunBurnsAt(host.time()),
    pickItem: (m) => {
      const list = host.items.list;
      const i = list.findIndex((e) => e.pickupDelay === 0 && Math.hypot(e.x - m.x, e.y - m.y, e.z - m.z) < 1.5);
      if (i < 0) return;
      m.held = list[i]!.stack; // cáo ngậm (chết thì rơi ra)
      list.splice(i, 1);
    },
    layScute: (m) => host.items.pop(stack("armadillo_scute"), ...at(m)),
    // ---- 8a ----
    strike: (m, p, dmg) => host.strike(m, p, dmg),
    trader: (m) => host.online().find((p) => p.trading === m.id && !p.dead) ?? null,
    // ---- 8b: tiểu linh ----
    allayFind: (m) => allayTarget(host.items, m),
    allayTake: (m) => {
      const e = allayTarget(host.items, m);
      if (!e || Math.hypot(e.x - m.x, e.y - m.y, e.z - m.z) > ALLAY.PICK_R * 1.5) return;
      const have = m.bag?.count ?? 0, n = Math.min(e.stack.count, ALLAY.MAX_CARRY - have);
      m.bag = { ...e.stack, count: have + n };
      e.stack.count -= n;
      if (e.stack.count <= 0) host.items.list.splice(host.items.list.indexOf(e), 1);
    },
    allayDeliver: (m, p) => {
      if (m.bag) host.items.pop(m.bag, Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z));
      m.bag = null;
    },
    // ---- 8c: pháp sư, tiểu quỷ ----
    fangs: (m, p) => host.fangs(m, p),
    summonVex: (m) => host.summonVex(m),
    vexCount: (m, r) => mobs.list.filter((o) => o.def.key === "vex" && !o.dead && Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z) <= r).length,
    decay: (m) => void mobs.hurt(m, 1, "other"),
    // ---- 10b: ma bay, lợn rừng lửa ----
    fireball: (m, p) => host.fireball(m, p),
    toss: (m, p, dmg, vy) => host.toss(m, p, dmg, vy),
    blazeFire: (m, p) => host.blazeFire(m, p), // (10c)
    // ---- 10d1: người lợn nhặt đồ vàng, ném đồ đổi về phía người đưa ----
    groundItems: () => host.items.list,
    dropFrom: (m, s, to) => {
      const dx = to ? to.x - m.x : 0, dz = to ? to.z - m.z : 0, d = Math.hypot(dx, dz) || 1, v = to ? 3 : 0;
      host.items.list.push(createItemEntity(s, m.x, m.y + m.height * 0.6, m.z, (dx / d) * v, 3, (dz / d) * v, 0.5));
    },
  };
}
