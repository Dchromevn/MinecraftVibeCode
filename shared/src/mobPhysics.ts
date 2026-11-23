// Vật lý sinh vật (Giai đoạn 7a): dùng chung va chạm block với người chơi (moveBox), bước 1 tick server (1/20 giây).
// Đi theo vận tốc mong muốn do AI chọn, nhảy, nổi trong nước, nhện leo tường, gà rơi chậm, sát thương rơi.
import { B } from "./blocks.js";
import { boxBlocked, moveBox, type CellReader } from "./collide.js";
import { MOVE } from "./constants.js";
import { ANIMALS, MOB_AI } from "./mobConstants.js";

export interface MobBody {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  onGround: boolean;
  collidedH: boolean;
  inWater: boolean;
  inLava: boolean;
  inFire: boolean;
  inCactus: boolean;
  inWeb: boolean;
  headInWater: boolean;
  fallDist: number;
}

export interface MobMove {
  vx: number; // vận tốc ngang mong muốn (block / giây)
  vz: number;
  jump: boolean;
  climb?: boolean; // nhện: đụng tường thì leo lên
  slowFall?: boolean; // gà: rơi chậm, không mất máu khi rơi
  vy?: number; // (7b) vận tốc dọc mong muốn khi bay / lặn
  fly?: boolean; // bóng ma đêm: không trọng lực
  swim?: boolean; // xác đuối: trong nước không nổi lên, bơi theo vy
  fallSafe?: number; // (7c) rơi dưới mức này không mất máu (mặc định MOB_AI.FALL_SAFE)
  jumpV?: number; // (7d) vận tốc nhảy riêng (thú cưỡi tích lực)
  step?: number; // (7d) bước lên cao tối đa (thú cưỡi: 1 block)
  noclip?: boolean; // (8c) tiểu quỷ: bay xuyên block (không va chạm)
}

export const createMobBody = (x: number, y: number, z: number): MobBody => ({
  x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, collidedH: false, inWater: false, inLava: false, inFire: false,
  inCactus: false, inWeb: false, headInWater: false, fallDist: 0,
});

const CLIMB_SPEED = 2.4;

function scan(b: MobBody, box: number[], eye: number, cell: CellReader): void {
  b.inWater = b.inLava = b.inFire = b.inCactus = b.inWeb = false;
  for (let y = Math.floor(box[1]!); y <= Math.floor(box[4]! - 1e-6); y++)
    for (let z = Math.floor(box[2]!); z <= Math.floor(box[5]! - 1e-6); z++)
      for (let x = Math.floor(box[0]!); x <= Math.floor(box[3]! - 1e-6); x++) {
        const c = cell(x, y, z);
        if (c < 0) continue;
        const id = c & 255;
        if (id === B.WATER) b.inWater = true;
        else if (id === B.LAVA) b.inLava = true;
        else if (id === B.FIRE || id === B.SOUL_FIRE) b.inFire = true;
        else if (id === B.CACTUS) b.inCactus = true;
        else if (id === B.COBWEB) b.inWeb = true;
      }
  const e = cell(Math.floor(b.x), Math.floor(b.y + eye), Math.floor(b.z));
  b.headInWater = e >= 0 && (e & 255) === B.WATER;
}

/**
 * Một bước dt giây. w, h: bề rộng / cao hộp va chạm; eye: độ cao mắt. Trả về số máu mất vì rơi (0 nếu không).
 * Chunk chưa tải dưới chân: đứng yên.
 */
export function stepMobBody(b: MobBody, w: number, h: number, eye: number, mv: MobMove, cell: CellReader, dt: number): number {
  if (cell(Math.floor(b.x), Math.max(0, Math.min(127, Math.floor(b.y))), Math.floor(b.z)) < 0) {
    b.vx = b.vy = b.vz = 0;
    return 0;
  }
  const hw = w / 2;
  const box = [b.x - hw, b.y, b.z - hw, b.x + hw, b.y + h, b.z + hw];
  scan(b, box, eye, cell);
  const liquid = b.inWater || b.inLava;
  let tvx = mv.vx, tvz = mv.vz;
  if (liquid && !mv.fly) {
    tvx *= mv.swim ? 0.8 : MOB_AI.WATER_SPEED_FACTOR;
    tvz *= mv.swim ? 0.8 : MOB_AI.WATER_SPEED_FACTOR;
  }
  const k = Math.min(1, (b.onGround || liquid || mv.fly ? MOB_AI.ACCEL_GROUND : MOB_AI.ACCEL_AIR) * dt);
  b.vx += (tvx - b.vx) * k;
  b.vz += (tvz - b.vz) * k;
  if (mv.fly || (liquid && mv.swim)) {
    b.vy += ((mv.vy ?? (mv.fly ? 0 : -1)) - b.vy) * Math.min(1, (mv.fly ? 4 : 6) * dt);
  } else if (liquid) {
    // nổi lên mặt nước (sinh vật trên cạn không lặn)
    b.vy += ((b.headInWater || mv.jump ? MOB_AI.SWIM_UP : -1) - b.vy) * Math.min(1, 6 * dt);
  } else if (mv.climb && b.collidedH) {
    b.vy = CLIMB_SPEED;
  } else {
    if (mv.jump && b.onGround) b.vy = mv.jumpV ?? MOB_AI.JUMP_VELOCITY;
    b.vy = Math.max(b.vy - MOB_AI.GRAVITY * dt, -MOB_AI.TERMINAL_VELOCITY);
    if (mv.slowFall) b.vy = Math.max(b.vy, -ANIMALS.CHICKEN_FALL_SPEED);
  }
  if (mv.noclip) { // (8c) tiểu quỷ: không va chạm, không trọng lực
    b.x += b.vx * dt;
    b.y = Math.max(1, Math.min(126, b.y + b.vy * dt));
    b.z += b.vz * dt;
    b.onGround = b.collidedH = false;
    b.fallDist = 0;
    return 0;
  }
  const wf = b.inWeb ? MOVE.COBWEB_FACTOR : 1;
  if (b.inWeb) b.vy *= MOVE.COBWEB_FACTOR;
  const r = moveBox(cell, box, b.vx * dt * wf, b.vy * dt, b.vz * dt * wf, { step: mv.step ?? MOB_AI.STEP_HEIGHT, edgeDrop: 0 });
  b.x = (box[0]! + box[3]!) / 2;
  b.y = box[1]!;
  b.z = (box[2]! + box[5]!) / 2;
  if (r.hitX) b.vx = 0;
  if (r.hitZ) b.vz = 0;
  if (r.landed || r.hitCeiling) b.vy = 0;
  b.onGround = r.landed;
  b.collidedH = r.hitX || r.hitZ;
  if (b.inWater || b.inWeb || mv.slowFall || mv.fly || (mv.climb && b.collidedH)) b.fallDist = 0;
  else if (r.dy < 0) b.fallDist -= r.dy;
  if (!r.landed) return 0;
  const dmg = Math.floor(b.fallDist - (mv.fallSafe ?? MOB_AI.FALL_SAFE) + 1e-6);
  b.fallDist = 0;
  return Math.max(0, dmg);
}

/** (10b) Kẻ lội dung nham: ô dung nham trên cùng (trên nó không phải dung nham) coi như khối đặc để đi lên mặt. */
export function lavaSolid(cell: CellReader): CellReader {
  return (x, y, z) => {
    const c = cell(x, y, z);
    if (c < 0 || (c & 255) !== B.LAVA) return c;
    const up = cell(x, y + 1, z);
    return up >= 0 && (up & 255) === B.LAVA ? c : B.NETHERRACK;
  };
}

/** Hộp sinh vật ở (x, y, z) có chồng lên block có va chạm không (chọn chỗ sinh). */
export function mobFits(cell: CellReader, w: number, h: number, x: number, y: number, z: number): boolean {
  return !boxBlocked(cell, [x - w / 2, y, z - w / 2, x + w / 2, y + h, z + w / 2]);
}
