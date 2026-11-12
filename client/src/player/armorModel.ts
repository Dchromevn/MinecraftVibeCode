// Lớp giáp trên mô hình nhân vật: mỗi món là các hộp phồng ra quanh phần cơ thể, dùng ảnh giáp
// 64x32 theo bố cục skin (entities/armor/<cấp>_<món>.png; mũ nằm ở vùng "lớp ngoài" của đầu u = 32).
import * as THREE from "three";
import { skinBoxUV } from "./playerModel.js";

const PX = 1 / 16;
const PIECES = ["helmet", "chestplate", "leggings", "boots"] as const;
type Part = "head" | "body" | "rArm" | "lArm" | "rLeg" | "lLeg";
export type PartGroups = Record<Part, THREE.Group>;

/** Phần cơ thể mỗi món che: [phần, u, v, rộng, cao, sâu, độ phồng (điểm ảnh), gốc ở trên]. */
const LAYOUT: Record<(typeof PIECES)[number], [Part, number, number, number, number, number, number, boolean][]> = {
  helmet: [["head", 32, 0, 8, 8, 8, 1, false]],
  chestplate: [["body", 16, 16, 8, 12, 4, 1, true], ["rArm", 40, 16, 4, 12, 4, 1, true], ["lArm", 40, 16, 4, 12, 4, 1, true]],
  leggings: [["body", 16, 16, 8, 12, 4, 0.5, true], ["rLeg", 0, 16, 4, 12, 4, 0.5, true], ["lLeg", 0, 16, 4, 12, 4, 0.5, true]],
  boots: [["rLeg", 0, 16, 4, 12, 4, 1, true], ["lLeg", 0, 16, 4, 12, 4, 1, true]],
};

const textures = new Map<string, THREE.Texture>();
function armorTexture(key: string): THREE.Texture {
  let t = textures.get(key);
  if (!t) {
    t = new THREE.TextureLoader().load(`/entities/armor/${key}.png`);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, t);
  }
  return t;
}

export class ArmorLayer {
  private readonly mats = PIECES.map(() => new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1, visible: false }));
  private readonly worn: (string | null)[] = [null, null, null, null];

  constructor(parts: PartGroups) {
    PIECES.forEach((p, k) => {
      for (const [part, u, v, w, h, d, inflate, top] of LAYOUT[p]) {
        const s = 2 * inflate;
        const geo = new THREE.BoxGeometry((w + s) * PX, (h + s) * PX, (d + s) * PX);
        skinBoxUV(geo, u, v, w, h, d);
        geo.translate(0, top ? (-h * PX) / 2 : (h * PX) / 2, 0);
        parts[part].add(new THREE.Mesh(geo, this.mats[k]));
      }
    });
  }

  /** Món giáp đang mặc theo thứ tự mũ, áo, quần, giày (khóa vật phẩm hoặc null). */
  set(items: readonly (string | null)[]): void {
    PIECES.forEach((_, k) => {
      const key = items[k] ?? null;
      if (key === this.worn[k]) return;
      this.worn[k] = key;
      const m = this.mats[k]!;
      m.visible = key !== null;
      if (key) m.map = armorTexture(key);
      m.needsUpdate = true;
    });
  }
}
