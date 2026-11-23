// Sinh tồn (DESIGN.md 2.3, 2.6; MECHANICS.md 3, 5.3–5.5): đói ba biến, hồi máu, đói thì
// mất máu, ăn, sát thương qua giáp + miễn sát thương, chết. Chạy trong bước vật lý.
import { COMBAT, PLAYER } from "./constants.js";
import { ARMOR_FORMULA, EFFECTS, HUNGER, type EffectKey, type FoodDef } from "./survivalConstants.js";
import { TOTEM } from "./illagerConstants.js";
import { WITHER_FX } from "./fortressConstants.js";

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
  absorb: number; // Hấp thụ (táo vàng): máu phụ — tim vàng, mất trước máu thật
  absorbS: number; // còn bao nhiêu giây
  invulnS: number;
  lastHurt: number;
  armorPoints: number; // client cập nhật từ ô giáp
  armorToughness: number;
  armorHits: number; // độ bền giáp phải trừ mỗi món (server trừ rồi đặt lại 0)
  hurtSrc: number; // nguồn sát thương gần nhất (chỉ số trong DAMAGE_SOURCES) — thông báo chết (6a)
  hungerFxS: number; // (7a) hiệu ứng đói còn bao nhiêu giây
  // (7b) hiệu ứng: còn bao nhiêu giây, cấp (1, 2)
  fxPoisonS: number;
  fxPoisonLvl: number;
  fxPoisonT: number; // đếm giây tới lần mất máu kế
  fxSlowS: number;
  fxSlowLvl: number;
  fxWeakS: number;
  fxWeakLvl: number;
  fxNauseaS: number;
  fxGraceS: number; // (7c) bơi nhanh nhờ cá heo
  dead: boolean;
  // (8b2) kinh nghiệm (tổng điểm); phù phép của giáp đang mặc (đặt từ ô giáp như armorPoints)
  xp: number;
  encPrt: number; encFire: number; encBlast: number; encProj: number; encFall: number; encThorns: number; encResp: number; encDepth: number;
  // (8c) vật tổ bất tử: 1 = đang cầm (server đặt từ tay chính / tay phụ); số lần vừa cứu mạng chưa xử lý (server tiêu vật tổ); kháng lửa
  totem: number; totemPop: number; fxFireResS: number;
  fxWitherS: number; fxWitherLvl: number; fxWitherT: number; // (10c) Héo: mất 1 máu mỗi 2 giây (cấp II: 1 giây), có thể chết
  fxGlowS: number; encSoul: number; // (10d1) Phát sáng (mũi tên quang phổ); cấp Tốc độ linh hồn của ủng
}

export function createSurvival(): SurvivalState {
  return {
    health: PLAYER.MAX_HEALTH, hunger: HUNGER.MAX, saturation: HUNGER.START_SATURATION, exhaustion: 0,
    regenTimer: 0, starveTimer: 0, healLeft: 0, healRate: 0, absorb: 0, absorbS: 0, invulnS: 0, lastHurt: 0,
    armorPoints: 0, armorToughness: 0, armorHits: 0, hurtSrc: 0, hungerFxS: 0,
    fxPoisonS: 0, fxPoisonLvl: 0, fxPoisonT: 0, fxSlowS: 0, fxSlowLvl: 0, fxWeakS: 0, fxWeakLvl: 0, fxNauseaS: 0, fxGraceS: 0, dead: false,
    xp: 0, encPrt: 0, encFire: 0, encBlast: 0, encProj: 0, encFall: 0, encThorns: 0, encResp: 0, encDepth: 0,
    totem: 0, totemPop: 0, fxFireResS: 0, fxWitherS: 0, fxWitherLvl: 0, fxWitherT: 0, fxGlowS: 0, encSoul: 0,
  };
}

/** Nguồn sát thương: giáp không giảm rơi, chết đuối, đói, dung nham (lửa vẫn giảm). */
export const DAMAGE_SOURCES = ["other", "fall", "drown", "starve", "lava", "fire", "cactus", "player", "arrow", "mob", "explosion", "poison", "magic", "wither"] as const;
export type DamageSource = (typeof DAMAGE_SOURCES)[number];
const ARMOR_IGNORED: ReadonlySet<DamageSource> = new Set(["fall", "drown", "starve", "lava", "poison", "magic", "wither"]);

/** Sát thương còn lại sau giáp (công thức có độ cứng giáp, DESIGN.md 2.3). */
export function armorReduce(damage: number, armor: number, toughness: number): number {
  const red = Math.min(ARMOR_FORMULA.MAX_POINTS, Math.max(armor / 5, armor - (4 * damage) / (toughness + 8))) / ARMOR_FORMULA.DIVISOR;
  return damage * (1 - red);
}

/** Nhận sát thương: giáp, miễn sát thương 0.5 giây (đòn mạnh hơn chỉ gây phần chênh lệch). Trả về máu đã mất. */
export function hurt(s: SurvivalState, amount: number, source: DamageSource = "other"): number {
  if (amount <= 0 || s.dead) return 0;
  if (s.fxFireResS > 0 && (source === "fire" || source === "lava")) return 0; // (8c) kháng lửa
  if (!ARMOR_IGNORED.has(source) && s.armorPoints > 0) {
    s.armorHits += Math.max(1, Math.floor(amount / ARMOR_FORMULA.WEAR_DIVISOR)); // giáp mòn theo sức mạnh đòn
    amount = armorReduce(amount, s.armorPoints, s.armorToughness);
  }
  if (source !== "starve") { // (8b2) phù phép bảo vệ: mỗi điểm EPF giảm 4%, tối đa 20 điểm (80%)
    const epf = s.encPrt + (source === "fire" || source === "lava" ? 2 * s.encFire : 0) + (source === "explosion" ? 2 * s.encBlast : 0) +
      (source === "arrow" ? 2 * s.encProj : 0) + (source === "fall" ? 3 * s.encFall : 0);
    amount *= 1 - Math.min(20, epf) * 0.04;
  }
  const before = s.health;
  if (s.invulnS > 0 && amount <= s.lastHurt) return 0;
  let take = s.invulnS > 0 ? amount - s.lastHurt : amount;
  if (s.invulnS <= 0) s.invulnS = COMBAT.INVULN_S;
  const soak = Math.min(s.absorb, take); // tim vàng mất trước
  s.absorb -= soak;
  take -= soak;
  s.health -= take;
  s.lastHurt = amount;
  s.hurtSrc = DAMAGE_SOURCES.indexOf(source);
  s.exhaustion += HUNGER.HURT;
  if (s.health <= 0 && s.totem > 0) useTotem(s); // (8c) vật tổ bất tử cứu mạng
  else if (s.health <= 0) {
    s.health = 0;
    s.dead = true;
  }
  return before - s.health + soak; // tính cả phần tim vàng đỡ (vẫn bị đẩy lùi, nháy đỏ)
}

/** (8c) Vật tổ bất tử: sống lại 1 máu, mất mọi hiệu ứng, Hồi phục II 45 giây, Hấp thụ II 5 giây, Kháng lửa 40 giây. */
function useTotem(s: SurvivalState): void {
  Object.assign(s, CLEARED, {
    health: 1, totem: 0, totemPop: s.totemPop + 1, healLeft: TOTEM.REGEN_S * TOTEM.REGEN_RATE, healRate: TOTEM.REGEN_RATE,
    absorb: TOTEM.ABSORB, absorbS: TOTEM.ABSORB_S, fxFireResS: TOTEM.FIRE_RES_S,
  });
}
/** Mọi hiệu ứng tắt (xô sữa, vật tổ). */
const CLEARED = { hungerFxS: 0, fxPoisonS: 0, fxSlowS: 0, fxWeakS: 0, fxNauseaS: 0, fxGraceS: 0, absorb: 0, absorbS: 0, fxFireResS: 0, fxWitherS: 0, fxGlowS: 0 } as const;

/** (7b) Thêm hiệu ứng: cấp cao hơn thì thay; cùng cấp thì lấy thời gian dài hơn. */
export function applyEffect(s: SurvivalState, fx: EffectKey, seconds: number, lvl = 1): void {
  const set = (sk: "fxPoisonS" | "fxSlowS" | "fxWeakS" | "fxWitherS", lk: "fxPoisonLvl" | "fxSlowLvl" | "fxWeakLvl" | "fxWitherLvl"): void => {
    if (s[sk] <= 0 || lvl > s[lk]) Object.assign(s, { [sk]: seconds, [lk]: lvl });
    else if (lvl === s[lk]) s[sk] = Math.max(s[sk], seconds);
  };
  if (fx === "poison") set("fxPoisonS", "fxPoisonLvl");
  else if (fx === "slowness") set("fxSlowS", "fxSlowLvl");
  else if (fx === "weakness") set("fxWeakS", "fxWeakLvl");
  else if (fx === "wither") set("fxWitherS", "fxWitherLvl"); // (10c)
  else if (fx === "hunger") s.hungerFxS = Math.max(s.hungerFxS, seconds);
  else if (fx === "grace") s.fxGraceS = Math.max(s.fxGraceS, seconds);
  else if (fx === "fire_resistance") s.fxFireResS = Math.max(s.fxFireResS, seconds); // (10d1) thuốc kháng lửa
  else if (fx === "glowing") s.fxGlowS = Math.max(s.fxGlowS, seconds); // (10d1) mũi tên quang phổ
  else if (fx === "absorption" || fx === "regeneration") return; // chỉ từ táo vàng (eat) / vật tổ (8c)
  else s.fxNauseaS = Math.max(s.fxNauseaS, seconds);
}

/** Hiệu ứng đang có (HUD): khóa, cấp, giây còn lại. */
export function activeEffects(s: SurvivalState): { fx: EffectKey; lvl: number; s: number }[] {
  const out: { fx: EffectKey; lvl: number; s: number }[] = [];
  if (s.fxPoisonS > 0) out.push({ fx: "poison", lvl: s.fxPoisonLvl, s: s.fxPoisonS });
  if (s.fxSlowS > 0) out.push({ fx: "slowness", lvl: s.fxSlowLvl, s: s.fxSlowS });
  if (s.fxWeakS > 0) out.push({ fx: "weakness", lvl: s.fxWeakLvl, s: s.fxWeakS });
  if (s.hungerFxS > 0) out.push({ fx: "hunger", lvl: 1, s: s.hungerFxS });
  if (s.fxNauseaS > 0) out.push({ fx: "nausea", lvl: 1, s: s.fxNauseaS });
  if (s.fxGraceS > 0) out.push({ fx: "grace", lvl: 1, s: s.fxGraceS });
  if (s.absorbS > 0) out.push({ fx: "absorption", lvl: 1, s: s.absorbS });
  if (s.healLeft > 0 && s.healRate > 0) out.push({ fx: "regeneration", lvl: 2, s: s.healLeft / s.healRate });
  if (s.fxFireResS > 0) out.push({ fx: "fire_resistance", lvl: 1, s: s.fxFireResS }); // 8c
  if (s.fxWitherS > 0) out.push({ fx: "wither", lvl: s.fxWitherLvl, s: s.fxWitherS }); // 10c
  if (s.fxGlowS > 0) out.push({ fx: "glowing", lvl: 1, s: s.fxGlowS }); // 10d1
  return out;
}

/** Hệ số tốc độ đi do hiệu ứng chậm. */
export const slowFactor = (s: SurvivalState): number => (s.fxSlowS > 0 ? Math.max(0, 1 - EFFECTS.SLOW_PER_LEVEL * s.fxSlowLvl) : 1);
/** Sát thương cận chiến bị trừ do hiệu ứng yếu. */
export const weakPenalty = (s: SurvivalState): number => (s.fxWeakS > 0 ? EFFECTS.WEAK_PER_LEVEL * s.fxWeakLvl : 0);

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
  if (food.cures) Object.assign(s, CLEARED); // xô sữa: hết mọi hiệu ứng
  if (food.absorb && food.absorbS) Object.assign(s, { absorb: Math.max(s.absorb, food.absorb), absorbS: food.absorbS }); // táo vàng: tim vàng
  if (food.heal && food.healTimeS) {
    s.healLeft = food.heal;
    s.healRate = food.heal / food.healTimeS;
  }
}

/** Mỗi bước: hao sức → độ no/đói, hồi máu, mất máu vì đói, hồi máu của táo vàng. */
export function tickSurvival(s: SurvivalState, dt: number): void {
  if (s.dead) return;
  s.invulnS = Math.max(0, s.invulnS - dt);
  if (s.hungerFxS > 0) {
    s.hungerFxS = Math.max(0, s.hungerFxS - dt);
    s.exhaustion += HUNGER.EFFECT_EXHAUSTION_PER_S * dt;
  }
  // (10c) héo: mất 1 máu mỗi 2 giây (cấp II: 1 giây), không bị thời gian miễn sát thương chặn, có thể chết
  if (s.fxWitherS > 0) {
    s.fxWitherS = Math.max(0, s.fxWitherS - dt);
    s.fxWitherT += dt;
    const every = WITHER_FX.INTERVAL_S[Math.min(1, s.fxWitherLvl - 1)] ?? 2;
    if (s.fxWitherT >= every) {
      s.fxWitherT -= every;
      const inv = s.invulnS;
      s.invulnS = 0;
      hurt(s, 1, "wither");
      s.invulnS = s.dead ? 0 : inv;
      if (s.dead) return;
    }
  } else s.fxWitherT = 0;
  // (7b) độc: mất 1 máu mỗi 1.25 giây (cấp II: 0.6), dừng ở 1 máu; các hiệu ứng khác chỉ đếm lùi
  if (s.fxPoisonS > 0) {
    s.fxPoisonS = Math.max(0, s.fxPoisonS - dt);
    s.fxPoisonT += dt;
    const every = EFFECTS.POISON_INTERVAL_S[Math.min(1, s.fxPoisonLvl - 1)] ?? 1.25;
    if (s.fxPoisonT >= every) {
      s.fxPoisonT -= every;
      if (s.health > 1) {
        const inv = s.invulnS;
        s.invulnS = 0; // độc không bị chặn bởi thời gian miễn sát thương
        hurt(s, Math.min(1, s.health - 1), "poison");
        s.invulnS = inv;
      }
    }
  } else s.fxPoisonT = 0;
  s.fxSlowS = Math.max(0, s.fxSlowS - dt);
  s.fxWeakS = Math.max(0, s.fxWeakS - dt);
  s.fxNauseaS = Math.max(0, s.fxNauseaS - dt);
  s.fxGraceS = Math.max(0, s.fxGraceS - dt);
  s.fxFireResS = Math.max(0, s.fxFireResS - dt);
  s.fxGlowS = Math.max(0, s.fxGlowS - dt);
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
  if (s.absorbS > 0 && (s.absorbS -= dt) <= 0) s.absorb = s.absorbS = 0; // hết Hấp thụ
  if (s.healLeft > 0) {
    const h = Math.min(s.healLeft, s.healRate * dt);
    s.healLeft -= h;
    s.health = Math.min(max, s.health + h);
  }
}
