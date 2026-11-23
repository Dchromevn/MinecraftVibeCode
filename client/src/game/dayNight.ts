// Ngày đêm phía client (Giai đoạn 7a): giờ do server gửi (lúc vào game, mỗi 5 giây, khi /time hoặc tua sáng), giữa hai
// lần gửi tự chạy 20 tick / giây. Đổi độ sáng trời trong shader chunk (uniform, không dựng lại mesh), màu trời + sương mù,
// mặt trời / mặt trăng (ảnh client.jar) quay theo giờ, ráng chiều lúc bình minh / hoàng hôn.
import * as THREE from "three";
import { DAY, DIM, NETHER, NETHER_BIOMES, celestialAngle, daylight, nightFactor } from "../../../shared/src/index.js";
import { SKY_HORIZON, SKY_ZENITH, type Sky } from "../sky.js";

const NIGHT_ZENITH = new THREE.Color(0x02040c);
const NIGHT_HORIZON = new THREE.Color(0x0b1226);
const SUNSET = new THREE.Color(0xf08a3c);
const NETHER_FOG = new THREE.Color(0x330808); // (10a) Vực Lửa: trời / sương đỏ sẫm, sương dày
const DIST = 500;
const SIZE = { sun: 90, moon: 70 };

function body(url: string, size: number): THREE.Mesh {
  const tex = new THREE.TextureLoader().load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.frustumCulled = false;
  m.renderOrder = -0.5; // sau mái vòm trời, trước thế giới
  return m;
}

export class DayNight {
  /** Số tick (giờ trong ngày = time mod 24000). */
  time: number;
  private readonly sun = body("/environment/sun.png", SIZE.sun);
  private readonly moon = body("/environment/moon.png", SIZE.moon);
  private readonly zenith = new THREE.Color();
  private readonly horizon = new THREE.Color();
  /** (10a) Cõi đang ở: Vực Lửa không có ngày đêm, mặt trời, mặt trăng. */
  dim = 0;
  /** (10b) Biome Vực Lửa ở cột (x, z) — màu sương đổi dần theo biome đang đứng. */
  netherBiome: ((x: number, z: number) => number) | null = null;
  private readonly netherFog = NETHER_FOG.clone();
  private readonly fogTarget = new THREE.Color();

  constructor(private readonly scene: THREE.Scene, private readonly sky: Sky, time: number) {
    this.time = time;
    scene.add(this.sun, this.moon);
  }

  /** Gói "time" từ server. */
  set(t: number): void {
    this.time = t;
  }

  /** Độ sáng trời hiện tại (1 ban ngày .. DAY.NIGHT_BRIGHTNESS). */
  get daylight(): number {
    return daylight(this.time);
  }

  /** (10a) Độ sáng tối thiểu (Vực Lửa: ánh sáng nền mờ). */
  get minLight(): number {
    return this.dim === DIM.NETHER ? NETHER.AMBIENT_LIGHT : 0;
  }

  /** Mỗi khung hình. underFog: mắt đang trong nước / dung nham (ViewEffects giữ màu sương riêng). */
  update(dt: number, camera: THREE.Camera, underFog: boolean): void {
    this.time += dt * DAY.TICKS_PER_S;
    if (this.dim === DIM.NETHER) {
      const u = (this.sky.mesh.material as THREE.ShaderMaterial).uniforms, c = camera.position;
      const b = this.netherBiome ? this.netherBiome(Math.floor(c.x), Math.floor(c.z)) : 0;
      this.fogTarget.setHex(NETHER_BIOMES.FOG[b] ?? 0x330808);
      this.netherFog.lerp(this.fogTarget, Math.min(1, dt * 0.8));
      (u.zenith!.value as THREE.Color).copy(this.netherFog);
      (u.horizon!.value as THREE.Color).copy(this.netherFog);
      const fog = this.scene.fog as THREE.Fog | null;
      if (fog && !underFog) {
        fog.color.copy(this.netherFog);
        fog.near = Math.min(fog.near, fog.far * 0.15);
      }
      this.sun.visible = this.moon.visible = false;
      return;
    }
    const night = nightFactor(this.time), a = celestialAngle(this.time) * Math.PI * 2;
    const sx = -Math.sin(a), sy = Math.cos(a);
    // ráng chiều khi mặt trời gần chân trời (ban ngày phía mặt trời)
    const dusk = Math.max(0, 1 - Math.abs(sy) * 3.5) * (1 - night * 0.5);
    this.zenith.copy(SKY_ZENITH).lerp(NIGHT_ZENITH, night);
    this.horizon.copy(SKY_HORIZON).lerp(NIGHT_HORIZON, night).lerp(SUNSET, dusk * 0.55);
    const u = (this.sky.mesh.material as THREE.ShaderMaterial).uniforms;
    (u.zenith!.value as THREE.Color).copy(this.zenith);
    (u.horizon!.value as THREE.Color).copy(this.horizon);
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog && !underFog) fog.color.copy(this.horizon);
    const c = camera.position;
    this.sun.position.set(c.x + sx * DIST, c.y + sy * DIST, c.z);
    this.moon.position.set(c.x - sx * DIST, c.y - sy * DIST, c.z);
    this.sun.lookAt(c);
    this.moon.lookAt(c);
    this.sun.visible = sy > -0.2;
    this.moon.visible = sy < 0.2;
  }
}
