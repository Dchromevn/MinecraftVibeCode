// Vật lý người chơi (DESIGN.md 2.6): hàm bước thuần túy, xác định, bước cố định
// 1/PHYSICS_HZ giây — client chạy để dự đoán, server (Giai đoạn 5) chạy lại để kiểm tra.
import { B } from "./blocks.js";
import { MOVE, PLAYER } from "./constants.js";
import { moveBox, type CellReader } from "./collide.js";

export interface PlayerState {
  x: number; // giữa chân
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  inWater: boolean;
  inLava: boolean;
  onLadder: boolean;
  inWeb: boolean;
  collidedH: boolean;
  frozen: boolean; // chunk dưới chân chưa tải: đứng yên
  health: number; // Giai đoạn 3 chỉ lưu số (dung nham, cháy)
  burnS: number; // còn cháy bao lâu sau khi ra khỏi dung nham
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
    onGround: false, inWater: false, inLava: false, onLadder: false, inWeb: false,
    collidedH: false, frozen: false, health: PLAYER.MAX_HEALTH, burnS: 0,
  };
}

export function playerBox(s: { x: number; y: number; z: number }): number[] {
  return [s.x - HW, s.y, s.z - HW, s.x + HW, s.y + PLAYER.HEIGHT, s.z + HW];
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
}

/** Tiến một bước 1/PHYSICS_HZ giây. Sửa trực tiếp s. */
export function stepPlayer(s: PlayerState, inp: PlayerInput, cell: CellReader): void {
  const dt = PHYSICS_DT;
  if (cell(Math.floor(s.x), Math.max(0, Math.min(127, Math.floor(s.y))), Math.floor(s.z)) < 0) {
    s.vx = s.vy = s.vz = 0;
    s.frozen = true;
    return;
  }
  s.frozen = false;
  scanEnvironment(s, cell);
  const liquid = s.inWater || s.inLava;

  // --- ngang: tiến dần về vận tốc mong muốn ---
  let f = inp.forward, st = inp.strafe;
  const len = Math.hypot(f, st);
  if (len > 1) {
    f /= len;
    st /= len;
  }
  let speed = inp.sneak ? PLAYER.SNEAK_SPEED : inp.sprint && f > 0 ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED;
  if (s.inWater) speed *= PLAYER.WATER_SPEED_FACTOR;
  if (s.inLava) speed *= PLAYER.LAVA_SPEED_FACTOR;
  const sin = Math.sin(inp.yaw), cos = Math.cos(inp.yaw);
  const tvx = (-sin * f + cos * st) * speed;
  const tvz = (-cos * f - sin * st) * speed;
  const accel = s.onGround ? PLAYER.ACCEL_GROUND : liquid ? PLAYER.ACCEL_LIQUID : PLAYER.ACCEL_AIR;
  const k = Math.min(1, accel * dt);
  s.vx += (tvx - s.vx) * k;
  s.vz += (tvz - s.vz) * k;

  // --- dọc ---
  let dy: number;
  if (s.onLadder && !liquid) {
    if (inp.jump || (f > 0 && s.collidedH)) s.vy = PLAYER.LADDER_UP;
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
    sneakEdge: inp.sneak && s.onGround,
  });
  s.x = (a[0]! + a[3]!) / 2;
  s.y = a[1]!;
  s.z = (a[2]! + a[5]!) / 2;
  if (r.hitX) s.vx = 0;
  if (r.hitZ) s.vz = 0;
  if (r.landed || r.hitCeiling) s.vy = 0;
  s.onGround = r.landed;
  s.collidedH = r.hitX || r.hitZ;

  // --- dung nham, cháy (chỉ lưu số máu ở Giai đoạn 3) ---
  if (s.inLava) {
    s.health -= PLAYER.LAVA_DAMAGE_PER_S * dt;
    s.burnS = PLAYER.LAVA_BURN_AFTER_S;
  } else if (s.inWater) {
    s.burnS = 0;
  } else if (s.burnS > 0) {
    s.burnS = Math.max(0, s.burnS - dt);
    s.health -= PLAYER.FIRE_DAMAGE_PER_S * dt;
  }
  s.health = Math.max(0, s.health);
}
