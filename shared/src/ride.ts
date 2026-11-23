// Cưỡi thú (Giai đoạn 7d; MECHANICS.md 8.4): khi cưỡi, bước vật lý của người chơi chạy thân con thú (stepMobBody với tốc độ,
// độ nhảy, bước lên 1 block của con thú) — client đoán trước, server tính lại như đi bộ (5c). Vị trí người chơi = chỗ ngồi (chân
// thú + rideSeat), nên tầm với / đòn đánh / khoảng cách không phải sửa. Giữ phím nhảy để tích lực, nhả ra thì nhảy; Shift: xuống.
import { boxBlocked, type CellReader } from "./collide.js";
import { MOB_AI, RIDE } from "./mobConstants.js";
import { CAMEL } from "./villageConstants.js";
import { lavaSolid, stepMobBody, type MobBody } from "./mobPhysics.js";
import { STRIDER } from "./netherMobConstants.js";
import { B } from "./blocks.js";
import { PHYSICS_DT, playerBox, scanEnvironment, type PlayerInput, type PlayerState } from "./physics.js";

/** Trạng thái đang cưỡi (số, để gói STATE gửi kèm như các trường khác); rideId = 0: không cưỡi. */
export interface RideState {
  rideId: number; // id sinh vật đang cưỡi
  rideSeat: number; // chân người cao hơn chân thú
  rideW: number; // cỡ thân thú
  rideH: number;
  rideSpeed: number; // block / giây
  rideJump: number; // độ cao nhảy tối đa
  rideCharge: number; // đang tích lực nhảy (giây)
  rideControl: number; // 1 = điều khiển được (đã thuần + có yên)
  rideHurt: number; // sát thương rơi của thú dồn lại (server trừ vào thú rồi đặt 0)
  rideFall: number; // thú đang rơi bao xa
  // (8a) lạc đà: Space = lướt; người ngồi sau không điều khiển (server đặt vị trí theo lạc đà)
  rideDash: number; // 1 = thú lướt được (lạc đà)
  rideDashT: number; // đang lướt: còn bao lâu
  rideDashCd: number; // chờ lướt lại
  rideBack: number; // 1 = ngồi sau
  // (10b) kẻ lội dung nham (rideDash = 2): đi trên dung nham; rideControl = 2 khi cầm cần câu nấm (tự đi theo hướng nhìn)
  rideBoostT: number; // đang tăng tốc: đã được bao lâu (giây)
  rideBoostLen: number; // tổng thời gian tăng tốc (0 = không)
}

/** (8a) Món cho thú cưỡi ăn được khi đang ngồi trên lưng (ngựa / lừa / la: lúa mì, táo, táo vàng, khối rơm; lạc đà: xương rồng). */
export const isRideFood = (k: string | undefined): boolean => !!k && (!!RIDE.FEED[k] || k === "cactus");

/** (8a) Cờ trong gói vị trí người chơi: đang ngồi sau (thú do người khác lái). */
export const RIDE_BACK_FLAG = 0x40000000;

export const createRide = (): RideState => ({
  rideId: 0, rideSeat: 0, rideW: 0, rideH: 0, rideSpeed: 0, rideJump: 0, rideCharge: 0, rideControl: 0, rideHurt: 0, rideFall: 0,
  rideDash: 0, rideDashT: 0, rideDashCd: 0, rideBack: 0, rideBoostT: 0, rideBoostLen: 0,
});

/** (10b) Kẻ lội dung nham: tốc độ cưỡi theo chỗ đứng (trên dung nham / trên cạn) và đang tăng tốc (đỉnh +115% giữa lượt). */
export function striderRideSpeed(s: RideState, onLava: boolean): number {
  const base = onLava ? STRIDER.RIDE_LAVA : STRIDER.RIDE_LAND;
  if (s.rideBoostLen <= 0) return base;
  return base * (1 + STRIDER.BOOST_PEAK * Math.sin((Math.min(s.rideBoostT, s.rideBoostLen) / s.rideBoostLen) * Math.PI));
}

/** Xuống thú: đặt người chơi cạnh thú (trái, phải, sau, trước), không được thì đứng trên lưng. */
export function dismount(s: PlayerState, cell: CellReader, yaw: number): void {
  const mx = s.x, my = s.y - s.rideSeat, mz = s.z, d = s.rideW / 2 + 0.5;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  s.rideId = 0;
  s.rideCharge = 0;
  s.rideBack = 0;
  s.rideDashT = 0;
  s.vx = s.vy = s.vz = 0;
  for (const [dx, dz] of [[cos, -sin], [-cos, sin], [sin, cos], [-sin, -cos]] as const)
    for (const dy of [0, 1]) {
      const p = { x: mx + dx * d, y: Math.floor(my) + dy, z: mz + dz * d };
      if (!boxBlocked(cell, playerBox(p))) return void Object.assign(s, p, { fallDist: 0 });
    }
  Object.assign(s, { x: mx, y: my + s.rideH, z: mz, fallDist: 0 });
}

/** Một bước vật lý khi đang cưỡi. */
export function stepRide(s: PlayerState, inp: PlayerInput, cell: CellReader): void {
  const dt = PHYSICS_DT;
  if (inp.sneak) return dismount(s, cell, inp.yaw);
  if (s.rideBack) return; // (8a) ngồi sau: server đặt vị trí theo con thú
  const body: MobBody = {
    x: s.x, y: s.y - s.rideSeat, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, onGround: s.onGround, collidedH: s.collidedH,
    inWater: false, inLava: false, inFire: false, inCactus: false, inWeb: false, headInWater: false, fallDist: s.rideFall,
  };
  let tvx = 0, tvz = 0, jump = false, jumpV = 0;
  const sin = Math.sin(inp.yaw), cos = Math.cos(inp.yaw);
  const strider = s.rideDash === 2, c = strider ? lavaSolid(cell) : cell;
  if (strider) { // (10b) kẻ lội dung nham: cầm cần câu nấm thì tự đi theo hướng nhìn
    if (s.rideBoostLen > 0 && (s.rideBoostT += dt) >= s.rideBoostLen) s.rideBoostT = s.rideBoostLen = 0;
    if (s.rideControl === 2) {
      const below = cell(Math.floor(s.x), Math.floor(s.y - s.rideSeat - 0.5), Math.floor(s.z));
      const v = striderRideSpeed(s, below >= 0 && (below & 255) === B.LAVA);
      tvx = -sin * v;
      tvz = -cos * v;
    }
  } else if (s.rideControl) {
    const f = inp.forward < 0 ? inp.forward * RIDE.BACK : inp.forward, st = inp.strafe * RIDE.STRAFE;
    tvx = (-sin * f + cos * st) * s.rideSpeed;
    tvz = (-cos * f - sin * st) * s.rideSpeed;
    s.rideDashCd = Math.max(0, s.rideDashCd - dt);
    if (s.rideDash) { // (8a) lạc đà: Space lướt về phía trước
      if (inp.jump && body.onGround && s.rideDashCd <= 0) {
        s.rideDashT = CAMEL.DASH_S;
        s.rideDashCd = CAMEL.DASH_CD_S;
        jump = true;
        jumpV = Math.sqrt(2 * MOB_AI.GRAVITY * CAMEL.DASH_JUMP);
      }
      if (s.rideDashT > 0) { // đang lướt: giữ vận tốc lướt (cả khi đang bật lên)
        s.rideDashT = Math.max(0, s.rideDashT - dt);
        body.vx = tvx = -sin * CAMEL.DASH_SPEED;
        body.vz = tvz = -cos * CAMEL.DASH_SPEED;
      }
    } else if (inp.jump) {
      if (body.onGround) s.rideCharge = Math.min(RIDE.CHARGE_S, s.rideCharge + dt);
    } else if (s.rideCharge > 0) {
      const frac = RIDE.JUMP_MIN + (1 - RIDE.JUMP_MIN) * (s.rideCharge / RIDE.CHARGE_S);
      jump = body.onGround;
      jumpV = Math.sqrt(2 * MOB_AI.GRAVITY * s.rideJump * frac);
      s.rideCharge = 0;
    }
  }
  const dmg = stepMobBody(body, s.rideW, s.rideH, s.rideH * 0.9, { vx: tvx, vz: tvz, jump, jumpV, step: RIDE.STEP, fallSafe: RIDE.FALL_SAFE }, c, dt);
  Object.assign(s, { x: body.x, y: body.y + s.rideSeat, z: body.z, vx: body.vx, vy: body.vy, vz: body.vz });
  s.onGround = body.onGround;
  s.collidedH = body.collidedH;
  s.rideFall = body.fallDist;
  s.rideHurt += dmg;
  s.fallDist = 0; // người cưỡi không mất máu vì rơi
  s.landFall = 0;
  s.sneaking = false;
  scanEnvironment(s, cell); // nước / lửa / dung nham quanh người ngồi trên lưng
}
