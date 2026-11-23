// Góc nhìn (F5): thứ nhất → sau lưng → trước mặt (nhìn chính diện nhân vật). Camera mắt (`eye`) vẫn là nguồn cho mọi logic
// (tia ngắm đào / đặt / đánh, nạp chunk, mắt trong nước); góc nhìn thứ 3 chỉ đổi camera dùng để VẼ: lùi / tiến theo hướng
// nhìn tối đa DIST block, dừng trước block có va chạm (không nhìn xuyên tường). Vẽ mô hình chính mình như người chơi khác.
import * as THREE from "three";
import { BLOCKS, PLAYER, RIDE_BACK_FLAG, type Inventory, type World } from "../../../shared/src/index.js";
import { SELF_ID, type RemotePlayers } from "../net/remotePlayers.js";
import type { PlayerController } from "./playerController.js";

const DIST = 4; // block
const STEP = 0.05;
const MARGIN = 0.2; // camera dừng cách mặt block
const SPREAD = 0.1; // dò thêm 4 tia lệch quanh tia giữa (camera có bề rộng)

/** 0 = góc nhìn thứ nhất, 1 = sau lưng, 2 = trước mặt. */
export const ViewMode = { First: 0, Back: 1, Front: 2 } as const;
type Mode = (typeof ViewMode)[keyof typeof ViewMode];

export interface ThirdPersonDeps {
  eye: THREE.PerspectiveCamera;
  player: PlayerController;
  world: World;
  remote: RemotePlayers;
  inv: Inventory;
  yaw: () => number;
  pitch: () => number;
  swings: () => number;
  blocking: () => boolean;
  drawing: () => boolean;
  sleeping: () => boolean;
}

export class ThirdPerson {
  mode: Mode = ViewMode.First;
  private readonly view = new THREE.PerspectiveCamera();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly up = new THREE.Vector3();

  constructor(private readonly d: ThirdPersonDeps) {
    document.addEventListener("keydown", (e) => {
      if (e.code !== "F5") return;
      e.preventDefault(); // trình duyệt: F5 = tải lại trang
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.mode = ((this.mode + 1) % 3) as Mode;
      document.getElementById("crosshair")?.style.setProperty("display", this.mode === ViewMode.First ? "" : "none");
    });
  }

  /** Mỗi khung: cập nhật mô hình chính mình, trả về camera để vẽ (góc nhìn thứ nhất: chính camera mắt). */
  frame(): THREE.PerspectiveCamera {
    const { eye } = this.d;
    if (this.mode === ViewMode.First) {
      this.d.remote.setSelf(null);
      return eye;
    }
    this.selfModel();
    eye.getWorldDirection(this.dir);
    const sign = this.mode === ViewMode.Back ? -1 : 1;
    const dist = this.clear(eye.position, sign);
    const v = this.view;
    if (v.fov !== eye.fov || v.aspect !== eye.aspect) {
      Object.assign(v, { fov: eye.fov, aspect: eye.aspect, near: eye.near, far: eye.far });
      v.updateProjectionMatrix();
    }
    v.position.copy(eye.position).addScaledVector(this.dir, sign * dist);
    if (this.mode === ViewMode.Back) v.quaternion.copy(eye.quaternion);
    else v.lookAt(eye.position); // trước mặt: quay lại nhìn chính diện
    v.updateMatrixWorld();
    return v;
  }

  /** Khoảng lùi / tiến tối đa không đụng block (dò 5 tia: giữa + 4 góc lệch SPREAD). */
  private clear(o: THREE.Vector3, sign: number): number {
    this.side.set(1, 0, 0).applyQuaternion(this.d.eye.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.d.eye.quaternion);
    let best = DIST;
    for (const [a, b] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const ox = o.x + (this.side.x * a + this.up.x * b) * SPREAD, oy = o.y + (this.side.y * a + this.up.y * b) * SPREAD;
      const oz = o.z + (this.side.z * a + this.up.z * b) * SPREAD;
      for (let t = STEP; t < best; t += STEP) {
        const x = ox + this.dir.x * sign * t, y = oy + this.dir.y * sign * t, z = oz + this.dir.z * sign * t;
        const def = BLOCKS[this.d.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))];
        if (def?.solid && !def.liquid) {
          best = Math.max(0, t - MARGIN);
          break;
        }
      }
    }
    return best;
  }

  /** Trạng thái của mình dưới dạng PlayerView (giống gói server gửi về người chơi khác). */
  private selfModel(): void {
    const { player, inv, eye } = this.d, s = player.state, h = inv.held;
    const f = player.flying ? { x: eye.position.x, y: eye.position.y - PLAYER.EYE_HEIGHT, z: eye.position.z } : player.feet;
    this.d.remote.setSelf({
      id: SELF_ID, x: f.x, y: f.y, z: f.z, yaw: this.d.yaw(), pitch: this.d.pitch(), sneaking: s.sneaking, swing: this.d.swings(),
      held: h ? h.item + (h.ench ? "*" : "") : null, off: inv.offhand[0]?.item ?? null, armor: inv.armor.map((a) => a?.item ?? null),
      dead: s.dead, blocking: this.d.blocking(), drawing: this.d.drawing(), sleeping: this.d.sleeping(),
      ride: s.rideId ? s.rideId | RIDE_BACK_FLAG : 0, // cờ "ngồi sau": không ghi đè chỗ ngồi của thú (netClient tự đặt cho mình)
    });
  }
}
