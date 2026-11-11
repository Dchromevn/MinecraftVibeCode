// Giai đoạn 2a: thế giới vô hạn có biome, tải chunk theo tầm nhìn, sinh/dựng mesh
// trong Web Worker, camera bay + công cụ phá/đặt block để debug.
// Tham số URL: ?seed= ?pos=x,y,z ?look=yaw,pitch ?vd=8 ?nomsg=1 ?debug=1
import * as THREE from "three";
import { BLOCKS, World, WORLD, allBlockTextureNames, seedFromString, TerrainSampler } from "../../shared/src/index.js";
import { STR } from "./strings.js";
import { buildAtlas } from "./atlas.js";
import { FlyCamera } from "./flyCamera.js";
import { createFog, createSky } from "./sky.js";
import { Hud, FpsCounter } from "./hud.js";
import { buildUvTable } from "./mesh/mesher.js";
import { WorkerPool } from "./workers/workerPool.js";
import { ChunkMeshes } from "./world/chunkMeshes.js";
import { ChunkManager } from "./world/chunkManager.js";
import { BlockEditor } from "./debug/blockEditor.js";

const EXTRA_TEXTURES = ["crack_0", "crack_1", "crack_2", "crack_3", "crack_4", "snow_side"];

function readVec(params: URLSearchParams, name: string, n: number): number[] | null {
  const v = params.get(name)?.split(",").map(Number);
  return v && v.length === n && v.every(Number.isFinite) ? v : null;
}

/** Tìm điểm trên đất liền gần gốc tọa độ để bắt đầu. */
function findSpawn(sampler: TerrainSampler): { x: number; z: number; h: number } {
  for (let r = 0; r < 4000; r += 16) {
    for (let a = 0; a < 16; a++) {
      const x = Math.round(r * Math.cos((a / 16) * Math.PI * 2));
      const z = Math.round(r * Math.sin((a / 16) * Math.PI * 2));
      const c = sampler.column(x, z);
      if (c.height > c.waterTop) return { x, z, h: c.height };
    }
  }
  return { x: 0, z: 0, h: WORLD.SEA_LEVEL };
}

function heapMb(): string {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : "–";
}

async function main(): Promise<void> {
  const hud = new Hud();
  const params = new URLSearchParams(location.search);
  const seedText = params.get("seed") ?? "voxel";
  const seed = seedFromString(seedText);
  const hideMsg = params.get("nomsg") === "1";

  hud.setCenter(STR.loadingTextures);
  const atlas = await buildAtlas([...allBlockTextureNames(), ...EXTRA_TEXTURES]);

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
  const sky = createSky(1000);
  scene.add(sky.mesh);

  const world = new World(seed);
  const sampler = new TerrainSampler(seed);
  const workers = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const pool = new WorkerPool(workers, { type: "init", seed, uvt: buildUvTable((n) => atlas.uv(n)) });
  const meshes = new ChunkMeshes(scene, atlas.texture);
  const chunks = new ChunkManager(world, pool, meshes);
  const vd = Number(params.get("vd"));
  if (Number.isFinite(vd) && vd > 0) {
    chunks.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, vd));
  }
  const applyViewDistance = (): void => {
    scene.fog = createFog(chunks.viewDistance * 16);
  };
  applyViewDistance();

  const spawn = findSpawn(sampler);
  camera.position.set(spawn.x + 0.5, spawn.h + 12, spawn.z + 0.5);
  const fly = new FlyCamera(camera, renderer.domElement);
  fly.pitch = -0.35;
  const pos = readVec(params, "pos", 3);
  if (pos) camera.position.set(pos[0]!, pos[1]!, pos[2]!);
  const look = readVec(params, "look", 2);
  if (look) {
    fly.yaw = look[0]!;
    fly.pitch = look[1]!;
  }

  const editor = new BlockEditor(scene, world, camera, () => fly.locked, (x, _y, z) => chunks.onBlockChanged(x, z));
  // debug: cho script kiểm tra điều khiển camera / sửa block từ ngoài (?debug=1);
  // autopilot = vận tốc tự bay (block/giây), áp trong vòng lặp khung hình
  const autopilot = { vx: 0, vz: 0 };
  if (params.get("debug") === "1") {
    (window as unknown as Record<string, unknown>).__game = { camera, chunks, world, meshes, renderer, autopilot };
  }

  document.addEventListener("keydown", (e) => {
    if (e.code !== "BracketLeft" && e.code !== "BracketRight") return;
    const d = e.code === "BracketLeft" ? -1 : 1;
    chunks.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, chunks.viewDistance + d));
    applyViewDistance();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const fps = new FpsCounter();
  let prev = performance.now();
  let firstFrame = true;
  const dir = new THREE.Vector3();

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    fly.update(dt);
    camera.position.x += autopilot.vx * dt;
    camera.position.z += autopilot.vz * dt;
    camera.updateMatrixWorld();
    camera.getWorldDirection(dir);
    chunks.update(camera.position.x, camera.position.z, dir.x, dir.z);
    editor.update();
    sky.follow(camera);
    renderer.render(scene, camera);

    if (fps.tick(now) || firstFrame) {
      firstFrame = false;
      const p = camera.position;
      const col = sampler.column(Math.floor(p.x), Math.floor(p.z));
      const sel = BLOCKS[editor.selectedBlock]!;
      hud.setInfo([
        `${STR.title} — ${STR.stage}`,
        `${STR.hudFps}: ${fps.fps}`,
        `${STR.hudPos}: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} · ${STR.hudChunk}: ${Math.floor(p.x / 16)}, ${Math.floor(p.z / 16)}`,
        `${STR.hudBiome}: ${STR.biomes[col.biome]} (${STR.hudGround} y=${col.height})`,
        `${STR.hudLoaded}: ${world.chunks.size} · ${STR.hudMeshed}: ${meshes.count} · ${STR.hudModified}: ${chunks.modifiedCount()}`,
        `${STR.hudJobs}: ${chunks.pendingGen} / ${chunks.pendingMesh} · ${pool.size} ${STR.hudWorkers} (${pool.lastGenMs.toFixed(1)} / ${pool.lastMeshMs.toFixed(1)} ms)`,
        `${STR.hudViewDistance}: ${chunks.viewDistance} chunk ([ ])`,
        `${STR.hudTriangles}: ${renderer.info.render.triangles} · ${STR.hudDrawCalls}: ${renderer.info.render.calls} · ${STR.hudMemory}: ${heapMb()}`,
        `${STR.hudSeed}: ${seedText} (${seed})`,
        `${STR.hudSelected}: ${STR.blocks[sel.key] ?? sel.key}`,
        atlas.missing.length ? `${STR.hudMissingTextures}: ${atlas.missing.join(", ")}` : "",
      ]);
      hud.setCenter(fly.locked || hideMsg ? null : STR.clickToControl);
    }
    requestAnimationFrame(frame);
  }
  hud.setCenter(STR.loadingWorld);
  requestAnimationFrame(frame);
}

main().catch((err: unknown) => {
  console.error(err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = String(err);
});
