// Di chuyển do server tính (Giai đoạn 5c, PLAN.md "DI CHUYỂN VÀ HÀNH ĐỘNG"): client gửi phím bấm từng bước vật
// lý; server chạy cùng hàm vật lý /shared trên thế giới của mình (máu, đói, rơi, dung nham, chết... cũng tính ở
// đây) rồi gửi lại trạng thái thật. Mỗi người chỉ được chạy PHYSICS_HZ bước mỗi giây thật (nạp theo đồng hồ thật,
// không theo số tick — setInterval hay trễ; dư INPUT_RATE_SLACK cho lệch đồng hồ; dồn tối đa INPUT_BURST) nên
// gửi phím nhanh hơn không làm chạy nhanh hơn. Chỉ quản trị viên đang bay được báo vị trí.
import {
  B, CROPS, NET, PLAYER, SOUL_SPEED, applyEffect, armorEnchState, canEat, eat, encodeState, itemDef, shieldHand, stepPlayer, type InputFrame, type InputPacket,
} from "../../shared/src/index.js";
import type { Actions } from "./actions.js";
import type { ServerPlayer } from "./player.js";
import type { ServerTicker } from "./ticker.js";
import type { ServerWorld } from "./serverWorld.js";

export class Movement {
  constructor(
    private readonly w: ServerWorld,
    private readonly ticker: ServerTicker,
    private readonly actions: Actions,
    /** Điểm hồi sinh của người chơi (giường hoặc của thế giới). */
    private readonly respawnOf: (p: ServerPlayer) => { x: number; y: number; z: number },
    /** Người chơi vừa chết (rải đồ, thông báo chết — 6a). */
    private readonly onDeath: (p: ServerPlayer) => void = (p) => actions.died(p),
    /** (10a) Cõi của bộ di chuyển này: người chơi đã sang cõi khác (vd. hồi sinh từ Vực Lửa) thì thôi chạy bước còn lại. */
    private readonly dim = 0,
  ) {}

  private readonly cell = (x: number, y: number, z: number): number => this.w.getCell(x, y, z);
  /** Đồng hồ (ms) — bài test thay được. */
  clock = (): number => performance.now();
  /** (7a) bốc thăm hiệu ứng đói khi ăn thịt sống / thịt thối (chỉ server quyết định). */
  rng: () => number = Math.random;
  /** (10b) Người chơi vừa vung tay. */
  onSwing: (p: ServerPlayer) => void = () => undefined;

  /** Nạp số bước được chạy theo thời gian thật đã trôi qua. */
  private refill(p: ServerPlayer): void {
    const now = this.clock();
    if (p.budgetAt >= 0) {
      const add = ((now - p.budgetAt) / 1000) * PLAYER.PHYSICS_HZ * NET.INPUT_RATE_SLACK;
      p.budget = Math.min(NET.INPUT_BURST, p.budget + Math.max(0, add));
    }
    p.budgetAt = now;
  }

  /** Gói phím bấm: chạy các bước chưa chạy theo đúng thứ tự (bước trùng / cũ bỏ qua). */
  input(p: ServerPlayer, pkt: InputPacket): void {
    p.pitch = pkt.pitch;
    if (pkt.swing !== p.swing) this.onSwing(p); // (10b) vung tay: đánh bật cầu lửa ma bay
    p.swing = pkt.swing;
    p.lookYaw = pkt.yaw;
    const last = pkt.firstSeq + pkt.frames.length - 1;
    if (pkt.fly && p.admin) {
      // quản trị viên đang bay: nhận vị trí, không chạy vật lý
      Object.assign(p.state, { x: pkt.fly.x, y: pkt.fly.y, z: pkt.fly.z, vx: 0, vy: 0, vz: 0, fallDist: 0 });
      p.flying = true;
      p.blocking = false;
      if (pkt.frames.length) p.yaw = pkt.frames[pkt.frames.length - 1]!.yaw;
      p.lastSeq = Math.max(p.lastSeq, last);
      p.stateDirty = true;
      return;
    }
    p.flying = false;
    this.refill(p);
    // giơ khiên (6a): chỉ khi đang cầm khiên và khiên không bị rìu khóa
    const now = this.clock(), canBlock = shieldHand(p.inv) !== null && now >= p.shieldOffUntil;
    for (const f of pkt.frames) if (!canBlock) f.block = false;
    const blocking = !!pkt.frames[pkt.frames.length - 1]?.block;
    if (blocking && !p.blocking) p.blockSince = now;
    if (pkt.frames.length) p.blocking = blocking;
    pkt.frames.forEach((f, i) => {
      const seq = pkt.firstSeq + i;
      if (seq <= p.lastSeq || p.dim !== this.dim) return;
      p.lastSeq = seq;
      p.yaw = f.yaw;
      p.stateDirty = true;
      if (p.budget < 1) return; // quá số bước được phép: bỏ (client sẽ bị sửa lại vị trí)
      p.budget -= 1;
      this.step(p, f);
    });
  }

  /** Một bước vật lý (giống hệt PlayerController.stepOnce ở client). */
  private step(p: ServerPlayer, f: InputFrame): void {
    if (p.sleeping) Object.assign(f, { forward: 0, strafe: 0, jump: false, sneak: false, sprint: false }); // (7a) nằm giường: đứng yên
    if (f.respawn && p.state.dead) {
      const r = this.respawnOf(p);
      p.reset(r.x, r.y, r.z);
      p.state.invulnS = PLAYER.RESPAWN_INVULN_S;
      if (p.dim !== this.dim) return; // (10a) hồi sinh ở thế giới chính
    }
    const s = p.state;
    if (f.eat && !s.dead) {
      const food = p.inv.held ? itemDef(p.inv.held.item)?.food : undefined;
      if (food && canEat(s, food)) {
        eat(s, food);
        for (const e of food.effects ?? []) if (this.rng() < e.chance) applyEffect(s, e.fx, e.s, e.lvl);
        this.actions.consumeHeldFood(p);
      }
    }
    const a = p.inv.armorStats();
    s.armorPoints = a.points;
    Object.assign(s, armorEnchState(p.inv.armor)); // (8b2)
    s.armorToughness = a.toughness;
    p.sprinting = f.sprint && f.forward > 0 && !s.sneaking && s.hunger >= PLAYER.SPRINT_HUNGER_MIN;
    stepPlayer(s, f, this.cell);
    if (s.encSoul > 0 && s.onSoul && s.onGround && (f.forward || f.strafe) && this.rng() < SOUL_SPEED.WEAR_CHANCE) p.inv.damageSlot("armor", 3, 1); // (10d1) ủng Tốc độ linh hồn mòn
    p.wearArmor();
    // giẫm đất cày khi rơi xuống
    if (s.landFall > CROPS.TRAMPLE_MIN_FALL) {
      const x = Math.floor(s.x), y = Math.floor(s.y - 0.01), z = Math.floor(s.z);
      if ((this.w.getCell(x, y, z) & 255) === B.FARMLAND) this.ticker.trample(x, y, z, s.landFall);
    }
    if (s.dead && !p.deathHandled) {
      p.deathHandled = true;
      this.onDeath(p);
    }
  }

  /** Mỗi tick server: gửi trạng thái cho chủ nhân nếu có đổi. */
  tick(p: ServerPlayer): void {
    if (!p.stateDirty) return;
    p.stateDirty = false;
    p.conn.send(encodeState(p.lastSeq, p.state));
  }
}
