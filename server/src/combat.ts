// Cận chiến phía server (Giai đoạn 6a): server quyết định mọi đòn đánh. Kiểm tra tầm (≤ 3.5), tường chắn,
// PvP bật / vùng an toàn, tính hệ số hồi đòn theo đồng hồ server, chí mạng, giáp, miễn sát thương, đẩy lùi,
// mòn vũ khí, khiên đỡ đòn (rìu khóa khiên), quét kiếm. Bù trễ: nhớ vị trí mọi người 1 giây, tua lại mục tiêu theo độ trễ người đánh đang thấy (≤ 250 ms).
import {
  COMBAT, HUNGER, NET, SHIELD, addExhaustion, weakPenalty, attackStrength, hurt, inSafeZone, inSweep, isCrit, itemDef, knockback, lineBlocked,
  meleeBonus, playerHitBox, rayBox, shieldFaces, shieldHand, weaponStats, type DamageSource, type ServerMsg,
} from "../../shared/src/index.js";
import type { ServerPlayer } from "./player.js";
import type { ServerWorld } from "./serverWorld.js";

const NOTICE_MS = 3000; // báo "PvP tắt / vùng an toàn" tối đa 3 giây một lần

export class Combat {
  /** (7c) Người chơi p đánh trúng v (sói thuần của hai bên lao vào). */
  onPvp: (p: ServerPlayer, v: ServerPlayer) => void = () => undefined;
  /** Đồng hồ (ms) — bài test thay được. */
  clock = (): number => performance.now();

  constructor(
    private readonly w: ServerWorld,
    private readonly online: () => ServerPlayer[],
    readonly safe: { x: number; z: number; r: number },
    public pvp: boolean,
    private readonly onDeath: (p: ServerPlayer) => void,
  ) {}

  /** Mỗi tick: ghi vị trí mọi người (bỏ phần cũ hơn POSITION_HISTORY_S). */
  record(all: ServerPlayer[]): void {
    const now = this.clock(), keep = now - COMBAT.POSITION_HISTORY_S * 1000;
    for (const p of all) {
      p.hist.push({ t: now, x: p.x, y: p.y, z: p.z, sneaking: p.sneaking });
      while (p.hist.length > 2 && p.hist[1]!.t <= keep) p.hist.shift();
    }
  }

  /** Vị trí của p lúc t (ms), nội suy giữa hai lần ghi; ngoài khoảng đã ghi thì lấy lần gần nhất. */
  posAt(p: ServerPlayer, t: number): { x: number; y: number; z: number; sneaking: boolean } {
    const h = p.hist;
    if (!h.length || t >= h[h.length - 1]!.t) return { x: p.x, y: p.y, z: p.z, sneaking: p.sneaking };
    if (t <= h[0]!.t) return h[0]!;
    let i = h.length - 1;
    while (i > 0 && h[i - 1]!.t > t) i--;
    const a = h[i - 1]!, b = h[i]!, k = (t - a.t) / (b.t - a.t || 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, sneaking: b.sneaking };
  }

  /** Đổi đồ trên tay: đặt lại hồi đòn. */
  heldChanged(p: ServerPlayer): void {
    p.lastAttackAt = this.clock();
  }

  /** Người chơi p đánh người chơi id; lag = độ trễ (ms) của hình mục tiêu trên máy người đánh. */
  attack(p: ServerPlayer, id: number, lag: number): void {
    const now = this.clock();
    const v = this.online().find((o) => o.id === id);
    // quản trị viên đang bay (như chế độ sáng tạo): không bị đánh — người bay không chạy bước vật lý nên thời gian
    // miễn sát thương của họ cũng không giảm
    if (!v || v === p || p.dead || v.dead || v.flying) return;
    const held = p.inv.held?.item, stats = weaponStats(held);
    const strength = attackStrength((now - p.lastAttackAt) / 1000 + COMBAT.ATTACK_TIMING_SLACK_S, stats.speed);
    p.lastAttackAt = now;
    if (!this.reaches(p, v, now - Math.max(0, Math.min(COMBAT.LAG_COMP_MAX_MS, lag)))) return;
    if (!this.allowed(p, v, now, true)) return;
    const crit = isCrit(p.state, strength, p.sprinting);
    const strong = strength >= COMBAT.CRIT_MIN_STRENGTH;
    const ench = p.inv.held?.ench; // (8b2) Sắc bén, Đẩy lùi, Gai của người bị đánh
    const damage = (Math.max(0, stats.damage - weakPenalty(p.state)) * (crit ? COMBAT.CRIT_MULTIPLIER : 1) + meleeBonus(ench, null)) * strength; // (7b) yếu: −4
    if (this.shieldBlocks(v, p.x, p.z, damage, now, p)) return;
    const kb = (p.sprinting && strong ? COMBAT.SPRINT_KNOCKBACK_MULT : 1) + (ench?.knockback ?? 0);
    if (!this.strike(p.name, v, damage, crit, v.x - p.x, v.z - p.z, kb, now, "player")) return; // đang miễn sát thương
    this.onPvp(p, v);
    if (v.state.encThorns > 0 && Math.random() < 0.15 * v.state.encThorns) this.strike(v.name, p, 1 + Math.floor(Math.random() * 4), false, p.x - v.x, p.z - v.z, 0.5, now, "player");
    if (stats.wear > 0) {
      p.inv.damageSlot("main", p.inv.selected, stats.wear);
      p.invDirty = true;
    }
    addExhaustion(p.state, HUNGER.ATTACK);
    p.stateDirty = true;
    // quét kiếm: đòn kiếm đủ lực, đứng trên đất, không chạy nhanh, không chí mạng → trúng cả người đứng sát mục tiêu
    const sword = !!held && itemDef(held)?.tool?.kind === "sword";
    if (!sword || !strong || !p.state.onGround || p.sprinting || crit) return;
    const dx = -Math.sin(p.lookYaw), dz = -Math.cos(p.lookYaw);
    const fx: ServerMsg = { t: "fx", kind: "sweep", x: p.x + dx, y: p.y + 1.1, z: p.z + dz }; // vệt quét trước mặt người đánh
    for (const o of this.online()) if (Math.hypot(o.x - p.x, o.z - p.z) <= NET.PLAYER_VIEW) o.send(fx);
    for (const o of this.online()) {
      if (o === p || o === v || o.dead || o.flying || !inSweep(v.x, v.y, v.z, o.x, o.y, o.z)) continue;
      if (Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z) >= COMBAT.MELEE_RANGE || !this.allowed(p, o, now, false)) continue;
      if (!this.shieldBlocks(o, p.x, p.z, COMBAT.SWEEP_DAMAGE, now, p))
        this.strike(p.name, o, COMBAT.SWEEP_DAMAGE, false, dx, dz, COMBAT.SWEEP_KNOCKBACK / COMBAT.KNOCKBACK_H, now, "player");
    }
  }

  /** Mũi tên (6b) của người tên shooter (p: còn online, hoặc null) bay từ hướng (vx, vz) ở (ax, az) trúng v. */
  arrowHit(p: ServerPlayer | null, shooter: string, v: ServerPlayer, ax: number, az: number, vx: number, vz: number, damage: number, crit: boolean): void {
    const now = this.clock();
    if (v.dead || v.flying || v === p) return;
    if (p ? !this.allowed(p, v, now, true) : !this.pvp || inSafeZone(v.x, v.z, this.safe)) return;
    if (this.shieldBlocks(v, ax, az, damage, now, null)) return;
    this.strike(shooter, v, damage, crit, vx, vz, 1, now, "arrow");
  }

  /**
   * (7a) Sinh vật đánh / bắn trúng người chơi v từ phía (fx, fz): khiên, giáp, miễn sát thương, đẩy lùi — không phụ thuộc
   * PvP / vùng an toàn. by = "mob:<loài>" (thông báo chết). Trả về true nếu trúng.
   */
  mobHit(v: ServerPlayer, damage: number, fx: number, fz: number, by: string, src: DamageSource, shield = true, kb = src === "magic" ? 0 : 1): boolean {
    const now = this.clock();
    if (v.dead || v.flying) return false;
    if (shield && this.shieldBlocks(v, fx, fz, damage, now, null)) return false;
    return this.strike(by, v, damage, false, v.x - fx, v.z - fz, kb, now, src);
  }

  /**
   * (7b) Vụ nổ ở (cx, cy, cz) trúng v: khiên giơ về phía vụ nổ thì chặn sát thương; đẩy văng theo hướng từ tâm, mạnh theo
   * tác động (block/tick × 20). by = ai gây nổ ("mob:creeper", tên người châm TNT, hoặc "").
   */
  blast(v: ServerPlayer, damage: number, cx: number, cy: number, cz: number, impact: number, by: string): void {
    const now = this.clock();
    if (v.dead || v.flying) return;
    const dx = v.x - cx, dy = v.y + 0.9 - cy, dz = v.z - cz, d = Math.hypot(dx, dy, dz) || 1;
    if (!this.shieldBlocks(v, cx, cz, damage, now, null)) this.strike(by, v, damage, false, dx, dz, 0, now, "explosion");
    v.state.vx += (dx / d) * impact * 20;
    v.state.vy += (dy / d) * impact * 20;
    v.state.vz += (dz / d) * impact * 20;
    v.stateDirty = true;
  }

  /** PvP bật và cả hai ngoài vùng an toàn; không thì (notify) báo người đánh, tối đa 3 giây một lần. */
  allowed(p: ServerPlayer, v: ServerPlayer, now: number, notify: boolean): boolean {
    if (this.pvp && !inSafeZone(p.x, p.z, this.safe) && !inSafeZone(v.x, v.z, this.safe)) return true;
    if (notify && now - p.noticeAt > NOTICE_MS) {
      p.noticeAt = now;
      p.send({ t: "chat", kind: "error", key: this.pvp ? "safeZone" : "pvpDisabled", args: [] });
    }
    return false;
  }

  /**
   * Khiên của v đỡ đòn từ phía (sx, sz) (đã giơ đủ 0.25 giây, nguồn ở phía trước): khiên mòn. Đòn cận chiến (melee =
   * người đánh): rìu khóa khiên 5 giây, người đánh bị đẩy lùi. Mũi tên: chỉ bị chặn lại.
   */
  private shieldBlocks(v: ServerPlayer, sx: number, sz: number, damage: number, now: number, melee: ServerPlayer | null): boolean {
    const hand = shieldHand(v.inv);
    if (!hand || !v.blocking || now - v.blockSince < SHIELD.RAISE_S * 1000 || now < v.shieldOffUntil) return false;
    if (!shieldFaces(v.lookYaw, v.x, v.z, sx, sz)) return false;
    if (damage >= SHIELD.WEAR_MIN_DAMAGE) {
      v.inv.damageSlot(hand, hand === "main" ? v.inv.selected : 0, 1 + Math.floor(damage));
      v.invDirty = true;
    }
    if (!melee) return true;
    if (itemDef(melee.inv.held?.item ?? "")?.tool?.kind === "axe") {
      v.shieldOffUntil = now + SHIELD.DISABLE_S * 1000;
      v.blocking = false;
      v.send({ t: "shieldOff", s: SHIELD.DISABLE_S });
    }
    knockback(melee.state, melee.x - v.x, melee.z - v.z, SHIELD.ATTACKER_KNOCKBACK / COMBAT.KNOCKBACK_H);
    melee.stateDirty = true;
    return true;
  }

  /** Gây sát thương cho v (giáp, miễn sát thương), đẩy lùi theo (dx, dz), báo người xung quanh, xử lý chết. */
  private strike(
    by: string, v: ServerPlayer, damage: number, crit: boolean, dx: number, dz: number, kb: number, now: number, src: DamageSource,
  ): boolean {
    if (hurt(v.state, damage, src) <= 0) return false;
    v.wearArmor();
    const res = v.inv.armor.filter((s) => s && itemDef(s.item)?.armor?.tier === "netherite").length * 0.1; // (10d2) giáp netherite: kháng đẩy lùi 10% mỗi món
    if (kb > 0 && res < 1) knockback(v.state, dx, dz, kb * (1 - res));
    v.stateDirty = true;
    v.lastAttacker = { name: by, at: now };
    const msg: ServerMsg = { t: "hurt", id: v.id, crit };
    for (const o of this.online()) if (Math.hypot(o.x - v.x, o.z - v.z) <= NET.PLAYER_VIEW) o.send(msg);
    if (v.state.dead && !v.deathHandled) {
      v.deathHandled = true;
      this.onDeath(v);
    }
    return true;
  }

  /** Tia nhìn của p trúng hộp của v (vị trí lúc `at` hoặc hiện tại) trong tầm, không bị tường chắn. */
  private reaches(p: ServerPlayer, v: ServerPlayer, at: number): boolean {
    const eye = p.eye(), d = p.lookDir(), dir = [d.x, d.y, d.z];
    let best = Infinity;
    for (const c of [this.posAt(v, at), v]) {
      const t = rayBox(eye, dir, playerHitBox(c.x, c.y, c.z, c.sneaking, COMBAT.HIT_BOX_PAD));
      if (t !== null && t <= COMBAT.MELEE_RANGE_SERVER) best = Math.min(best, t);
    }
    return best < Infinity && !lineBlocked((x, y, z) => this.w.getCell(x, y, z), eye, dir, best);
  }
}
