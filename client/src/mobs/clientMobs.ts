// Sinh vật phía client (Giai đoạn 7a): server gửi con nào mới / đổi (gói nhị phân MOBS); client vẽ trễ NET.INTERP_DELAY_MS
// và nội suy như người chơi khác. Cử động chân / tay theo tốc độ, nháy đỏ khi trúng đòn, ngã nghiêng khi chết, cháy
// thì có lửa, muốn phối giống thì có tim; độ sáng theo ánh sáng tại chỗ (trời × giờ, block) như mesh chunk.
// 7b: quái nổ phồng + nháy trắng khi sắp nổ, kẻ hư không cầm khối, cánh bóng ma đêm vỗ, thân đốt của mọt uốn, khối nhầy theo cỡ.
import * as THREE from "three";
import {
  BLOCKS, MOB_DEFS, MOB_FLAG, NET, RIDE, TEMPERATURE_VARIANTS, hasTemperatureVariant, mobBox, mobScale, rayBox, type MobKey, type NetMob, type World,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import type { Particles } from "../fx/particles.js";
import { blockTiles, setBoxTiles } from "../interact/boxMesh.js";
import { CageMobs } from "./cageMobs.js";
import { LeashLines } from "./leashLines.js";

/** (7d) Từ netClient: thú đang được cưỡi (id → chỗ ngồi của người cưỡi, hướng) và vị trí người chơi (đầu dây dắt). */
export interface MobView {
  riders: Map<number, { x: number; y: number; z: number; yaw: number }>;
  player(id: number): { x: number; y: number; z: number } | null;
  self: number; // thú mình đang cưỡi (tia nhìn bỏ qua)
}
import { buildMobModel, type MobModel } from "./mobModels.js";
import { FLEECE, modelKey, pose7c, setup7c, skinName } from "./mobPose7c.js";
import { attachHeld8a } from "./mobPose8a.js";
import { attachHeld8c, castFx8c } from "./mobPose8c.js";
import { glow10d } from "./mobPose10d.js";

const HURT_S = 0.4;
const HURT = new THREE.Color(1, 0.4, 0.4);

interface CMob {
  id: number;
  key: MobKey;
  model: MobModel;
  buf: { t: number; v: NetMob }[];
  phase: number;
  hurtT: number;
  dyingT: number;
  fxT: number;
  fuseT: number; // quái nổ: đã xì bao lâu (phồng, nháy trắng)
  carry: number; // kẻ hư không: id khối đang cầm đã vẽ
  carryMesh: THREE.Mesh | null;
  at: NetMob | null; // trạng thái đang vẽ
  skin: string; // (7c) ảnh đang dùng (đổi khi sói thuần / giận, cáo ngủ)
  rideAt: { x: number; z: number } | null; // (7d) vị trí khung trước khi đang được cưỡi (tính tốc độ bước chân)
  tint: THREE.Color | null; // (7c) màu thân (cá nhiệt đới)
  t: number; // (7c) đồng hồ riêng: cánh dơi, xúc tu, đuôi cá
}

const textures = new Map<string, THREE.Texture>();
function skin(name: string): THREE.Texture {
  let t = textures.get(name);
  if (!t) {
    t = new THREE.TextureLoader().load(`/entities/mobs/${name}.png`);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(name, t);
  }
  return t;
}

const lightCurve = (f: number): number => {
  f = Math.max(0, Math.min(1, f));
  return Math.max(0.004, Math.pow(f / (3 - 2 * f), 1.6));
};

const lerpAngle = (a: number, b: number, k: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

export class ClientMobs {
  private readonly map = new Map<number, CMob>();
  /** Độ sáng ban ngày hiện tại (DayNight đặt). */
  daylight = 1;
  minLight = 0;
  private readonly color = new THREE.Color();

  /** Quái nhỏ quay trong lồng sinh quái. */
  private readonly cages: CageMobs;
  private selfRide = 0;
  /** (7d) Dây dắt. */
  readonly leashes: LeashLines;

  constructor(private readonly scene: THREE.Scene, private readonly world: World, private readonly fx: Particles, private readonly atlas: Atlas) {
    this.cages = new CageMobs(scene, world, skin, (x, y, z) => this.brightness(x, y, z));
    this.leashes = new LeashLines(scene);
  }

  get count(): number {
    return this.map.size;
  }

  private create(v: NetMob): CMob {
    const def = MOB_DEFS[v.kind]!, key = def.key;
    const name = skinName(key, v) ?? (hasTemperatureVariant(key) ? `${key}_${TEMPERATURE_VARIANTS[v.variant] ?? "temperate"}` : key);
    const model = buildMobModel(modelKey(key, v.id), skin(name), skin);
    const tint = setup7c(model, key, v.id, skin, v.variant);
    attachHeld8a(model, key, this.atlas); // (8b) nỏ trên tay kẻ cướp; (8c) rìu đao phủ, kiếm tiểu quỷ
    attachHeld8c(model, key, this.atlas);
    if (model.overlayMat) model.overlayMat.userData.base = new THREE.Color(key === "sheep" ? FLEECE[v.variant & 15]! : 0xffffff);
    this.scene.add(model.root);
    const m: CMob = { id: v.id, key, model, buf: [], phase: 0, hurtT: 0, dyingT: 0, fxT: 0, fuseT: 0, carry: 0, carryMesh: null, at: null, skin: name, tint, t: 0, rideAt: null };
    this.map.set(v.id, m);
    return m;
  }

  /** Gói MOBS. */
  /** (10a) Đổi cõi: bỏ hết. */
  clear(): void {
    this.apply([], [...this.map.keys()]);
  }

  apply(up: NetMob[], gone: number[]): void {
    const now = performance.now();
    for (const id of gone) {
      const m = this.map.get(id);
      if (m) this.scene.remove(m.model.root);
      this.map.delete(id);
    }
    for (const v of up) {
      const m = this.map.get(v.id) ?? this.create(v);
      const last = m.buf[m.buf.length - 1];
      // đứng yên lâu không gửi: chèn lại mốc cũ ngay trước gói mới để nội suy không trượt chậm từ quá khứ xa
      if (last && now - last.t > 150) m.buf.push({ t: now - 50, v: last.v });
      m.buf.push({ t: now, v });
      if (m.buf.length > 30) m.buf.shift();
    }
  }

  /** Gói "mobHurt": nháy đỏ (chí mạng: hạt chí mạng). */
  hurt(id: number, crit: boolean): void {
    const m = this.map.get(id);
    if (!m) return;
    m.hurtT = HURT_S;
    if (crit && m.at) this.fx.critBurst(m.at.x, m.at.y, m.at.z);
  }

  /** Sinh vật gần nhất bị tia (o, d — d đơn vị) trúng trong khoảng max. */
  pick(o: readonly number[], d: readonly number[], max: number): { id: number; dist: number } | null {
    let best: { id: number; dist: number } | null = null;
    for (const m of this.map.values()) {
      const v = m.at;
      if (!v || v.flags & MOB_FLAG.DYING || m.id === this.selfRide) continue;
      const def = MOB_DEFS[v.kind]!, box = mobBox(def, v.x, v.y, v.z, mobScale(def, (v.flags & MOB_FLAG.BABY) !== 0, v.variant));
      const t = rayBox(o, d, box);
      if (t !== null && t <= max && (!best || t < best.dist)) best = { id: m.id, dist: t };
    }
    return best;
  }

  /** Độ sáng tại ô như shader chunk. */
  private brightness(x: number, y: number, z: number): number {
    const raw = this.world.lightRaw(Math.floor(x), Math.floor(y), Math.floor(z));
    if (raw < 0) return this.daylight;
    return Math.max(lightCurve((raw >> 4) / 15) * this.daylight, lightCurve((raw & 15) / 15), this.minLight, 0.05);
  }

  update(dt: number, cam?: THREE.Vector3, view?: MobView): void {
    if (cam) this.cages.update(dt, cam);
    this.selfRide = view?.self ?? 0;
    const at = performance.now() - NET.INTERP_DELAY_MS;
    for (const m of this.map.values()) {
      if (!m.buf.length) continue;
      while (m.buf.length > 2 && m.buf[1]!.t <= at) m.buf.shift();
      const a = m.buf[0]!, b = m.buf[1] ?? a;
      const k = b.t > a.t ? Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t))) : 1;
      const v: NetMob = { ...b.v, x: a.v.x + (b.v.x - a.v.x) * k, y: a.v.y + (b.v.y - a.v.y) * k, z: a.v.z + (b.v.z - a.v.z) * k,
        yaw: lerpAngle(a.v.yaw, b.v.yaw, k), pitch: a.v.pitch + (b.v.pitch - a.v.pitch) * k };
      let speed = b.t > a.t ? Math.hypot(b.v.x - a.v.x, b.v.z - a.v.z) / ((b.t - a.t) / 1000) : 0;
      const r = view?.riders.get(m.id); // (7d) đang được cưỡi: vẽ ngay dưới người cưỡi (không trễ, không lệch)
      if (r) {
        const nx = r.x, ny = r.y - (RIDE.SEAT[m.key] ?? 0.6), nz = r.z;
        speed = m.rideAt && dt > 0 ? Math.hypot(nx - m.rideAt.x, nz - m.rideAt.z) / dt : 0;
        m.rideAt = { x: nx, z: nz };
        Object.assign(v, { x: nx, y: ny, z: nz, yaw: r.yaw, pitch: 0 });
      } else m.rideAt = null;
      m.at = v;
      this.pose(m, v, speed, dt);
    }
    if (view) // dây dắt: cổ con vật (60% chiều cao) ↔ đầu dây
      this.leashes.update((id) => {
        const v = this.map.get(id)?.at;
        if (!v) return null;
        const d = MOB_DEFS[v.kind]!;
        return { x: v.x, y: v.y + d.height * mobScale(d, (v.flags & MOB_FLAG.BABY) !== 0, v.variant) * 0.6, z: v.z };
      }, view.player);
  }

  private pose(m: CMob, v: NetMob, speed: number, dt: number): void {
    const r = m.model.root, P = m.model.parts, baby = (v.flags & MOB_FLAG.BABY) !== 0, def = MOB_DEFS[v.kind]!;
    const scale = mobScale(def, baby, v.variant);
    r.position.set(v.x, v.y, v.z);
    r.rotation.set(0, v.yaw + Math.PI, 0);
    // quái nổ sắp nổ: phồng to dần, nháy trắng
    m.fuseT = v.flags & MOB_FLAG.FUSE ? m.fuseT + dt : Math.max(0, m.fuseT - dt);
    const swell = Math.min(1, m.fuseT / 1.5);
    r.scale.setScalar(scale * (1 + swell * swell * 0.25));
    // chết: ngã nghiêng trong 1 giây
    if (v.flags & MOB_FLAG.DYING) m.dyingT = Math.min(1, m.dyingT + dt);
    r.rotation.z = (m.dyingT * Math.PI) / 2;
    m.phase += dt * Math.min(speed, 6) * 3.2;
    const amp = Math.min(1, speed / 2) * 0.9, s = Math.sin(m.phase) * amp;
    const set = (name: string, x: number, y = 0, z = 0): void => {
      for (const g of [P.get(name), ...m.model.layers.map((l) => l.get(name))]) {
        if (!g) continue;
        const rest = g.userData.rest as THREE.Euler;
        g.rotation.set(rest.x + x, rest.y + y, rest.z + z);
      }
    };
    for (const [n, sg] of [["rLeg", 1], ["lLeg", -1], ["rLegB", 1], ["lLegF", 1], ["lLegB", -1], ["rLegF", -1],
      ["right_hind_leg", 1], ["left_front_leg", 1], ["left_hind_leg", -1], ["right_front_leg", -1]] as const) set(n, s * sg);
    set("head", -v.pitch);
    set("hat", 0);
    const carrying = m.key === "enderman" && v.variant > 0;
    if (carrying) {
      set("rArm", -0.5);
      set("lArm", -0.5);
    } else if (m.key === "zombie" || m.key === "husk" || m.key === "drowned" || ((m.key === "skeleton" || m.key === "stray" || m.key === "wither_skeleton") && v.flags & MOB_FLAG.ANGRY)) { // (10c) bộ xương héo giơ tay khi đuổi
      set("rArm", -Math.PI / 2 - v.pitch + s * 0.1);
      set("lArm", -Math.PI / 2 - v.pitch - s * 0.1);
    } else {
      set("rArm", -s * 0.8);
      set("lArm", s * 0.8);
    }
    for (let i = 0; i < 4; i++) {
      const w = Math.sin(m.phase + i * 1.3) * amp * 0.4;
      set(`rLeg${i}`, 0, w, -Math.abs(w) * 0.5);
      set(`lLeg${i}`, 0, -w, Math.abs(w) * 0.5);
    }
    const flap = m.key === "chicken" && speed > 0.1 ? Math.sin(m.phase * 3) * 0.6 : 0;
    set("rWing", 0, 0, flap);
    set("lWing", 0, 0, -flap);
    this.extras(m, v, dt, carrying);
    m.t += dt;
    pose7c(m.model, m.key, v, m.phase, m.t, amp, set);
    const sk = skinName(m.key, v);
    if (sk && sk !== m.skin) { // đổi ảnh (sói thuần / giận, cáo ngủ)
      m.skin = sk;
      for (const mat of m.model.materials) mat.map = skin(sk);
    }
    // lông cừu: ẩn khi đã tỉa
    if (m.key === "sheep") for (const g of m.model.overlay.values()) g.visible = !(v.flags & MOB_FLAG.SHEARED);
    // màu: ánh sáng × nháy đỏ
    m.hurtT = Math.max(0, m.hurtT - dt);
    const L = m.key === "glow_squid" ? 1 : this.brightness(v.x, v.y + 0.6, v.z); // mực phát sáng: không tối
    this.color.setScalar(L);
    if (m.hurtT > 0 || v.flags & MOB_FLAG.DYING) this.color.multiply(HURT);
    if (swell > 0 && Math.floor(m.fuseT * 8) % 2 === 0) this.color.setScalar(1.6); // nháy trắng
    for (const mat of m.model.materials) mat.color.copy(this.color);
    if (m.tint) for (const mat of m.model.materials) mat.color.multiply(m.tint);
    if (m.model.overlayMat) m.model.overlayMat.color.copy(this.color).multiply(m.model.overlayMat.userData.base as THREE.Color);
    for (const l of m.model.extra.values()) l.mat.color.copy(this.color).multiply(l.mat.userData.base as THREE.Color);
    glow10d(m.model, v); // (10d1) Phát sáng
    castFx8c(this.fx, m.key, v, dt); // (8c) hạt phép của pháp sư
    m.fxT -= dt;
    if (m.fxT <= 0 && v.flags & (MOB_FLAG.BURNING | MOB_FLAG.LOVE)) {
      m.fxT = v.flags & MOB_FLAG.BURNING ? 0.08 : 0.6;
      const w = def.width * scale, h = def.height * scale;
      const x = v.x + (Math.random() - 0.5) * w, y = v.y + Math.random() * h, z = v.z + (Math.random() - 0.5) * w;
      if (v.flags & MOB_FLAG.BURNING) this.fx.flame(x, y, z);
      else this.fx.heart(x, v.y + h + 0.3, z);
    }
  }

  /** Cử động riêng 7b: cánh bóng ma đêm vỗ, thân đốt mọt uốn, kẻ hư không cầm khối giữa hai tay. */
  private extras(m: CMob, v: NetMob, dt: number, carrying: boolean): void {
    const P = m.model.parts;
    if (m.key === "phantom") {
      m.phase += dt * 6;
      const a = Math.sin(m.phase) * 0.5;
      for (const [n, s] of [["lWing", 1], ["lWingTip", 1], ["rWing", -1], ["rWingTip", -1]] as const) {
        const g = P.get(n);
        if (g) g.rotation.z = (g.userData.rest as THREE.Euler).z + a * s;
      }
    }
    if (m.key === "silverfish" || m.key === "endermite") {
      for (let i = 0; i < 8; i++) {
        const g = P.get(`seg${i}`);
        if (g) g.rotation.y = Math.cos(m.phase * 0.9 + i * 0.15 * Math.PI) * 0.1 * (1 + Math.abs(i - 2));
      }
    }
    if (m.key !== "enderman" || v.variant === m.carry) return;
    // đổi khối đang cầm
    if (m.carryMesh) m.model.body.remove(m.carryMesh);
    m.carryMesh = null;
    m.carry = v.variant;
    if (!carrying || !BLOCKS[v.variant]) return;
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    setBoxTiles(geo, blockTiles(this.atlas, v.variant));
    m.carryMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.atlas.texture, alphaTest: 0.1 }));
    m.carryMesh.position.set(0, 2.05, 0.55);
    m.model.body.add(m.carryMesh);
    m.model.materials.push(m.carryMesh.material as THREE.MeshBasicMaterial);
  }
}