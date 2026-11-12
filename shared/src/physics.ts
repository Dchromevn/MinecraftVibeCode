// Vật lý người chơi (DESIGN.md 2.6, MECHANICS.md mục 2 và 5.5): hàm bước thuần túy, xác
// định, bước cố định 1/PHYSICS_HZ giây — client chạy để dự đoán, server (Giai đoạn 5)
// chạy lại để kiểm tra. Sinh tồn (đói, hồi máu, giáp, chết) trong survival.ts.
import { B } from "./blocks.js";
import { MOVE, PLAYER } from "./constants.js";
import { boxBlocked, moveBox, type CellReader } from "./collide.js";
import { HUNGER } from "./survivalConstants.js";
import { createSurvival, hurt, tickSurvival, type SurvivalState } from "./survival.js";

export interface PlayerState extends SurvivalState {
  x: number; // giữa chân
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  sneaking: boolean; // tư thế ngồi (cao 1.5); trần thấp thì không đứng dậy được
  inWater: boolean;
  inLava: boolean;
  onLadder: boolean;
  inWeb: boolean;
  headInWater: boolean;
  collidedH: boolean;
  frozen: boolean; // chunk dưới chân chưa tải: đứng yên
  air: number; // dưỡng khí còn lại (giây)
  fallDist: number; // quãng đang rơi (block)
  burnS: number; // còn cháy bao lâu
  fireTimer: number; // đếm giây cho cháy / chết đuối
  drownTimer: number;
}

export interface PlayerInput {
  forward: number; // -1..1
  strafe: number; // -1..1 (dương = sang phải)
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
  yaw: number; // như camera: yaw = 0 nhìn về −Z
}

export const PHYSICS_DT = 1 / PLAYER.PHYSICS_HZ;
const HW = PLAYER.WIDTH / 2;
/** Vận tốc nhảy để đỉnh nhảy cao đúng JUMP_HEIGHT. */
export const JUMP_VELOCITY = Math.sqrt(2 * PLAYER.GRAVITY * PLAYER.JUMP_HEIGHT);

export function createPlayer(x: number, y: number, z: number): PlayerState {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0,
    onGround: false, sneaking: false, inWater: false, inLava: false, onLadder: false, inWeb: false,
    headInWater: false, collidedH: false, frozen: false,
    air: PLAYER.AIR_S, fallDist: 0, burnS: 0, fireTimer: 0, drownTimer: 0,
    ...createSurvival(),
  };
}

export const playerHeight = (s: { sneaking: boolean }): number => (s.sneaking ? PLAYER.SNEAK_HEIGHT : PLAYER.HEIGHT);
export const eyeHeight = (s: { sneaking: boolean }): number => (s.sneaking ? PLAYER.SNEAK_EYE_HEIGHT : PLAYER.EYE_HEIGHT);

export function playerBox(s: { x: number; y: number; z: number; sneaking?: boolean }, height?: number): number[] {
  const h = height ?? playerHeight({ sneaking: s.sneaking ?? false });
  return [s.x - HW, s.y, s.z - HW, s.x + HW, s.y + h, s.z + HW];
}


/** Người chơi đang chạm block gì (nước, dung nham, thang, mạng nhện). */
function scanEnvironment(s: PlayerState, cell: CellReader): void {
  s.inWater = s.inLava = s.onLadder = s.inWeb = false;
  const a = playerBox(s);
  for (let y = Math.floor(a[1]!); y <= Math.floor(a[4]! - 1e-6); y++)
    for (let z = Math.floor(a[2]!); z <= Math.floor(a[5]! - 1e-6); z++)
      for (let x = Math.floor(a[0]!); x <= Math.floor(a[3]! - 1e-6); x++) {
        const c = cell(x, y, z);
        if (c < 0) continue;
        const id = c & 255;
        if (id === B.WATER) s.inWater = true;
        else if (id === B.LAVA) s.inLava = true;
        else if (id === B.LADDER) s.onLadder = true;
        else if (id === B.COBWEB) s.inWeb = true;
      }
  const eye = cell(Math.floor(s.x), Math.floor(s.y + eyeHeight(s)), Math.floor(s.z));
  s.headInWater = eye >= 0 && (eye & 255) === B.WATER;
}

/** Vận tốc ngang: tiến dần về vận tốc mong muốn; trên không thì giữ đà (nhảy lúc chạy). */
function horizontal(s: PlayerState, inp: PlayerInput, liquid: boolean, dt: number): void {
  let f = inp.forward, st = inp.strafe;
  const len = Math.hypot(f, st);
  if (len > 1) {
    f /= len;
    st /= len;
  }
  const sprint = inp.sprint && f > 0 && !s.sneaking && s.hunger >= PLAYER.SPRINT_HUNGER_MIN;
  let speed = s.sneaking ? PLAYER.SNEAK_SPEED : sprint ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED;
  if (s.inWater) speed *= PLAYER.WATER_SPEED_FACTOR;
  if (s.inLava) speed *= PLAYER.LAVA_SPEED_FACTOR;
  if (!s.onGround && !liquid && !s.onLadder) speed *= PLAYER.AIR_SPEED_FACTOR; // trên không điều khiển kém hơn
  const sin = Math.sin(inp.yaw), cos = Math.cos(inp.yaw);
  const tvx = (-sin * f + cos * st) * speed;
  const tvz = (-cos * f - sin * st) * speed;
  let accel: number = s.onGround ? PLAYER.ACCEL_GROUND : liquid ? PLAYER.ACCEL_LIQUID : PLAYER.ACCEL_AIR;
  if (!s.onGround && !liquid && Math.hypot(s.vx, s.vz) > Math.hypot(tvx, tvz) + 1e-6) accel = PLAYER.AIR_DRAG;
  const k = Math.min(1, accel * dt);
  s.vx += (tvx - s.vx) * k;
  s.vz += (tvz - s.vz) * k;
  if (inp.jump && s.onGround && !liquid && !s.onLadder) s.exhaustion += sprint ? HUNGER.SPRINT_JUMP : HUNGER.JUMP;
  if (sprint && inp.jump && s.onGround && !liquid && !s.onLadder) {
    s.vx -= sin * PLAYER.SPRINT_JUMP_BOOST;
    s.vz -= cos * PLAYER.SPRINT_JUMP_BOOST;
  }
}

/** Dung nham, cháy, chết đuối (MECHANICS.md 5.5). */
function environmentDamage(s: PlayerState, dt: number): void {
  if (s.inLava) {
    hurt(s, PLAYER.LAVA_DAMAGE, "lava");
    s.burnS = PLAYER.LAVA_BURN_S;
  } else if (s.inWater) {
    s.burnS = 0;
  }
  if (s.burnS > 0 && !s.inLava) {
    s.burnS = Math.max(0, s.burnS - dt);
    s.fireTimer += dt;
    if (s.fireTimer >= 1) {
      s.fireTimer -= 1;
      hurt(s, PLAYER.FIRE_DAMAGE, "fire");
    }
  } else if (s.burnS === 0) s.fireTimer = 0;

  if (s.headInWater) {
    s.air = Math.max(0, s.air - dt);
    if (s.air === 0) {
      s.drownTimer += dt;
      if (s.drownTimer >= 1) {
        s.drownTimer -= 1;
        hurt(s, PLAYER.DROWN_DAMAGE, "drown");
      }
    }
  } else {
    s.air = Math.min(PLAYER.AIR_S, s.air + (PLAYER.AIR_S / PLAYER.AIR_REFILL_S) * dt);
    s.drownTimer = 0;
  }
}

/** Tiến một bước 1/PHYSICS_HZ giây. Sửa trực tiếp s. */
export function stepPlayer(s: PlayerState, inp: PlayerInput, cell: CellReader): void {
  const dt = PHYSICS_DT;
  if (s.dead) {
    s.vx = s.vy = s.vz = 0;
    return;
  }
  if (cell(Math.floor(s.x), Math.max(0, Math.min(127, Math.floor(s.y))), Math.floor(s.z)) < 0) {
    s.vx = s.vy = s.vz = 0;
    s.frozen = true;
    return;
  }
  s.frozen = false;
  // tư thế: ngồi ngay khi giữ Shift; thả ra thì chỉ đứng dậy khi đủ chỗ
  if (inp.sneak) s.sneaking = true;
  else if (s.sneaking && !boxBlocked(cell, playerBox(s, PLAYER.HEIGHT))) s.sneaking = false;
  scanEnvironment(s, cell);
  const liquid = s.inWater || s.inLava;

  horizontal(s, inp, liquid, dt);

  // --- dọc ---
  let dy: number;
  if (s.onLadder && !liquid) {
    if (inp.jump || (inp.forward > 0 && s.collidedH)) s.vy = PLAYER.LADDER_UP;
    else if (inp.sneak) s.vy = 0; // giữ Shift: đứng yên trên thang
    else s.vy = Math.max(s.vy - PLAYER.GRAVITY * dt, -PLAYER.LADDER_DOWN);
    dy = s.vy * dt;
  } else if (liquid) {
    const vf = s.inLava ? PLAYER.LAVA_VERTICAL_FACTOR : 1;
    const target = inp.jump ? PLAYER.SWIM_UP * vf : -PLAYER.SWIM_SINK * vf;
    s.vy += (target - s.vy) * Math.min(1, PLAYER.SWIM_ACCEL * dt);
    dy = s.vy * dt;
  } else {
    if (inp.jump && s.onGround) s.vy = JUMP_VELOCITY;
    const v0 = s.vy;
    s.vy = Math.max(s.vy - PLAYER.GRAVITY * dt, -PLAYER.TERMINAL_VELOCITY);
    dy = ((v0 + s.vy) / 2) * dt; // trung bình hai đầu: đỉnh nhảy đúng JUMP_HEIGHT
  }
  if (s.inWeb) s.vy *= MOVE.COBWEB_FACTOR; // mạng nhện hãm cả rơi lẫn nhảy

  // --- di chuyển có va chạm ---
  const wf = s.inWeb ? MOVE.COBWEB_FACTOR : 1;
  const a = playerBox(s);
  const r = moveBox(cell, a, s.vx * dt * wf, dy, s.vz * dt * wf, {
    step: PLAYER.STEP_HEIGHT,
    edgeDrop: s.sneaking && s.onGround ? PLAYER.SNEAK_EDGE : 0,
  });
  s.x = (a[0]! + a[3]!) / 2;
  s.y = a[1]!;
  s.z = (a[2]! + a[5]!) / 2;
  if (r.hitX) s.vx = 0;
  if (r.hitZ) s.vz = 0;
  if (r.landed || r.hitCeiling) s.vy = 0;
  s.onGround = r.landed;
  s.collidedH = r.hitX || r.hitZ;
  // hao sức: chạy nhanh / bơi theo quãng ngang đi được
  const moved = Math.hypot(r.dx, r.dz);
  if (s.inWater) s.exhaustion += moved * HUNGER.SWIM_PER_BLOCK;
  else if (inp.sprint && inp.forward > 0 && !s.sneaking && s.hunger >= PLAYER.SPRINT_HUNGER_MIN) s.exhaustion += moved * HUNGER.SPRINT_PER_BLOCK;

  // --- sát thương rơi: floor(quãng rơi − 3); nước, thang, mạng nhện tính lại từ đầu ---
  if (s.inWater || s.onLadder || s.inWeb) s.fallDist = 0;
  else if (r.dy < 0) s.fallDist -= r.dy;
  if (r.landed) {
    hurt(s, Math.floor(s.fallDist - PLAYER.FALL_SAFE_BLOCKS + 1e-6), "fall"); // dung sai cộng dồn số thực
    s.fallDist = 0;
  }

  environmentDamage(s, dt);
  tickSurvival(s, dt);
}
