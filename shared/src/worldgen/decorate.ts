// Trang trí: cây và cỏ cao. Chạy sau khi có địa hình. Thứ tự duyệt chunk cố định
// nên kết quả xác định dù cây lấn sang chunk kề.
import { WORLD } from "../constants.js";
import { B } from "../blocks.js";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "../chunk.js";
import { hashInts, mulberry32, randInt, type Rng } from "../rng.js";
import { MAP_CHUNKS, World } from "../world.js";

const TREE_ATTEMPTS_PER_CHUNK = Math.round((CHUNK_SIZE * CHUNK_SIZE) / WORLD.SURFACE_BLOCKS_PER_TREE) + 1;
const TALLGRASS_CHANCE = WORLD.TALLGRASS_CHANCE;

function canPlaceTree(world: World, x: number, baseY: number, z: number, trunk: number): boolean {
  if (world.getBlock(x, baseY - 1, z) !== B.GRASS) return false;
  if (baseY + trunk + 2 >= CHUNK_HEIGHT) return false;
  // không trồng sát cây khác
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy < trunk; dy++) {
        const id = world.getBlock(x + dx, baseY + dy, z + dz);
        if (id === B.LOG) return false;
        if (dx === 0 && dz === 0 && id !== B.AIR) return false;
      }
    }
  }
  return true;
}

function placeLeaf(world: World, x: number, y: number, z: number): void {
  if (world.getBlock(x, y, z) === B.AIR) world.setBlock(x, y, z, B.LEAVES);
}

function placeTree(world: World, rng: Rng, x: number, baseY: number, z: number, trunk: number): void {
  const top = baseY + trunk - 1;
  const r = (WORLD.TREE_CANOPY_SIZE - 1) / 2; // 2
  // hai lớp 5x5 (bỏ góc ngẫu nhiên)
  for (let dy = -2; dy <= -1; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const corner = Math.abs(dx) === r && Math.abs(dz) === r;
        if (corner && rng() < 0.6) continue;
        placeLeaf(world, x + dx, top + dy, z + dz);
      }
    }
  }
  // lớp 3x3 ngang ngọn
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && rng() < 0.5) continue;
      placeLeaf(world, x + dx, top, z + dz);
    }
  }
  // hình chữ thập trên cùng
  placeLeaf(world, x, top + 1, z);
  placeLeaf(world, x + 1, top + 1, z);
  placeLeaf(world, x - 1, top + 1, z);
  placeLeaf(world, x, top + 1, z + 1);
  placeLeaf(world, x, top + 1, z - 1);
  // thân đặt sau để đè lên lá
  for (let dy = 0; dy < trunk; dy++) world.setBlock(x, baseY + dy, z, B.LOG);
}

export function placeTrees(world: World, seed: number): void {
  for (let cz = 0; cz < MAP_CHUNKS; cz++) {
    for (let cx = 0; cx < MAP_CHUNKS; cx++) {
      const rng = mulberry32(hashInts(seed, cx, cz, 11));
      for (let a = 0; a < TREE_ATTEMPTS_PER_CHUNK; a++) {
        const x = cx * CHUNK_SIZE + randInt(rng, 0, CHUNK_SIZE - 1);
        const z = cz * CHUNK_SIZE + randInt(rng, 0, CHUNK_SIZE - 1);
        const trunk = randInt(rng, WORLD.TREE_TRUNK_MIN, WORLD.TREE_TRUNK_MAX);
        const baseY = world.heightAt(x, z) + 1;
        if (canPlaceTree(world, x, baseY, z, trunk)) placeTree(world, rng, x, baseY, z, trunk);
      }
    }
  }
}

export function placeTallGrass(world: World, seed: number): void {
  for (let cz = 0; cz < MAP_CHUNKS; cz++) {
    for (let cx = 0; cx < MAP_CHUNKS; cx++) {
      const rng = mulberry32(hashInts(seed, cx, cz, 13));
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const x = cx * CHUNK_SIZE + lx;
          const z = cz * CHUNK_SIZE + lz;
          const roll = rng();
          const h = world.heightAt(x, z);
          if (roll >= TALLGRASS_CHANCE) continue;
          if (world.getBlock(x, h, z) !== B.GRASS) continue;
          if (world.getBlock(x, h + 1, z) !== B.AIR) continue;
          world.setBlock(x, h + 1, z, B.TALLGRASS);
        }
      }
    }
  }
}
