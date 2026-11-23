// Một sinh vật trên server (Giai đoạn 7a): thân vật lý, máu, trạng thái AI, dữ liệu lưu (động vật).
import {
  HORSE_ARMOR, HORSE_ARMOR_KEYS, MAGMA, MOB_EXTRA, MOB_FLAG, createMobBody, mobDef, mobIndex, mobScale, type ItemStack, type MobBody, type MobDef, type MobKey, type Slot,
} from "../../../shared/src/index.js";
import type { ServerPlayer } from "../player.js";
import type { VillagerData } from "./villagers.js";

export interface PathNode { x: number; y: number; z: number }
/** (7d) Đầu kia của dây dắt: người chơi, sinh vật khác (đoàn lạc đà), cọc hàng rào. */
export type LeashTo = { p: ServerPlayer } | { m: Mob } | { x: number; y: number; z: number };

export class Mob {
  readonly def: MobDef;
  readonly kind: number;
  readonly body: MobBody;
  yaw = 0;
  pitch = 0;
  health: number;
  invulnS = 0;
  lastHurt = 0;
  /** Con non: còn bao nhiêu giây nữa thì lớn (0 = trưởng thành). */
  growS = 0;
  variant = 0; // màu len (cừu) / biến thể nhiệt độ (lợn, bò, gà)
  sheared = false;
  /** Động vật (và cá thả từ xô): lưu lại, không bị gỡ khi xa người chơi. */
  persistent: boolean;
  burnS = 0;
  fireT = 0;
  // ---- AI ----
  target: ServerPlayer | null = null;
  path: PathNode[] | null = null;
  pathI = 0;
  pathGoal: PathNode | null = null;
  repathS = 0;
  idleS = 0;
  panicS = 0;
  panicFrom: { x: number; z: number } | null = null;
  attackCdS = 0;
  aimS = 0; // bộ xương: đang giương cung
  stuckS = 0;
  angryS = 0; // nhện: bị đánh thì đánh lại cả ban ngày
  lookS = 0;
  speed = 0; // tốc độ mong muốn của bước hiện tại
  jumpNext = false;
  // ---- phối giống, trứng ----
  loveS = 0;
  breedCdS = 0;
  eggS = 0;
  // ---- gỡ, chết ----
  sinceHurtS = 1e9;
  dyingS = 0;
  burnDied = false;
  // ---- 7b ----
  fuseS = 0; // quái nổ: đã xì bao lâu
  ignited = false; // quái nổ bị bật lửa châm: xì tới nổ, không xẹp
  carry = 0; // kẻ hư không: id block đang cầm (0 = không)
  ageS = 0; // tuổi (mọt hư không tự biến mất)
  hopS = 0; // khối nhầy: chờ nhảy
  swoopS = 0; // bóng ma đêm: > 0 đang lao xuống
  drinkCdS = 0; // phù thủy: chờ uống bình hồi máu
  teleCdS = 0; // kẻ hư không: chờ dịch chuyển
  // ---- 7c ----
  maxHealth: number;
  owner: string | null = null; // sói đã thuần: tên chủ
  sitting = false;
  collar = 14; // màu vòng cổ (đỏ)
  armorDur = 0; // giáp sói còn bao nhiêu độ bền (0 = không mặc)
  held: ItemStack | null = null; // cáo ngậm
  airS = 0; // sinh vật nước: dưỡng khí (cá heo) / thời gian còn chịu được trên cạn
  rolledS = 0; // tatu đang cuộn tròn
  puff = 0; // cá nóc phồng 0..2
  scuteS = 0; // tatu: chờ rụng vảy
  ramS = 0; // dê: chờ húc
  ramming = 0; // dê: đang lao tới (giây)
  prey: Mob | null = null; // sói / cáo / gấu đang săn sinh vật khác
  sleepingFox = false;
  // ---- 7d: cưỡi, dây dắt ----
  temper = 0; // độ thuần 0..100 (ngựa, lừa, la, lạc đà)
  saddled = false;
  chest: Slot[] | null = null; // rương trên lưng (lừa, la, lạc đà)
  rideSpeed = 0; // block / giây khi cưỡi
  jumpH = 0; // độ cao nhảy tối đa khi cưỡi
  strength = 0; // lạc đà: 3 ô rương mỗi mức
  rider: ServerPlayer | null = null;
  buckS = 0; // chưa thuần: còn bao lâu thì hất người cưỡi
  leash: LeashTo | null = null;
  // ---- 8a: làng ----
  vill: VillagerData | null = null; // dân làng / dân làng xác sống / thương nhân
  cureS = 0; // dân làng xác sống đang được chữa: còn bao lâu
  lifeS = 0; // thương nhân: còn bao lâu thì đi
  home: { x: number; y: number; z: number } | null = null; // dân làng / người sắt: quanh đây (giữa làng)
  passenger: ServerPlayer | null = null; // lạc đà: người ngồi sau
  dashCdS = 0;
  // ---- 8b: kẻ cướp tuần tra, tiểu linh ----
  patrolTo: { x: number; z: number } | null = null; // đội trưởng: điểm đang đi tới
  leader: Mob | null = null; // lính tuần tra: đi theo đội trưởng
  bag: ItemStack | null = null; // tiểu linh
  playerHitAt = -1e12; // (8b2) lần cuối bị người chơi đánh (ms) — chết trong 5 giây sau đó thì rơi kinh nghiệm
  looting = 0; // (8b2) cấp Cướp bóc của đòn cuối: đồ đã nhặt (cùng loại với món được đưa — m.held)
  // ---- 8c: pháp sư, tiểu quỷ ----
  castS = 0; // pháp sư: còn làm phép bao lâu
  castKind = 0; // 1 nanh, 2 gọi tiểu quỷ (MOB_EXTRA.CASTING / SUMMONING)
  castDone = false; // phép của lần làm này đã có hiệu lực
  fangCdS = 0;
  summonCdS = 0;
  charging = 0; // tiểu quỷ: đang lao vào mục tiêu (giây còn lại)
  limitedLife = false; // tiểu quỷ do pháp sư gọi: lifeS đếm ngược, hết thì mất máu dần
  cold = false; // (10b) kẻ lội dung nham ở ngoài dung nham
  blazeStep = 0; // (10c) quỷ lửa: 0 chờ, 1 nạp lửa, 2..4 đang bắn loạt
  horseArmor = 0; // (10c) giáp ngựa đang đeo: chỉ số trong HORSE_ARMOR_KEYS (0 = không)
  // ---- 10d1: người lợn (m.held = món đang ngắm), biến thành xác sống, Phát sáng ----
  admireS = 0; // còn ngắm bao lâu
  giver: { x: number; z: number } | null = null; // người đưa vàng: ném đồ đổi về phía này
  pocket: ItemStack[] = []; // túi người lợn (rơi ra khi chết)
  huntCdS = 0; // vừa săn lợn rừng lửa: nghỉ
  scanS = 0; // dò quanh (lửa linh hồn, xác sống, con mồi)
  zombifyS = 0; // đã ở thế giới chính bao lâu
  glowS = 0; // Phát sáng (mũi tên quang phổ): thấy xuyên tường
  /** Vị trí 1 giây gần nhất (bù trễ khi người chơi đánh). */
  readonly hist: { t: number; x: number; y: number; z: number }[] = [];

  constructor(readonly id: number, key: MobKey, x: number, y: number, z: number) {
    this.def = mobDef(key);
    this.kind = mobIndex(key);
    this.body = createMobBody(x, y, z);
    this.health = this.maxHealth = this.def.health;
    this.persistent = !this.def.hostile && !this.def.ambient;
  }

  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }
  get z(): number { return this.body.z; }
  get baby(): boolean { return this.growS > 0; }
  get dead(): boolean { return this.dyingS > 0; }
  /** Hệ số cỡ: con non 0.5, khối nhầy theo cỡ. */
  get scale(): number { return mobScale(this.def, this.baby, this.variant); }
  get width(): number { return this.def.width * this.scale; }
  get height(): number { return this.def.height * this.scale; }
  get eyeY(): number { return this.y + this.def.eye * this.scale; }

  flags(): number {
    return (this.baby ? MOB_FLAG.BABY : 0) | (this.sheared ? MOB_FLAG.SHEARED : 0) | (this.burnS > 0 ? MOB_FLAG.BURNING : 0) |
      (this.dead ? MOB_FLAG.DYING : 0) | (this.target ? MOB_FLAG.ANGRY : 0) | (this.loveS > 0 ? MOB_FLAG.LOVE : 0) | (this.fuseS > 0 ? MOB_FLAG.FUSE : 0) |
      (this.glowS > 0 ? MOB_FLAG.GLOWING : 0); // (10d1)
  }

  /** (7c) Byte riêng loài gửi qua mạng. */
  extra(): number {
    switch (this.def.key) {
      case "wolf": return (this.owner ? MOB_EXTRA.TAMED : 0) | (this.sitting ? MOB_EXTRA.SITTING : 0) | (this.armorDur > 0 ? MOB_EXTRA.ARMORED : 0) | ((this.collar & 15) << 4);
      case "fox": return this.sleepingFox ? MOB_EXTRA.SLEEPING : 0;
      case "armadillo": return this.rolledS > 0 ? MOB_EXTRA.ROLLED : 0;
      case "pufferfish": return this.puff;
      case "tropical_fish": return (this.id * 7) & 15; // màu hoa văn
      case "cat": return (this.owner ? MOB_EXTRA.TAMED : 0) | (this.sitting ? MOB_EXTRA.SITTING : 0) | ((this.collar & 15) << 4); // (8a)
      case "zombie_villager": return this.cureS > 0 ? MOB_EXTRA.CURING : 0;
      case "evoker": return this.castS > 0 ? this.castKind : 0; // (8c) 1 nanh, 2 gọi tiểu quỷ
      case "vex": return this.charging > 0 ? MOB_EXTRA.CHARGING : 0;
      case "ghast": return this.aimS >= 0.5 ? MOB_EXTRA.SHOOTING : 0; // (10b) há miệng 0.5 giây trước khi bắn
      case "blaze": return this.blazeStep > 0 ? MOB_EXTRA.SHOOTING : 0; // (10c) đang nạp lửa / bắn: bốc cháy
      case "strider": return (this.cold ? MOB_EXTRA.COLD : 0) | (this.saddled ? MOB_EXTRA.SADDLED : 0);
      case "piglin": case "piglin_brute": case "hoglin": // (10d1) đang ngắm vàng, đang thành xác sống, giương nỏ
        return (this.admireS > 0 ? MOB_EXTRA.ADMIRING : 0) | (this.zombifyS > 0 ? MOB_EXTRA.ZOMBIFYING : 0) | (this.aimS > 0.3 ? MOB_EXTRA.SHOOTING : 0);
      case "horse": case "donkey": case "mule": case "llama": case "camel": // (7d)
        return (this.owner ? MOB_EXTRA.TAMED : 0) | (this.saddled ? MOB_EXTRA.SADDLED : 0) | (this.chest ? MOB_EXTRA.CHEST : 0) |
          ((this.horseArmor & 3) << MOB_EXTRA.HORSE_ARMOR_SHIFT); // (10c) giáp ngựa
      default: return 0;
    }
  }

  /** Điểm giáp: theo loài; (10b) khối nhầy dung nham theo cỡ; (10c) + giáp ngựa đang đeo. */
  armorPoints(): number {
    const own = this.def.key === "magma_cube" ? MAGMA.ARMOR_PER_SIZE * this.variant : this.def.armor;
    return own + (this.horseArmor ? HORSE_ARMOR[HORSE_ARMOR_KEYS[this.horseArmor]!] ?? 0 : 0);
  }

  /** Dữ liệu lưu (chỉ động vật). */
  toSave(): MobSave {
    return {
      key: this.def.key, x: this.x, y: this.y, z: this.z, yaw: this.yaw, health: this.health, growS: this.growS,
      variant: this.variant, sheared: this.sheared, breedCdS: this.breedCdS, eggS: this.eggS,
      maxHealth: this.maxHealth, owner: this.owner, sitting: this.sitting, collar: this.collar, armorDur: this.armorDur, held: this.held,
      ...(this.persistent && (this.def.ambient || this.def.hostile) ? { kept: true } : {}), // cá thả từ xô, phù thủy ở nhà
      ...(this.rideSpeed ? { temper: this.temper, saddled: this.saddled, chest: this.chest, rideSpeed: this.rideSpeed, jumpH: this.jumpH, strength: this.strength } : {}),
      ...(this.horseArmor ? { horseArmor: this.horseArmor } : {}), // (10c)
      ...(this.leash && "x" in this.leash ? { leashAt: [this.leash.x, this.leash.y, this.leash.z] as [number, number, number] } : {}),
      ...(this.vill ? { vill: this.vill, cureS: this.cureS, lifeS: this.lifeS } : {}), // (8a)
      ...(this.home ? { home: this.home } : {}),
      ...(this.bag ? { bag: this.bag } : {}), // (8b)
    };
  }
}

export interface MobSave {
  key: MobKey;
  x: number; y: number; z: number;
  yaw: number;
  health: number;
  growS: number;
  variant: number;
  sheared: boolean;
  breedCdS: number;
  eggS: number;
  // 7c (file cũ không có: mặc định)
  maxHealth?: number;
  owner?: string | null;
  sitting?: boolean;
  collar?: number;
  armorDur?: number;
  held?: ItemStack | null;
  kept?: boolean; // cá thả từ xô / phù thủy ở nhà: không tự biến mất
  // 7d (file cũ không có: mặc định)
  temper?: number;
  saddled?: boolean;
  chest?: Slot[] | null;
  rideSpeed?: number;
  jumpH?: number;
  strength?: number;
  leashAt?: [number, number, number]; // buộc vào cọc hàng rào
  // 8a
  vill?: VillagerData;
  cureS?: number;
  lifeS?: number;
  home?: { x: number; y: number; z: number };
  bag?: ItemStack | null; // 8b
  horseArmor?: number; // 10c: giáp ngựa (chỉ số HORSE_ARMOR_KEYS)
}
