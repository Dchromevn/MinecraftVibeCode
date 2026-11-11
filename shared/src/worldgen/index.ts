// Sinh toàn bộ thế giới từ seed. Cùng seed → cùng thế giới ở client và server.
import { World } from "../world.js";
import { fillColumns, generateHeightmap, placeOres } from "./terrain.js";
import { carveEntrances, carveNoiseCaves } from "./caves.js";
import { generateMineshafts } from "./mineshaft.js";
import { placeTallGrass, placeTrees } from "./decorate.js";

export function generateWorld(seed: number): World {
  const world = new World();
  world.seed = seed;
  generateHeightmap(world, seed);
  fillColumns(world);
  placeOres(world, seed); // trước khi đục hang để quặng lộ ra trên vách
  carveNoiseCaves(world, seed);
  carveEntrances(world, seed);
  generateMineshafts(world, seed);
  placeTrees(world, seed);
  placeTallGrass(world, seed);
  return world;
}
