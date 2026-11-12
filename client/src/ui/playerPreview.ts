// Hình nhân vật trong túi đồ (mô hình 6 phần từ skin, kèm giáp đang mặc), đầu và thân quay theo con trỏ chuột.
import * as THREE from "three";
import { createPlayerModel, loadSkin, type PlayerModel } from "../player/playerModel.js";

const W = 104, H = 150;

export class PlayerPreview {
  readonly canvas = document.createElement("canvas");
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 20);
  private readonly model: PlayerModel;
  private mouse = { x: 0, y: 0 };

  constructor() {
    this.canvas.className = "preview";
    this.canvas.width = W;
    this.canvas.height = H;
    this.model = createPlayerModel(loadSkin());
    this.scene.add(this.model.root);
    this.camera.position.set(0, 1.0, 4.2);
    this.camera.lookAt(0, 1.0, 0);
    document.addEventListener("mousemove", (e) => (this.mouse = { x: e.clientX, y: e.clientY }));
  }

  /** Vẽ một khung (chỉ gọi khi túi đồ đang mở); armor: mũ, áo, quần, giày đang mặc. */
  render(armor: readonly (string | null)[]): void {
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: false });
        this.renderer.setPixelRatio(1);
      } catch {
        return; // không tạo được thêm ngữ cảnh WebGL: bỏ qua hình nhân vật
      }
    }
    const r = this.canvas.getBoundingClientRect();
    const dx = (this.mouse.x - (r.left + r.width / 2)) / 200;
    const dy = (this.mouse.y - (r.top + r.height * 0.25)) / 200;
    this.model.root.rotation.y = Math.atan(dx) * 0.6;
    this.model.head.rotation.y = Math.atan(dx) * 0.6;
    this.model.head.rotation.x = Math.atan(dy) * 0.6;
    this.model.armor.set(armor);
    this.renderer.render(this.scene, this.camera);
  }
}
