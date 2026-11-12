// Camera bay tự do (chế độ bay debug, phím F): WASD, Space lên, C xuống, Shift bay nhanh.
// Cũng giữ chuột nhìn (pointer lock) và trạng thái phím cho bộ điều khiển người chơi.
import * as THREE from "three";
import { PLAYER } from "../../shared/src/index.js";

const SENSITIVITY = 0.002;
const SPEED = PLAYER.FLY_SPEED; // block/giây
const FAST_MULT = 3; // giữ Shift

/** Khóa chuột; bỏ qua lỗi (trình duyệt từ chối khi chưa có thao tác người dùng / headless). */
export function lockPointer(el: HTMLElement): void {
  try {
    const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
    r?.catch?.(() => undefined);
  } catch {
    /* bỏ qua */
  }
}

export class FlyCamera {
  yaw = 0;
  pitch = 0;
  readonly keys = new Set<string>();
  private readonly dir = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLElement,
  ) {
    dom.addEventListener("click", () => {
      if (!this.locked) lockPointer(dom);
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

  /** Áp yaw/pitch lên camera (dùng cả khi đi bộ). */
  applyRotation(): void {
    const cam = this.camera;
    cam.rotation.set(0, 0, 0, "YXZ");
    cam.rotation.y = this.yaw;
    cam.rotation.x = this.pitch;
  }

  /** Bay: xoay + di chuyển camera xuyên block. */
  update(dt: number): void {
    const cam = this.camera;
    this.applyRotation();
    if (!this.locked) return;
    const k = this.keys;
    const forward = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const strafe = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const up = (k.has("Space") ? 1 : 0) - (k.has("KeyC") ? 1 : 0);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // hướng ngang theo yaw (không theo pitch) để bay ổn định
    this.dir.set(-sin * forward + cos * strafe, up, -cos * forward - sin * strafe);
    if (this.dir.lengthSq() === 0) return;
    this.dir.normalize();
    const speed = SPEED * (k.has("ShiftLeft") || k.has("ShiftRight") ? FAST_MULT : 1);
    cam.position.addScaledVector(this.dir, speed * dt);
  }
}
