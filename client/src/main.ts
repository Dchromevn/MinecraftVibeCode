// Client (Giai đoạn 5a): vào game bằng tên, thế giới / túi đồ / vật phẩm do server quyết định; client sinh
// địa hình theo seed của server, ánh sáng / dựng mesh trong Web Worker, vật lý người chơi (tin client đến 5c).
// Tham số URL: ?name= (vào luôn) ?pos=x,y,z (bắt đầu ở chế độ bay) ?look=yaw,pitch ?walk=1 ?fly=1
// ?vd=8 ?nomsg=1 ?debug=1 ?nv=1 ?nocull=1
import * as THREE from "three";
import { DIM, PLAYER, World, WORLD, allBlockTextureNames, inSafeZone, isRideFood, NetherBiomes, TerrainSampler, netherSeed } from "../../shared/src/index.js";
import { STR } from "./strings.js";
import { buildAtlas, loadTileTexture } from "./atlas.js";
import { FlyCamera, lockPointer } from "./flyCamera.js";
import { CombatClient } from "./game/combat.js";
import { Particles } from "./fx/particles.js";
import { ClientArrows } from "./net/clientArrows.js";
import { ClientMobs } from "./mobs/clientMobs.js";
import { DayNight } from "./game/dayNight.js";
import { SleepOverlay } from "./ui/sleepOverlay.js";
import { PrimedTnt } from "./fx/primedTnt.js";
import { ChatBox, formatChat, itemListToChat } from "./ui/chat.js";
import { createFog, createSky } from "./sky.js";
import { Hud, FpsCounter } from "./hud.js";
import { ANCHOR_TEX, CROP_TEX, STEM_ATTACHED_TEX, buildUvTable } from "./mesh/mesher.js";
import { WorkerPool } from "./workers/workerPool.js";
import { ChunkMeshes } from "./world/chunkMeshes.js";
import { ChunkManager } from "./world/chunkManager.js";
import { Interaction } from "./interact/interaction.js";
import { FirstPersonArm } from "./player/arm.js";
import { PlayerController } from "./player/playerController.js";
import { NetDebug } from "./ui/netDebug.js";
import { ViewEffects } from "./player/viewEffects.js";
import { Session } from "./game/session.js";
import { desktopApi } from "./net/desktop.js";
import { joinGame } from "./net/joinScreen.js";
import { startDesktop } from "./net/startScreen.js";
import { NetClient } from "./net/netClient.js";
import { compassState, preloadIcons } from "./ui/itemIcons.js";
import { injectStyles } from "./ui/styles.js";
import { debugLines } from "./ui/debugHud.js";
import { PauseMenu, backToMenu } from "./ui/pauseMenu.js";
import { MenuShot } from "./ui/menuBackground.js";
import { ThirdPerson } from "./player/thirdPerson.js";
import { BRIGHTNESS_MAX_LIGHT, onSettingsChange, saveSettings, settings, showFpsLabel } from "./settings.js";
const EXTRA_TEXTURES = [
  "crack_0", "crack_1", "crack_2", "crack_3", "crack_4", "snow_side", "rail_curved", "rail_t", "rail_cross", "bed_foot_side", "furnace_front_on",
  "chest_front_a", "chest_front_b", "farmland_wet", "bed_head_end", "bed_foot_end",
  ...Object.values(CROP_TEX).flat(), ...Object.values(STEM_ATTACHED_TEX), ...ANCHOR_TEX, // (10d2) mỏ neo hồi sinh
];
const NIGHT_VISION = 0.45; // độ sáng tối thiểu khi bật nhìn đêm (debug)

function readVec(params: URLSearchParams, name: string, n: number): number[] | null {
  const v = params.get(name)?.split(",").map(Number);
  return v && v.length === n && v.every(Number.isFinite) ? v : null;
}

async function main(): Promise<void> {
  const hud = new Hud();
  const params = new URLSearchParams(location.search);
  const hideMsg = params.get("nomsg") === "1";
  injectStyles();
  const desk = desktopApi(); // app desktop: màn hình Chơi một mình / Chơi nhiều người (?name= kiểm tra tự động: menu cũ)
  const { conn, welcome, early } = await (desk && !params.get("name") ? startDesktop(desk, params) : joinGame(params));
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
  const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
  const sky = createSky(1000);
  scene.add(sky.mesh);

  const world = new World(seed);
  const sampler = new TerrainSampler(seed);
  const netherBiomes = new NetherBiomes(netherSeed(seed)); // (10b) tên biome, màu sương
  const workers = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const structures = await fetch("/structures.json").then((r) => (r.ok ? r.json() : null)).catch(() => null); // (7e) mẫu công trình
  const pool = new WorkerPool(workers, { type: "init", seed, dim: welcome.dim, uvt: buildUvTable((n) => atlas.uv(n)), structures, customs: welcome.customs });
  const meshes = new ChunkMeshes(scene, atlas.texture, await loadTileTexture("water"));
  const chunks = new ChunkManager(world, pool, meshes);
  const vd = Number(params.get("vd")) || settings.viewDistance; // ?vd= (kiểm tra) hoặc Cài đặt
  chunks.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, vd));
  const effects = new ViewEffects(scene, camera, world);
  const applyViewDistance = (): void => {
    scene.fog = createFog(chunks.viewDistance * 16);
    effects.fogChanged();
  };
  applyViewDistance();
  onSettingsChange(() => (chunks.viewDistance = settings.viewDistance, applyViewDistance())); // Cài đặt ở menu Esc

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
  // chỉ quản trị viên được bay (Giai đoạn 5b)
  const startFlying = welcome.admin && (params.get("fly") === "1" || (!!pos && params.get("walk") !== "1"));
  const player = new PlayerController(world, fly, camera, startFlying);
  const admin = { on: welcome.admin }; // (9a) chế độ quản trị (/admin): bay, bảng thông số, N, F3, F4, sửa trong vùng an toàn
  player.canFly = admin.on;
  Object.assign(player.state, { health: welcome.health, hunger: welcome.hunger, saturation: welcome.saturation });
  fly.applyRotation();

  const arm = new FirstPersonArm(settings.fov, window.innerWidth / window.innerHeight);
  const net = new NetClient(conn, { world, chunks, scene, atlas, camera, player, yaw: () => fly.yaw, pitch: () => fly.pitch, selfId: welcome.id });
  net.onCustoms = (list, cuts) => pool.broadcast({ type: "customs", list, cuts }); // (8a) nhà tự lưu mới
  const session = new Session(scene, atlas, world, player, fly, renderer.domElement, welcome.respawn, conn);
  // 6a: chat, đánh nhau, vùng an toàn
  // (7b) /items [từ khóa]: tìm khóa vật phẩm cho /give ngay trên máy
  const send = (t: string): void => (/^\/items(\s|$)/i.test(t.trim()) ? itemListToChat(chat, t.trim().slice(6)) : net.chat(t));
  const chat = new ChatBox(send, () => (fly.locked || player.debugInput) && !session.screen.open, () => lockPointer(renderer.domElement));
  const swing = (): void => {
    arm.swing();
    net.swings++;
  };
  // 7a: sinh vật, ngày đêm, giường
  const particles = new Particles(scene);
  const mobs = new ClientMobs(scene, world, particles, atlas);
  const day = new DayNight(scene, sky, welcome.time), nb = (day.netherBiome = (x: number, z: number) => netherBiomes.at(x, z));
  const sleep = new SleepOverlay(() => net.wake(), () => lockPointer(renderer.domElement));
  net.mobs = mobs; // sinh vật, dây dắt (7d), thú đang được cưỡi
  net.onTime = (t) => day.set(t);
  net.onSleep = (on) => sleep.show(on);
  net.onRespawnAt = (p) => session.setRespawn(p);
  const tnt = new PrimedTnt(scene, world, atlas); // 7b
  net.onTnt = (m) => tnt.add(m.x, m.y, m.z, m.fuse);
  const combat = new CombatClient({
    camera, player, world, remote: net.remote, mobs, myId: welcome.id, held: () => session.inv.held?.item ?? null,
    attack: (id) => net.attack(id), attackMob: (id) => net.hitMob(id), swing,
  });
  const useEntity = (blockDist: number): boolean => {
    if (player.state.rideId && !player.state.rideBack && isRideFood(session.inv.held?.item)) return net.useMob(player.state.rideId), true; // (8a) cho thú đang cưỡi ăn
    const c = camera.position, d = camera.getWorldDirection(new THREE.Vector3());
    const hit = player.flying ? null : mobs.pick([c.x, c.y, c.z], [d.x, d.y, d.z], PLAYER.REACH);
    if (!hit || hit.dist >= blockDist) return false;
    net.useMob(hit.id);
    return true;
  };
  net.onChat = (m) => (m.kind === "chat" ? chat.add("chat", m.text, m.from) : chat.add(m.kind, formatChat(m.key, m.args)));
  // 6b: hạt chí mạng, vệt quét kiếm, mũi tên
  const arrows = new ClientArrows(scene, atlas, world, particles);
  net.onHurt = (m) => {
    combat.hurt(m.id);
    const at = m.id === welcome.id ? player.state : net.remote.posOf(m.id);
    if (m.crit && at) particles.critBurst(at.x, at.y, at.z);
  };
  net.onFx = (m) => particles.fx(m.kind, m.x, m.y, m.z, m.n);
  net.onFangs = (m) => particles.fangs.add(m.x, m.y, m.z, m.yaw, m.delay); // (8c)
  net.onArrows = (m) => arrows.apply(m.up, m.gone);
  net.onDim = (d) => { pool.broadcast({ type: "dim", dim: d }); arrows.clear(); day.dim = compassState.dim = d; applyViewDistance(); }; // (10a) đổi cõi
  net.sync.dim = day.dim = compassState.dim = welcome.dim; compassState.spawn = welcome.safe; // (10d2) la bàn
  let safeNoticeAt = -1e9;
  const canEdit = (x: number, z: number): boolean => {
    if (admin.on || !inSafeZone(x + 0.5, z + 0.5, welcome.safe)) return true;
    if (performance.now() - safeNoticeAt > 3000) {
      safeNoticeAt = performance.now();
      chat.add("error", formatChat("safeZone", []));
    }
    return false;
  };
  const interact = new Interaction(
    scene, world, atlas,
    {
      camera, player, inv: session.inv, net: net.actions(),
      locked: () => (fly.locked || player.debugInput) && !session.screen.open && !chat.open,
      yaw: () => fly.yaw,
      swing,
      sneaking: () => player.state.sneaking || fly.keys.has("ShiftLeft") || fly.keys.has("ShiftRight"),
      attack: () => combat.tryAttack(),
      canEdit, useEntity,
    },
    (x, _y, z) => chunks.onBlockChanged(x, z),
  );
  net.start(session, interact, early);
  player.blockInput = () => interact.blocking && !player.flying;
  player.drawInput = () => interact.bow.drawing;
  // debug: cho script kiểm tra điều khiển camera / sửa block từ ngoài (?debug=1);
  // autopilot = vận tốc tự bay (block/giây), áp trong vòng lặp khung hình
  const autopilot = { vx: 0, vz: 0 };
  if (params.get("debug") === "1") {
    player.debugInput = true;
    (window as unknown as Record<string, unknown>).__game = { camera, chunks, world, meshes, renderer, autopilot, player, fly, interact, session, net, combat, chat,
      give: (k: string, n?: number) => session.give(k, n) };
  }
  let nv = params.get("nv") === "1"; // nhìn đêm (debug)
  if (params.get("nocull") === "1") meshes.culling = false;
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyN" && admin.on) nv = !nv;
    if (e.code === "F4" && admin.on) {
      e.preventDefault();
      meshes.culling = !meshes.culling;
    }
    if (e.code !== "BracketLeft" && e.code !== "BracketRight") return;
    const d = e.code === "BracketLeft" ? -1 : 1;
    settings.viewDistance = Math.max(WORLD.VIEW_DISTANCE_MIN, Math.min(WORLD.VIEW_DISTANCE_MAX, chunks.viewDistance + d));
    saveSettings(); // lưu + áp dụng (onSettingsChange)
  });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    arm.resize(camera.aspect);
  });

  const netDebug = new NetDebug(net, player, () => world.chunks.size);
  const fps = new FpsCounter();
  net.onAdmin = (on) => {
    admin.on = on;
    if (!on && player.flying) player.toggleFly(); // thôi bay: rơi xuống
    player.canFly = on;
    if (!on) [nv, meshes.culling] = [false, true];
  };
  // (9a) menu Esc: thả chuột mà không mở giao diện nào khác
  const shot = new MenuShot(); // ảnh nền menu mở đầu
  const tp = new ThirdPerson({ eye: camera, player, world, remote: net.remote, inv: session.inv, yaw: () => fly.yaw, pitch: () => fly.pitch, // F5 góc nhìn
    swings: () => net.swings, blocking: () => interact.blocking, drawing: () => interact.bow.drawing, sleeping: () => sleep.open });
  const pause = new PauseMenu(() => lockPointer(renderer.domElement), () => (conn.close(), backToMenu()));
  const hudDeps = { camera, renderer, fps, sampler, day, netherBiome: nb, world, meshes, chunks, pool, seed, net, myName: welcome.name, mobs, player, netDebug, atlas };
  let prev = performance.now();
  let firstFrame = true;
  const dir = new THREE.Vector3();

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    player.update(dt);
    combat.update(dt); // sau khi đặt góc camera: rung khi trúng đòn
    if (player.flying) {
      camera.position.x += autopilot.vx * dt;
      camera.position.z += autopilot.vz * dt;
    }
    effects.update(dt, player.sprinting, interact.bow.power, player.state.fxNauseaS > 0);
    camera.updateMatrixWorld();
    camera.getWorldDirection(dir);
    chunks.update(camera.position.x, camera.position.z, dir.x, dir.z);
    interact.update(dt);
    arrows.update(dt);
    day.update(dt, camera, effects.eyeIn() !== null);
    meshes.uniforms.uDaylight.value = mobs.daylight = day.daylight;
    mobs.minLight = meshes.uniforms.uMinLight.value = Math.max(nv ? NIGHT_VISION : 0, day.minLight, settings.brightness * BRIGHTNESS_MAX_LIGHT); // (10a) Vực Lửa: ánh sáng nền
    mobs.update(dt, camera.position, net.mobView());
    tnt.update(dt);
    particles.update(dt);
    session.update(dt);
    const view = tp.frame(); // camera để vẽ (góc nhìn thứ 3: lùi ra sau / trước mặt); logic vẫn theo camera mắt
    net.update(dt);
    sky.follow(view);
    meshes.update(now / 1000, view, chunks.viewDistance, world);
    renderer.info.reset();
    renderer.clear();
    renderer.render(scene, view);
    shot.tick(now, renderer.domElement, day.dim === DIM.OVERWORLD && day.daylight > 0.8 && !effects.eyeIn() && !player.state.dead);
    arm.visible = !player.flying && view === camera;
    arm.setHeld(interact.bow.drawing ? `icon:${session.inv.held?.item === "crossbow" ? "crossbow_pulling" : "bow_pull"}_${interact.bow.stage}` : (session.inv.held ? session.inv.held.item + (session.inv.held.ench || session.inv.held.item === "enchanted_book" ? "*" : "") : null), atlas);
    arm.drawing = interact.bow.drawing;
    arm.setOffhand(session.inv.offhand[0]?.item ?? null, atlas);
    arm.blocking = interact.blocking && !player.flying;
    arm.update(dt);
    arm.render(renderer);

    pause.setVisible(!fly.locked && !player.debugInput && !hideMsg && !chat.open && !session.screen.open && !session.trade.open && !sleep.open &&
      !player.state.dead && !document.getElementById("disconnected"));
    if (fps.tick(now) || firstFrame) {
      firstFrame = false;
      showFpsLabel(fps.fps);
      hud.setInfo(admin.on ? debugLines(hudDeps, nv) : []); // (9a) người chơi thường: ẩn bảng thông số
      hud.setCenter(null);
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
