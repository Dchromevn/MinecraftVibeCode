// Cận chiến phía client (Giai đoạn 6a): bấm chuột trái vào người chơi khác (trong 3 block, không bị block chắn)
// thì đánh — server quyết định trúng / sát thương. Thanh hồi đòn dưới tâm ngắm (theo vũ khí đang cầm). Phản hồi
// khi mình trúng đòn: nháy đỏ, rung màn hình (người dùng bỏ viền đỏ chỉ hướng, 2026-11-14); người khác trúng đòn thì nháy đỏ.
// 7a: đánh cả sinh vật (chọn người / sinh vật gần nhất trên tia nhìn).
import * as THREE from "three";
import { COMBAT, HUNGER, attackStrength, raycast, weaponStats, type World } from "../../../shared/src/index.js";
import type { ClientMobs } from "../mobs/clientMobs.js";
import type { RemotePlayers } from "../net/remotePlayers.js";
import type { PlayerController } from "../player/playerController.js";

const FLASH_S = 0.35;
const SHAKE_S = 0.3;
const SHAKE_ROLL = 0.12; // rad

export interface CombatDeps {
  camera: THREE.PerspectiveCamera;
  player: PlayerController;
  world: World;
  remote: RemotePlayers;
  mobs: ClientMobs;
  myId: number;
  held: () => string | null;
  attack: (id: number) => void;
  attackMob: (id: number) => void;
  swing: () => void;
}

function el(css: string): HTMLDivElement {
  const d = document.createElement("div");
  d.style.cssText = `position:fixed;pointer-events:none;${css}`;
  document.body.appendChild(d);
  return d;
}

export class CombatClient {
  private lastAttack = -1e9; // ms (performance.now)
  private heldKey: string | null = null;
  private lastHealth = -1;
  private flashT = 0;
  private shakeT = 0;
  private readonly bar: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly flash: HTMLDivElement;
  private readonly dir = new THREE.Vector3();

  constructor(private readonly d: CombatDeps) {
    this.bar = el("left:50%;top:calc(50% + 16px);width:34px;height:5px;margin-left:-17px;background:rgba(0,0,0,.5);display:none;z-index:5");
    this.fill = document.createElement("div");
    this.fill.style.cssText = "height:100%;background:#ddd;width:0";
    this.bar.appendChild(this.fill);
    this.flash = el("inset:0;box-shadow:inset 0 0 140px 50px rgba(210,0,0,.7);background:rgba(255,0,0,.12);opacity:0;z-index:4");
  }

  /** Hệ số lực đánh nếu đánh ngay bây giờ. */
  strength(now = performance.now()): number {
    return attackStrength((now - this.lastAttack) / 1000, weaponStats(this.d.held()).speed);
  }

  /** Chuột trái vừa bấm: nhắm trúng người chơi thì đánh (trả về true, không đào). Bấm vào khoảng không cũng tính một nhát hụt. */
  tryAttack(): boolean {
    const p = this.d.player;
    if (p.state.dead) return false;
    const c = this.d.camera.position;
    this.d.camera.getWorldDirection(this.dir);
    const o = [c.x, c.y, c.z], dv = [this.dir.x, this.dir.y, this.dir.z];
    const who = this.d.remote.pick(o, dv, COMBAT.MELEE_RANGE), mob = this.d.mobs.pick(o, dv, COMBAT.MELEE_RANGE);
    const isMob = !!mob && (!who || mob.dist < who.dist), hit = isMob ? mob : who;
    const block = raycast((x, y, z) => this.d.world.getCell(x, y, z), c.x, c.y, c.z, dv[0]!, dv[1]!, dv[2]!, COMBAT.MELEE_RANGE);
    if (!hit || (block && block.dist < hit.dist)) {
      if (!block) this.lastAttack = performance.now(); // đánh hụt cũng đặt lại hồi đòn
      return false;
    }
    const strong = this.strength() >= COMBAT.CRIT_MIN_STRENGTH;
    if (isMob) this.d.attackMob(hit.id);
    else this.d.attack(hit.id);
    this.d.swing();
    this.lastAttack = performance.now();
    if (p.sprinting && strong) p.stopSprint();
    p.exhaust(HUNGER.ATTACK);
    return true;
  }

  /** Gói "hurt": người khác trúng đòn thì nháy đỏ (mình: nháy đỏ + rung theo máu giảm, trong update). */
  hurt(id: number): void {
    if (id !== this.d.myId) this.d.remote.hurt(id);
  }

  /** Mỗi khung hình, sau khi player.update đặt góc camera. */
  update(dt: number): void {
    const now = performance.now(), held = this.d.held();
    if (held !== this.heldKey) {
      this.heldKey = held;
      this.lastAttack = now; // đổi đồ trên tay: hồi đòn lại từ đầu (server cũng vậy)
    }
    const f = this.strength(now), s = this.d.player.state;
    this.bar.style.display = f < 1 && !s.dead && !this.d.player.flying ? "block" : "none";
    this.fill.style.width = `${f * 100}%`;
    // mất máu (bị đánh, rơi, dung nham...): nháy đỏ + rung
    if (this.lastHealth >= 0 && s.health < this.lastHealth - 1e-3 && !s.dead) {
      this.flashT = FLASH_S;
      this.shakeT = SHAKE_S;
    }
    this.lastHealth = s.health;
    this.flashT = Math.max(0, this.flashT - dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flash.style.opacity = String(this.flashT / FLASH_S);
    if (this.shakeT > 0) this.d.camera.rotation.z = Math.sin((SHAKE_S - this.shakeT) * 40) * SHAKE_ROLL * (this.shakeT / SHAKE_S);
  }
}
