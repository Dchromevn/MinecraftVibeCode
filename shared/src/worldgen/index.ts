// Sinh toàn bộ thế giới từ seed. Cùng seed → cùng thế giới ở client và server.
import { World } from "../world.js";
import { fillColumns, generateHeightmap, placeOres } from "./terrain.js";
import { placeTallGrass, placeTrees } from "./decorate.js";

export function generateWorld(seed: number): World {
  const world = new World();
  world.seed = seed;
  generateHeightmap(world, seed);
  fillColumns(world);
  placeOres(world, seed);
  placeTrees(world, seed);
  placeTallGrass(world, seed);
  return world;
}
