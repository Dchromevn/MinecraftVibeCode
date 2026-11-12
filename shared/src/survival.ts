// Sinh tồn (DESIGN.md 2.3, 2.6; MECHANICS.md 3, 5.3–5.5): đói ba biến, hồi máu, đói thì
// mất máu, ăn, sát thương qua giáp + miễn sát thương, chết. Chạy trong bước vật lý.
import { COMBAT, PLAYER } from "./constants.js";
import { ARMOR_FORMULA, HUNGER, type FoodDef } from "./survivalConstants.js";

/** Phần trạng thái sinh tồn của người chơi (gộp vào PlayerState). */
export interface SurvivalState {
  health: number;
  hunger: number;
  saturation: number;
  exhaustion: number;
  regenTimer: number;
  starveTimer: number;
  healLeft: number; // táo vàng: còn hồi bao nhiêu máu
  healRate: number; // máu / giây
  invulnS: number;
  lastHurt: number;
  armorPoints: number; // client cập nhật từ ô giáp
  armorToughness: number;
  armorHits: number; // số lần giáp đỡ đòn (client trừ độ bền giáp rồi đặt lại 0)
  dead: boolean;
}

export function createSurvival(): SurvivalState {
  return {
    health: PLAYER.MAX_HEALTH, hunger: HUNGER.MAX, saturation: HUNGER.START_SATURATION, exhaustion: 0,
    regenTimer: 0, starveTimer: 0, healLeft: 0, healRate: 0, invulnS: 0, lastHurt: 0,
    armorPoints: 0, armorToughness: 0, armorHits: 0, dead: false,
  };
}

/** Nguồn sát thương: giáp không giảm rơi, chết đuối, đói, dung nham (lửa vẫn giảm). */
export type DamageSource = "fall" | "drown" | "starve" | "lava" | "fire" | "other";
const ARMOR_IGNORED: ReadonlySet<DamageSource> = new Set(["fall", "drown", "starve", "lava"]);

/** Sát thương còn lại sau giáp (công thức có độ cứng giáp, DESIGN.md 2.3). */
export function armorReduce(damage: number, armor: number, toughness: number): number {
  const red = Math.min(ARMOR_FORMULA.MAX_POINTS, Math.max(armor / 5, armor - (4 * damage) / (toughness + 8))) / ARMOR_FORMULA.DIVISOR;
  return damage * (1 - red);
}

/** Nhận sát thương: giáp, miễn sát thương 0.5 giây (đòn mạnh hơn chỉ gây phần chênh lệch). */
export function hurt(s: SurvivalState, amount: number, source: DamageSource = "other"): void {
  if (amount <= 0 || s.dead) return;
  if (!ARMOR_IGNORED.has(source) && s.armorPoints > 0) {
    amount = armorReduce(amount, s.armorPoints, s.armorToughness);
    s.armorHits++;
  }
  if (s.invulnS > 0) {
    if (amount <= s.lastHurt) return;
    s.health -= amount - s.lastHurt;
  } else {
    s.health -= amount;
    s.invulnS = COMBAT.INVULN_S;
  }
  s.lastHurt = amount;
  s.exhaustion += HUNGER.HURT;
  if (s.health <= 0) {
    s.health = 0;
    s.dead = true;
  }
}

export function addExhaustion(s: SurvivalState, v: number): void {
  s.exhaustion += v;
}

/** Ăn được món này lúc này không (đói đầy thì chỉ ăn được táo vàng). */
export function canEat(s: SurvivalState, food: FoodDef): boolean {
  return !s.dead && (s.hunger < HUNGER.MAX || !!food.alwaysEdible);
}

export function eat(s: SurvivalState, food: FoodDef): void {
  s.hunger = Math.min(HUNGER.MAX, s.hunger + food.hunger);
  s.saturation = Math.min(s.hunger, s.saturation + food.saturation);
  if (food.heal && food.healTimeS) {
    s.healLeft = food.heal;
    s.healRate = food.heal / food.healTimeS;
  }
}

/** Mỗi bước: hao sức → độ no/đói, hồi máu, mất máu vì đói, hồi máu của táo vàng. */
export function tickSurvival(s: SurvivalState, dt: number): void {
  if (s.dead) return;
  s.invulnS = Math.max(0, s.invulnS - dt);
  while (s.exhaustion >= HUNGER.EXHAUSTION_MAX) {
    s.exhaustion -= HUNGER.EXHAUSTION_MAX;
    if (s.saturation > 0) s.saturation = Math.max(0, s.saturation - 1);
    else s.hunger = Math.max(0, s.hunger - 1);
  }
  const max = PLAYER.MAX_HEALTH;
  const fast = s.hunger >= HUNGER.MAX && s.saturation > 0;
  if (s.health < max && (fast || s.hunger >= HUNGER.REGEN_MIN)) {
    s.regenTimer += dt;
    const every = fast ? HUNGER.FAST_REGEN_S : HUNGER.REGEN_S;
    if (s.regenTimer >= every) {
      s.regenTimer -= every;
      s.health = Math.min(max, s.health + 1);
      s.exhaustion += HUNGER.REGEN_COST;
    }
  } else s.regenTimer = 0;
  if (s.hunger === 0) {
    s.starveTimer += dt;
    if (s.starveTimer >= HUNGER.STARVE_S) {
      s.starveTimer -= HUNGER.STARVE_S;
      if (s.health > HUNGER.STARVE_MIN_HEALTH) hurt(s, Math.min(1, s.health - HUNGER.STARVE_MIN_HEALTH), "starve");
    }
  } else s.starveTimer = 0;
  if (s.healLeft > 0) {
    const h = Math.min(s.healLeft, s.healRate * dt);
    s.healLeft -= h;
    s.health = Math.min(max, s.health + h);
  }
}
