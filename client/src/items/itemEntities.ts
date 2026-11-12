// Vật phẩm nằm trên đất phía client: cập nhật bằng logic /shared/itemEntity.ts, vẽ block
// thành khối nhỏ, vật phẩm thành tấm icon; xoay và nhấp nhô; gộp chồng; nhặt vào túi.
import * as THREE from "three";
import {
  DROPPED, canPickup, createItemEntity, itemDef, popFromBlock, stepItem, tryMergeItems,
  type CellReader, type Inventory, type ItemEntity, type ItemStack, type Rng,
} from "../../../shared/src/index.js";
import type { Atlas } from "../atlas.js";
import { blockTiles, setBoxTiles } from "../interact/boxMesh.js";
import { iconUrl } from "../ui/itemIcons.js";

interface Entry {
  e: ItemEntity;
  obj: THREE.Object3D;
  key: string; // loại vật phẩm đang vẽ
}

export class ItemEntities {
  private readonly list: Entry[] = [];
  private readonly blockMat: THREE.MeshBasicMaterial;
  private readonly iconMats = new Map<string, THREE.MeshBasicMaterial>();
  private readonly plane = new THREE.PlaneGeometry(DROPPED.SIZE * 1.6, DROPPED.SIZE * 1.6);
  private time = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly atlas: Atlas,
    private readonly cell: CellReader,
    private readonly rng: Rng,
  ) {
    this.blockMat = new THREE.MeshBasicMaterial({ map: atlas.texture, color: 0xdddddd });
  }

  get count(): number {
    return this.list.length;
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
      setBoxTiles(geo, blockTiles(this.atlas, icon.block));
      return new THREE.Mesh(geo, this.blockMat);
    }
    return new THREE.Mesh(this.plane, this.iconMat(item));
  }

  add(e: ItemEntity): void {
    const obj = this.makeObject(e.stack.item);
    this.scene.add(obj);
    this.list.push({ e, obj, key: e.stack.item });
  }

  /** Vật phẩm văng ra từ block ở ô (x, y, z). */
  pop(stack: ItemStack, x: number, y: number, z: number): void {
    this.add(popFromBlock(stack, x, y, z, this.rng));
  }

  /** Vứt từ người chơi theo hướng nhìn (Q). */
  throw(stack: ItemStack, eye: THREE.Vector3, dir: THREE.Vector3): void {
    const v = DROPPED.THROW_SPEED;
    this.add(createItemEntity(stack, eye.x + dir.x * 0.3, eye.y - 0.3, eye.z + dir.z * 0.3, dir.x * v, dir.y * v + 2, dir.z * v, DROPPED.THROW_PICKUP_DELAY_S));
  }

  /** Văng toàn bộ đồ quanh chỗ chết. */
  scatter(stacks: ItemStack[], x: number, y: number, z: number): void {
    for (const s of stacks) {
      const a = this.rng() * Math.PI * 2, sp = this.rng() * DROPPED.DEATH_SCATTER;
      this.add(createItemEntity(s, x, y + 0.5, z, Math.cos(a) * sp, 3, Math.sin(a) * sp, DROPPED.THROW_PICKUP_DELAY_S));
    }
  }

  private remove(i: number): void {
    const en = this.list[i]!;
    this.scene.remove(en.obj);
    if (en.obj instanceof THREE.Mesh && en.obj.geometry !== this.plane) en.obj.geometry.dispose();
    this.list.splice(i, 1);
  }

  /** player: chân người chơi (null khi chết / đang bay thì vẫn nhặt). */
  update(dt: number, player: { x: number; y: number; z: number } | null, inv: Inventory): void {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const en = this.list[i]!;
      if (!stepItem(en.e, dt, this.cell, player)) {
        this.remove(i);
        continue;
      }
      if (player && canPickup(en.e, player)) {
        const left = inv.add(en.e.stack);
        if (!left) {
          this.remove(i);
          continue;
        }
        en.e.stack = left;
      }
    }
    // gộp các đống cùng loại nằm gần nhau
    for (let i = 0; i < this.list.length; i++)
      for (let j = this.list.length - 1; j > i; j--)
        if (tryMergeItems(this.list[i]!.e, this.list[j]!.e)) this.remove(j);
    for (const en of this.list) {
      const bob = Math.sin(this.time * 2.5 + en.e.id) * 0.04;
      en.obj.position.set(en.e.x, en.e.y + DROPPED.SIZE / 2 + 0.05 + bob, en.e.z);
      en.obj.rotation.y = this.time * 1.5 + en.e.id;
    }
  }
}
