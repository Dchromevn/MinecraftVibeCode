// Kiểm tra 7c: thuần sói (xương 1/3, ngồi, đi theo / dịch chuyển, giáp sói, vòng cổ, đánh kẻ thù của chủ), sói hoang cả đàn
// đánh lại, dê cho sữa, xô cá, cá lên cạn, cá nóc, cá heo cho bơi nhanh, lạc đà nhổ, tatu cuộn tròn, cáo ngậm đồ, sinh theo biome,
// sinh vật môi trường (dơi, cá, mực), mã hóa byte riêng loài, công thức + món ăn mới.
import {
  B, BIOME, DAY, FOODS, NET, SPAWN_RULES, decodeMobs, encodeMobs, matchGrid, stack, type Column, type MobKey,
} from "../shared/src/index.js";
import { Game } from "../server/src/game.js";
import { animalBiome, spawnAmbient, wildVariant, type WildHost } from "../server/src/mobs/spawnerWild.js";
import type { Mobs } from "../server/src/mobs/mobs.js";
import { check } from "./harness.js";
import { fakeConn, standAt } from "./netHelpers.js";

// ---- dùng chung ----
{
  const r = decodeMobs(encodeMobs([{ id: 7, kind: 3, flags: 1, variant: 2, x: 1, y: 2, z: 3, yaw: 0, pitch: 0, extra: 0xa5 }], []));
  check("gói MOBS mang byte riêng loài (vòng cổ, ngồi, phồng...)", r?.up[0]?.extra === 0xa5);
  const fx = (FOODS.pufferfish!.effects ?? []).map((e) => e.fx).join(",");
  check("ăn cá nóc: ngộ độc + đói + buồn nôn", fx === "poison,hunger,nausea", fx);
  const S = "armadillo_scute";
  check("giáp sói = 6 vảy tatu; da = 4 da thỏ; thuốc nhuộm đen từ túi mực",
    matchGrid([S, null, null, S, S, S, S, null, S], 3)?.out.item === "wolf_armor" &&
    matchGrid(["rabbit_hide", "rabbit_hide", "rabbit_hide", "rabbit_hide"], 2)?.out.item === "leather" &&
    matchGrid(["ink_sac", null, null, null], 2)?.out.item === "black_dye");
}

// ---- sinh theo biome ----
{
  const col = (biome: number, extra: Partial<Column> = {}): Column =>
    ({ height: 70, waterTop: 62, biome, land: 1, mountain: 0, river: false, lake: false, temp: 0, humid: 0, ...extra }) as Column;
  check("bảng biome: rừng / tuyết / núi tuyết / đồng cỏ ấm",
    animalBiome(col(BIOME.FOREST)) === "forest" && animalBiome(col(BIOME.SNOWY)) === "snowy" &&
    animalBiome(col(BIOME.MOUNTAINS, { height: 120 })) === "mountains_snow" && animalBiome(col(BIOME.PLAINS, { temp: 0.5, humid: -0.5 })) === "plains_warm" &&
    animalBiome(col(BIOME.OCEAN)) === null);
  const host = { rng: Math.random, woolColor: () => 0, variantAt: () => 0 } as unknown as WildHost;
  const v = (k: MobKey, b: string): number => wildVariant(host, k, b, 0, 0);
  check("biến thể: thỏ sa mạc vàng, cáo tuyết trắng, sói đồng cỏ ấm đốm", v("rabbit", "desert") === 3 && v("fox", "snowy") === 1 && v("wolf", "plains_warm") === 4);
  for (const b of Object.keys(SPAWN_RULES.ANIMAL_BIOMES)) if (b === "snowy") check("đồng tuyết có thỏ, cáo, sói, gấu trắng", ["rabbit", "fox", "wolf", "polar_bear"].every((k) => k in SPAWN_RULES.ANIMAL_BIOMES[b]!));

  // sinh vật môi trường: biển ấm dưới y 62 có cá nhiệt đới / cá nóc / mực / cá heo; hang tối có dơi; giới hạn theo nhóm
  const spawned: string[] = [];
  const list: { def: { key: string }; x: number; z: number }[] = [];
  const fake = {
    list,
    spawn: (k: string, x: number, _y: number, z: number) => {
      spawned.push(k);
      list.push({ def: { key: k }, x, z });
    },
  } as unknown as Mobs;
  const warm = {
    mobs: fake, rng: Math.random, rawLight: () => 0x00, cell: (_x: number, y: number) => (y < 62 ? B.WATER : 0),
    column: () => col(BIOME.OCEAN, { temp: 0.6 }), surface: () => null, woolColor: () => 0, variantAt: () => 0,
  } as unknown as WildHost;
  const p = { x: 0, y: 64, z: 0 } as never;
  for (let i = 0; i < 4000; i++) spawnAmbient(warm, [p]);
  const n = (k: string): number => spawned.filter((s) => s === k).length;
  const fish = n("tropical_fish") + n("pufferfish") + n("cod") + n("salmon");
  check("biển ấm: cá nhiệt đới / cá nóc, mực, mực phát sáng dưới sâu; không quá giới hạn",
    n("tropical_fish") + n("pufferfish") > 0 && n("squid") + n("dolphin") > 0 && n("glow_squid") > 0 && n("cod") === 0 &&
    fish <= SPAWN_RULES.AMBIENT_CAPS.fish! + 8 && n("glow_squid") <= SPAWN_RULES.AMBIENT_CAPS.glow!, JSON.stringify(Object.fromEntries(["tropical_fish", "pufferfish", "squid", "dolphin", "glow_squid"].map((k) => [k, n(k)]))));
  spawned.length = 0;
  list.length = 0;
  const cave = { ...warm, cell: (_x: number, y: number) => (y > 40 ? B.STONE : 0), rawLight: () => 0 } as WildHost;
  for (let i = 0; i < 2000; i++) spawnAmbient(cave, [p]);
  check("hang tối dưới y 63: dơi, tối đa 8 quanh người chơi", n("bat") > 0 && n("bat") <= SPAWN_RULES.AMBIENT_CAPS.bat!, `${n("bat")}`);
}

// ---- server ----
const game = new Game({ seed: "quai7c", port: 0, spawn: "fixed", debug: true, world: "c", admins: [], adminAll: true, dataDir: null });
game.life.spawning = false;
const f = fakeConn();
game.message(f.conn, JSON.stringify({ t: "hello", name: "An", password: "matkhau", version: NET.PROTOCOL_VERSION }));
const p = game.online()[0]!, mobs = game.life.mobs;
const sp = game.spawn, X = Math.floor(sp.x) + 80, Z = Math.floor(sp.z), Y = 100;
const stand = (): void => {
  standAt(p, X + 0.5, Y, Z + 0.5);
  Object.assign(p.state, { health: 20, dead: false, invulnS: 0, lastHurt: 0, hunger: 20, fxPoisonS: 0 });
  p.deathHandled = false;
};
stand();
for (let i = 0; i < 90; i++) game.tick();
const set = (x: number, y: number, z: number, id: number): void => void game.w.setCell(x, y, z, id, 0);
for (let dx = -24; dx <= 24; dx++) for (let dz = -24; dz <= 24; dz++) {
  set(X + dx, Y - 1, Z + dz, B.STONE);
  for (let y = Y; y < Y + 4; y++) set(X + dx, y, Z + dz, B.AIR);
}
for (let i = 0; i < 40; i++) game.tick();
const clear = (): void => void mobs.list.splice(0);
clear();
game.clock.set(DAY.SET_NOON);
const ticks = (n: number): void => {
  for (let i = 0; i < n; i++) {
    stand();
    game.tick();
  }
};
const use = (id: number, item: string | null, count = 1): void => {
  p.inv.main[p.inv.selected] = item ? { item, count, damage: 0 } : null;
  game.message(f.conn, JSON.stringify({ t: "useMob", id }));
};
p.lookYaw = 0;
p.pitch = -0.35;

// ---- thuần sói ----
const wolf = mobs.spawn("wolf", X + 0.5, Y, Z - 1.5);
let bones = 0;
for (; bones < 40 && !wolf.owner; bones++) {
  Object.assign(wolf.body, { x: X + 0.5, y: Y, z: Z - 1.5 });
  wolf.hist.length = 0;
  use(wolf.id, "bone");
}
check("cho sói xương: sau vài lần thì thuần (chủ, 40 máu, ngồi)", wolf.owner === "An" && wolf.maxHealth === 40 && wolf.health === 40 && wolf.sitting, `${bones} xương`);
use(wolf.id, null);
check("chủ bấm tay không: sói đứng dậy", !wolf.sitting);
use(wolf.id, "blue_dye");
check("nhuộm vòng cổ xanh dương (byte riêng loài có thuần + màu)", wolf.collar === 11 && (wolf.extra() & 1) === 1 && wolf.extra() >> 4 === 11);
use(wolf.id, "wolf_armor");
const hp = wolf.health;
mobs.hurt(wolf, 5, "other");
check("mặc giáp sói: đòn đánh trừ độ bền giáp, không mất máu", wolf.armorDur === 59 && wolf.health === hp, `giáp ${wolf.armorDur}`);
use(wolf.id, "shears");
check("kéo tháo giáp: rơi giáp sói đã mòn", wolf.armorDur === 0 && game.items.list.some((e) => e.stack.item === "wolf_armor" && e.stack.damage === 5));
// đi theo chủ: bị bỏ xa thì dịch chuyển về
Object.assign(wolf.body, { x: X + 20.5, y: Y, z: Z + 20.5 });
ticks(60);
check("chủ đi xa > 12 block: sói dịch chuyển về gần chủ", Math.hypot(wolf.x - p.x, wolf.z - p.z) < 10, `${Math.hypot(wolf.x - p.x, wolf.z - p.z).toFixed(1)}`);
// chủ đánh quái → sói lao vào
const zom = mobs.spawn("zombie", X + 6.5, Y, Z + 0.5);
mobs.hurt(zom, 1, "player", { by: p });
check("chủ đánh xác sống: sói nhắm xác sống", wolf.prey === zom);
ticks(200);
check("sói cắn xác sống tới chết", zom.dead || !mobs.list.includes(zom), `máu xs ${zom.health.toFixed(1)}`);
{
  // phối giống: hai sói thuần đủ máu, cho ăn thịt → sói con của chủ
  const w2 = mobs.spawn("wolf", X + 2.5, Y, Z - 1.5);
  Object.assign(w2, { owner: "An", maxHealth: 40, health: 40 });
  wolf.health = wolf.maxHealth;
  for (const w of [wolf, w2]) {
    w.sitting = false;
    Object.assign(w.body, { x: X + 0.5, y: Y, z: Z - 1.5 });
    w.hist.length = 0;
    use(w.id, "beef");
  }
  check("cho hai sói thuần đủ máu ăn thịt: muốn phối giống", wolf.loveS > 0 && w2.loveS > 0);
  ticks(100);
  const pup = mobs.list.find((m) => m.def.key === "wolf" && m.baby);
  check("hai sói gặp nhau đẻ sói con, sói con là của chủ", !!pup && pup.owner === "An" && pup.maxHealth === 40, pup ? `${pup.owner}` : "không có");
  if (pup) mobs.remove(pup);
  mobs.remove(w2);
}
const save = wolf.toSave();
check("lưu sói thuần: chủ, máu tối đa, vòng cổ", save.owner === "An" && save.maxHealth === 40 && save.collar === 11);
clear();

// sói hoang: đánh một con, cả đàn đánh lại
{
  const pack = [0, 1, 2].map((i) => mobs.spawn("wolf", X + 4.5 + i, Y, Z + 4.5));
  mobs.hurt(pack[0]!, 1, "player", { by: p });
  check("đánh sói hoang: cả đàn quay lại đánh", pack.every((w) => w.target === p));
  clear();
}

// ---- phối giống từng loài: hai con trưởng thành, cho ăn món ưa thích → con non ----
{
  const FOOD: Record<string, string> = { pig: "carrot", cow: "wheat", sheep: "wheat", chicken: "seeds", rabbit: "dandelion", goat: "wheat", llama: "wheat", armadillo: "spider_eye" };
  const bad: string[] = [];
  p.pitch = -0.6; // nhìn xuống: trúng cả con thấp (thỏ, gà)
  for (const [k, food] of Object.entries(FOOD)) {
    clear();
    const pair = [mobs.spawn(k as never, X + 0.5, Y, Z - 1.5), mobs.spawn(k as never, X + 2.5, Y, Z - 1.5)];
    for (const m of pair) {
      Object.assign(m.body, { x: X + 0.5, y: Y, z: Z - 1.5 });
      m.hist.length = 0;
      use(m.id, food);
    }
    const fed = pair.every((m) => m.loveS > 0);
    ticks(120);
    if (!fed || !mobs.list.some((m) => m.def.key === k && m.baby)) bad.push(`${k}${fed ? "" : " (không ăn)"}`);
  }
  clear();
  p.pitch = -0.35;
  check("phối giống: lợn, bò, cừu, gà, thỏ, dê, lạc đà, tatu đều đẻ con khi cho ăn", bad.length === 0, bad.join(", "));
}

// ---- dê, cá, xô ----
const goat = mobs.spawn("goat", X + 0.5, Y, Z - 1.5);
use(goat.id, "bucket");
check("vắt sữa dê bằng xô", p.inv.held?.item === "milk_bucket");
mobs.remove(goat);
const cod = mobs.spawn("cod", X + 0.5, Y, Z - 1.5);
p.pitch = -0.65; // cá thấp: nhìn xuống
use(cod.id, "water_bucket");
check("xô nước xúc cá tuyết: thành xô cá, cá biến mất", p.inv.held?.item === "cod_bucket" && !mobs.list.includes(cod));
game.actions.onFish("cod", X + 3.5, Y, Z + 3.5);
const freed = mobs.list.find((m) => m.def.key === "cod");
check("đổ xô cá: thả cá ra, cá này được giữ lại (không tự biến mất)", !!freed && freed.persistent);
ticks(20 * 9);
check("cá trên cạn: giãy rồi mất máu", !!freed && freed.health < freed.maxHealth);
clear();

// ---- hồ nước: cá nóc, cá heo ----
{
  const PX = X - 12, PZ = Z - 12;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = Y - 4; y < Y; y++) set(PX + dx, y, PZ + dz, Math.abs(dx) === 3 || Math.abs(dz) === 3 || y === Y - 4 ? B.STONE : B.WATER);
  for (let i = 0; i < 20; i++) game.tick();
  const swim = (): void => {
    standAt(p, PX + 0.5, Y - 2.5, PZ + 0.5);
    Object.assign(p.state, { health: 20, dead: false, inWater: true });
  };
  const puff = mobs.spawn("pufferfish", PX + 1, Y - 2.5, PZ + 0.5);
  let poisoned = false;
  for (let i = 0; i < 20 * 15 && !poisoned; i++) {
    swim();
    Object.assign(puff.body, { x: PX + 1, y: Y - 2.3, z: PZ + 0.5 });
    game.tick();
    poisoned = p.state.fxPoisonS > 0;
  }
  check("lại gần cá nóc: nó phồng lên, chạm vào thì trúng độc", poisoned, `phồng ${puff.puff}`);
  clear();
  p.state.fxPoisonS = 0;
  const dol = mobs.spawn("dolphin", PX - 1.5, Y - 2.5, PZ - 1.5);
  let grace = false;
  for (let i = 0; i < 20 * 20 && !grace; i++) {
    swim();
    game.tick();
    grace = p.state.fxGraceS > 0;
  }
  check("bơi cạnh cá heo: được hiệu ứng bơi nhanh", grace && !dol.dead);
  clear();
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = Y - 4; y < Y; y++) set(PX + dx, y, PZ + dz, B.STONE);
}

// ---- lạc đà, tatu, cáo ----
{
  const llama = mobs.spawn("llama", X + 5.5, Y, Z + 0.5);
  mobs.hurt(llama, 1, "player", { by: p });
  let minH = 20;
  for (let i = 0; i < 100; i++) {
    game.tick();
    minH = Math.min(minH, p.health);
    Object.assign(p.state, { x: X + 0.5, y: Y, z: Z + 0.5 });
  }
  check("đánh lạc đà không bướu: nó nhổ nước bọt, người chơi mất máu", minH < 20 && llama.target === p, `máu ${minH}`);
  const mom = mobs.spawn("polar_bear", X - 8.5, Y, Z - 8.5), cub = mobs.spawn("polar_bear", X - 6.5, Y, Z - 8.5, { baby: true });
  mobs.hurt(cub, 1, "player", { by: p });
  check("đánh gấu con: gấu mẹ tấn công", mom.target === p);
  // dê húc: đẩy văng mạnh
  {
    const g = mobs.spawn("goat", X + 6.5, Y, Z + 0.5);
    g.ramS = 0;
    let pushed = 0;
    for (let i = 0; i < 120 && pushed < 4; i++) {
      p.state.vx = p.state.vz = 0;
      Object.assign(p.state, { x: X + 0.5, y: Y, z: Z + 0.5, onGround: true });
      game.tick();
      pushed = Math.max(pushed, Math.hypot(p.state.vx, p.state.vz));
    }
    check("dê húc người chơi: bị đẩy văng mạnh", pushed >= 4, `tốc độ ${pushed.toFixed(1)}`);
  }
  const arm = mobs.spawn("armadillo", X - 4.5, Y, Z + 4.5);
  mobs.hurt(arm, 1, "player", { by: p });
  check("tatu bị đánh: cuộn tròn", arm.rolledS > 0 && (arm.extra() & 1) === 1);
  clear();
  game.clock.set(DAY.SET_MIDNIGHT);
  const fox = mobs.spawn("fox", X + 10.5, Y, Z + 10.5);
  game.items.pop(stack("emerald"), X + 10, Y, Z + 10);
  for (const e of game.items.list) e.pickupDelay = 0;
  for (let i = 0; i < 40 && !fox.held; i++) {
    game.tick();
  }
  check("cáo nhặt và ngậm đồ rơi gần", fox.held?.item === "emerald");
  mobs.hurt(fox, 100, "player", { by: p });
  check("cáo chết: rơi món đang ngậm", game.items.list.some((e) => e.stack.item === "emerald"));
  clear();
}
