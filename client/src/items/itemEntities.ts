// Vẽ vật phẩm nằm trên đất (Giai đoạn 5a: server mô phỏng rơi, trôi, gộp, nhặt; client chỉ nhận vị
// trí và vẽ). Block vẽ thành khối nhỏ, vật phẩm thành tấm icon; xoay, nhấp nhô, trượt mượt tới vị trí mới.
import * as THREE from "three";
import { DROPPED, itemDef, type NetItem } from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { blockTiles, setBoxTiles, shapeObject } from "../interact/boxMesh.js";
import { iconUrl } from "../ui/itemIcons.js";

interface Entry {
  id: number;
  item: string;
  obj: THREE.Object3D;
  pos: THREE.Vector3; // đang vẽ
  target: THREE.Vector3; // server gửi
}

const FOLLOW = 15; // trượt tới vị trí server (1/giây)

export class ItemEntities {
  private readonly map = new Map<number, Entry>();
  private readonly blockMat: THREE.MeshBasicMaterial;
  private readonly iconMats = new Map<string, THREE.MeshBasicMaterial>();
  private readonly plane = new THREE.PlaneGeometry(DROPPED.SIZE * 1.6, DROPPED.SIZE * 1.6);
  private time = 0;

  constructor(private readonly scene: THREE.Scene, private readonly atlas: Atlas) {
    this.blockMat = new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd });
  }

  get count(): number {
    return this.map.size;
  }

  private iconMat(key: string): THREE.MeshBasicMaterial {
    let m = this.iconMats.get(key);
    if (!m) {
      const tex = new THREE.TextureLoader().load(iconUrl(key));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0xdddddd });
      this.iconMats.set(key, m);
    }
    return m;
  }

  private makeObject(item: string): THREE.Object3D {
    const icon = itemDef(item)?.icon;
    if (icon?.type === "cube") {
      const geo = new THREE.BoxGeometry(DROPPED.SIZE, DROPPED.SIZE, DROPPED.SIZE);
      setBoxTiles(geo, blockTiles(this.atlas, icon.block, icon.tex));
      return new THREE.Mesh(geo, this.blockMat);
    }
    if (icon?.type === "shape") return shapeObject(this.atlas, icon.block, DROPPED.SIZE, this.blockMat, icon.tex);
    return new THREE.Mesh(this.plane, this.iconMat(item));
  }

  private remove(e: Entry): void {
    this.scene.remove(e.obj);
    e.obj.traverse((o) => { if (o instanceof THREE.Mesh && o.geometry !== this.plane) o.geometry.dispose(); });
    this.map.delete(e.id);
  }

  /** Gói "items" của server: vật phẩm mới / đổi chỗ và vật phẩm đã mất. */
  apply(up: NetItem[], gone: number[]): void {
    for (const id of gone) {
      const e = this.map.get(id);
      if (e) this.remove(e);
    }
    for (const [id, item, , x, y, z] of up) {
      let e = this.map.get(id);
      if (e && e.item !== item) {
        this.remove(e);
        e = undefined;
      }
      if (!e) {
        const obj = this.makeObject(item);
        this.scene.add(obj);
        e = { id, item, obj, pos: new THREE.Vector3(x, y, z), target: new THREE.Vector3(x, y, z) };
        this.map.set(id, e);
      }
      e.target.set(x, y, z);
    }
  }

  /** Mất kết nối / vào lại: xóa hết. */
  clear(): void {
    for (const e of [...this.map.values()]) this.remove(e);
  }

  update(dt: number): void {
    this.time += dt;
    const k = Math.min(1, FOLLOW * dt);
    for (const e of this.map.values()) {
      e.pos.lerp(e.target, k);
      const bob = Math.sin(this.time * 2.5 + e.id) * 0.04;
      e.obj.position.set(e.pos.x, e.pos.y + DROPPED.SIZE / 2 + 0.05 + bob, e.pos.z);
      e.obj.rotation.y = this.time * 1.5 + e.id;
    }
  }
}
