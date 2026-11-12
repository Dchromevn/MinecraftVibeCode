// Hiệu ứng góc nhìn: FOV rộng ra khi chạy nhanh, ám màu + sương dày khi mắt ở trong
// nước / dung nham.
import * as THREE from "three";
import { B, PLAYER, type World } from "../../../shared/src/index.js";

const WATER_TINT = "rgba(24, 64, 150, 0.38)";
const LAVA_TINT = "rgba(210, 80, 10, 0.7)";
const WATER_FOG = { color: new THREE.Color(0x14306a), near: 0.5, far: 18 };
const LAVA_FOG = { color: new THREE.Color(0xc04008), near: 0.1, far: 2.5 };

export class ViewEffects {
  private readonly overlay: HTMLDivElement;
  private fov = PLAYER.FOV;
  private readonly normalFog = { color: new THREE.Color(), near: 0, far: 0 };
  private wasInside = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly world: World,
  ) {
    this.overlay = document.getElementById("tint") as HTMLDivElement;
  }

  /** Gọi sau khi đổi tầm nhìn (sương mù gốc thay đổi). */
  fogChanged(): void {
    this.wasInside = false;
  }

  /** Mắt đang ở trong block gì: "water" | "lava" | null. */
  eyeIn(): "water" | "lava" | null {
    const p = this.camera.position;
    const id = this.world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
    return id === B.WATER ? "water" : id === B.LAVA ? "lava" : null;
  }

  update(dt: number, sprinting: boolean): void {
    const target = PLAYER.FOV * (sprinting ? PLAYER.SPRINT_FOV_FACTOR : 1);
    this.fov += (target - this.fov) * Math.min(1, dt * 10);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    const inside = this.eyeIn();
    const fog = this.scene.fog as THREE.Fog | null;
    if (!fog) return;
    if (!inside) {
      if (this.wasInside) {
        fog.color.copy(this.normalFog.color);
        fog.near = this.normalFog.near;
        fog.far = this.normalFog.far;
      }
      this.wasInside = false;
      this.overlay.style.display = "none";
      return;
    }
    if (!this.wasInside) {
      this.normalFog.color.copy(fog.color);
      this.normalFog.near = fog.near;
      this.normalFog.far = fog.far;
    }
    this.wasInside = true;
    const f = inside === "water" ? WATER_FOG : LAVA_FOG;
    fog.color.copy(f.color);
    fog.near = f.near;
    fog.far = f.far;
    this.overlay.style.display = "block";
    this.overlay.style.background = inside === "water" ? WATER_TINT : LAVA_TINT;
  }
}
