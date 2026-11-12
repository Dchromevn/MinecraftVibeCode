// Client (Giai đoạn 5a): vào game bằng tên, thế giới / túi đồ / vật phẩm do server quyết định; client sinh
// địa hình theo seed của server, ánh sáng / dựng mesh trong Web Worker, vật lý người chơi (tin client đến 5c).
// Tham số URL: ?name= (vào luôn) ?pos=x,y,z (bắt đầu ở chế độ bay) ?look=yaw,pitch ?walk=1 ?fly=1
// ?vd=8 ?nomsg=1 ?debug=1 ?nv=1 ?nocull=1
import * as THREE from "three";
import { PLAYER, World, WORLD, allBlockTextureNames, TerrainSampler } from "../../shared/src/index.js";
import { STR } from "./strings.js";
import { buildAtlas, loadTileTexture } from "./atlas.js";
import { FlyCamera } from "./flyCamera.js";
import { createFog, createSky } from "./sky.js";
import { Hud, FpsCounter } from "./hud.js";
import { buildUvTable } from "./mesh/mesher.js";
import { WorkerPool } from "./workers/workerPool.js";
import { ChunkMeshes } from "./world/chunkMeshes.js";
import { ChunkManager } from "./world/chunkManager.js";
import { Interaction } from "./interact/interaction.js";
import { FirstPersonArm } from "./player/arm.js";
import { PlayerController } from "./player/playerController.js";
import { ViewEffects } from "./player/viewEffects.js";
import { Session } from "./game/session.js";
import { joinGame } from "./net/joinScreen.js";
import { NetClient } from "./net/netClient.js";
import { preloadIcons } from "./ui/itemIcons.js";
import { CROP_TEX, STEM_ATTACHED_TEX } from "./mesh/mesher.js";
import { injectStyles } from "./ui/styles.js";

const EXTRA_TEXTURES = [
  "crack_0", "crack_1", "crack_2", "crack_3", "crack_4", "snow_side",
  "rail_curved", "rail_t", "rail_cross", "bed_foot_side", "furnace_front_on",
  "chest_front_a", "chest_front_b", "farmland_wet", "bed_head_end", "bed_foot_end",
  ...Object.values(CROP_TEX).flat(), ...Object.values(STEM_ATTACHED_TEX),
];
const NIGHT_VISION = 0.45; // độ sáng tối thiểu khi bật nhìn đêm (debug)

function readVec(params: URLSearchParams, name: string, n: number): number[] | null {
  const v = params.get(name)?.split(",").map(Number);
  return v && v.length === n && v.every(Number.isFinite) ? v : null;
}

/** Dòng HUD về người chơi: chế độ, trạng thái vật lý, máu. */
function playerLine(p: PlayerController): string {
  if (p.flying) return `${STR.hudMode}: ${STR.modeFlying} (F)`;
  const s = p.state;
  const flags = [
    s.frozen && STR.stateFrozen, s.onGround && STR.stateGround, s.inWater && STR.stateWater,
    s.inLava && STR.stateLava, s.onLadder && STR.stateLadder, s.inWeb && STR.stateWeb, s.burnS > 0 && STR.stateBurning,
    s.sneaking && STR.stateSneaking,
  ].filter(Boolean);
  return `${STR.hudMode}: ${STR.modeWalking} (F) · ${flags.join(", ") || STR.stateAir} · ${STR.hudHealth}: ${s.health.toFixed(1)}/${PLAYER.MAX_HEALTH} · ${STR.hudHunger}: ${s.hunger} (${s.saturation.toFixed(1)}) · ${STR.hudAir}: ${s.air.toFixed(1)} s`;
}

function heapMb(): string {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : "–";
}

async function main(): Promise<void> {
  const hud = new Hud();
  const params = new URLSearchParams(location.search);
  const hideMsg = params.get("nomsg") === "1";
  injectStyles();
  const { conn, welcome, early } = await joinGame(params);
  const seed = welcome.seed;

  hud.setCenter(STR.loadingTextures);
  const atlas = await buildAtlas([...allBlockTextureNames(), ...EXTRA_TEXTURES]);
  await preloadIcons();

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.autoClear = false; // vẽ thế giới rồi vẽ cánh tay đè lên
  renderer.info.autoReset = false; // HUD đếm tam giác của cả khung hình (2 lần render)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(PLAYER.FOV, window.innerWidth / window.innerHeight, 0.1, 2000);
  const sky = createSky(1000);
  scene.add(sky.mesh);

  const world = new World(seed);
  const sampler = new TerrainSampler(seed);
  const workers = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const pool = new WorkerPool(workers, { type: "init", seed, uvt: buildUvTable((n) => atlas.uv(n)) });
  const meshes = new ChunkMeshes(scene, atlas.texture, await loadTileTexture("water"));
  const chunks = new ChunkManager(world, pool, meshes);
  const vd = Number(params.get("vd"));
  if (Number.isFinite(vd) && vd > 0) {
    chunks.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, vd));
  }
  const effects = new ViewEffects(scene, camera, world);
  const applyViewDistance = (): void => {
    scene.fog = createFog(chunks.viewDistance * 16);
    effects.fogChanged();
  };
  applyViewDistance();

  // xuất phát ở điểm server chọn; ?pos= bắt đầu ở chế độ bay (để chụp / kiểm tra)
  const spawn = welcome.spawn;
  camera.position.set(spawn.x, spawn.y + PLAYER.EYE_HEIGHT, spawn.z);
  const fly = new FlyCamera(camera, renderer.domElement);
  const pos = readVec(params, "pos", 3);
  if (pos) camera.position.set(pos[0]!, pos[1]!, pos[2]!);
  const look = readVec(params, "look", 2);
  if (look) {
    fly.yaw = look[0]!;
    fly.pitch = look[1]!;
  }
  const startFlying = params.get("fly") === "1" || (!!pos && params.get("walk") !== "1");
  const player = new PlayerController(world, fly, camera, startFlying);
  fly.applyRotation();

  const arm = new FirstPersonArm(PLAYER.FOV, window.innerWidth / window.innerHeight);
  const net = new NetClient(conn, { world, chunks, scene, atlas, camera, player, yaw: () => fly.yaw, pitch: () => fly.pitch });
  const session = new Session(scene, atlas, world, player, fly, renderer.domElement, spawn, conn);
  const interact = new Interaction(
    scene, world, atlas,
    {
      camera, player, inv: session.inv, net: net.actions(),
      locked: () => (fly.locked || player.debugInput) && !session.screen.open,
      yaw: () => fly.yaw,
      swing: () => {
        arm.swing();
        net.swings++;
      },
      sneaking: () => player.state.sneaking || fly.keys.has("KeyC"),
    },
    (x, _y, z) => chunks.onBlockChanged(x, z),
  );
  net.start(session, interact, early);
  // debug: cho script kiểm tra điều khiển camera / sửa block từ ngoài (?debug=1);
  // autopilot = vận tốc tự bay (block/giây), áp trong vòng lặp khung hình
  const autopilot = { vx: 0, vz: 0 };
  if (params.get("debug") === "1") {
    player.debugInput = true;
    (window as unknown as Record<string, unknown>).__game = { camera, chunks, world, meshes, renderer, autopilot, player, fly, interact, session, net,
      give: (k: string, n?: number) => session.give(k, n) };
  }

  if (params.get("nv") === "1") meshes.uniforms.uMinLight.value = NIGHT_VISION;
  if (params.get("nocull") === "1") meshes.culling = false;
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyN") meshes.uniforms.uMinLight.value = meshes.uniforms.uMinLight.value > 0 ? 0 : NIGHT_VISION;
    if (e.code === "F4") {
      e.preventDefault();
      meshes.culling = !meshes.culling;
    }
    if (e.code !== "BracketLeft" && e.code !== "BracketRight") return;
    const d = e.code === "BracketLeft" ? -1 : 1;
    chunks.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, chunks.viewDistance + d));
    applyViewDistance();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    arm.resize(camera.aspect);
  });

  const fps = new FpsCounter();
  let prev = performance.now();
  let firstFrame = true;
  const dir = new THREE.Vector3();

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    player.update(dt);
    if (player.flying) {
      camera.position.x += autopilot.vx * dt;
      camera.position.z += autopilot.vz * dt;
    }
    effects.update(dt, player.sprinting);
    camera.updateMatrixWorld();
    camera.getWorldDirection(dir);
    chunks.update(camera.position.x, camera.position.z, dir.x, dir.z);
    interact.update(dt);
    session.update(dt);
    net.update(dt);
    sky.follow(camera);
    meshes.update(now / 1000, camera, chunks.viewDistance, world);
    renderer.info.reset();
    renderer.clear();
    renderer.render(scene, camera);
    arm.visible = !player.flying;
    arm.setHeld(session.inv.held?.item ?? null, atlas);
    arm.update(dt);
    arm.render(renderer);

    if (fps.tick(now) || firstFrame) {
      firstFrame = false;
      const p = camera.position;
      const col = sampler.column(Math.floor(p.x), Math.floor(p.z));
      hud.setInfo([
        `${STR.title} — ${STR.stage}`,
        `${STR.hudFps}: ${fps.fps}`,
        `${STR.hudPos}: ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} · ${STR.hudChunk}: ${Math.floor(p.x / 16)}, ${Math.floor(p.z / 16)}`,
        `${STR.hudBiome}: ${STR.biomes[col.biome]} (${STR.hudGround} y=${col.height})`,
        `${STR.hudLoaded}: ${world.chunks.size} · ${STR.hudMeshed}: ${meshes.count} · ${STR.hudSections}: ${meshes.drawnSections} · ${STR.hudModified}: ${chunks.modifiedCount()}`,
        `${STR.hudJobs}: ${chunks.pendingGen} / ${chunks.pendingMesh} · ${pool.size} ${STR.hudWorkers} (${pool.lastGenMs.toFixed(1)} / ${pool.lastMeshMs.toFixed(1)} ms)`,
        `${STR.hudViewDistance}: ${chunks.viewDistance} chunk ([ ]) · ${STR.hudCulling}: ${meshes.culling ? STR.on : STR.off} (F4) · ${STR.hudNightVision}: ${meshes.uniforms.uMinLight.value > 0 ? STR.on : STR.off} (N)`,
        `${STR.hudTriangles}: ${renderer.info.render.triangles} · ${STR.hudDrawCalls}: ${renderer.info.render.calls} · ${STR.hudMemory}: ${heapMb()}`,
        `${STR.hudSeed}: ${seed} · ${STR.hudPlayers}: ${net.remote.count + 1} (${[welcome.name, ...net.remote.names()].join(", ")})`,
        playerLine(player),
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
