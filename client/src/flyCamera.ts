// Camera bay tự do để xem thế giới: WASD, Space lên, Shift xuống, chuột nhìn (pointer lock).
import * as THREE from "three";

const SENSITIVITY = 0.002;
const SPEED = 24; // block/giây
const FAST_MULT = 3; // giữ Ctrl

export class FlyCamera {
  yaw = 0;
  pitch = 0;
  private readonly keys = new Set<string>();
  private readonly dir = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLElement,
  ) {
    dom.addEventListener("click", () => {
      if (!this.locked) dom.requestPointerLock();
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * SENSITIVITY;
      this.pitch -= e.movementY * SENSITIVITY;
      const lim = Math.PI / 2 - 0.001;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
    document.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  get locked(): boolean {
    return document.pointerLockElement === this.dom;
  }

  update(dt: number): void {
    const cam = this.camera;
    cam.rotation.set(0, 0, 0, "YXZ");
    cam.rotation.y = this.yaw;
    cam.rotation.x = this.pitch;

    if (!this.locked) return;
    const k = this.keys;
    const forward = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const strafe = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const up = (k.has("Space") ? 1 : 0) - (k.has("ShiftLeft") || k.has("ShiftRight") ? 1 : 0);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // hướng ngang theo yaw (không theo pitch) để bay ổn định
    this.dir.set(-sin * forward + cos * strafe, up, -cos * forward - sin * strafe);
    if (this.dir.lengthSq() === 0) return;
    this.dir.normalize();
    const speed = SPEED * (k.has("ControlLeft") ? FAST_MULT : 1);
    cam.position.addScaledVector(this.dir, speed * dt);
  }
}
