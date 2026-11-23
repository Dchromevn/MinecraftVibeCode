// Đồ rơi khi sinh vật chết (tách từ mobs.ts ở Giai đoạn 7d): theo bảng của loài (đồ nấu chín nếu đang cháy, cung mòn), cáo rơi
// món đang ngậm, kẻ hư không rơi khối đang cầm, cừu chưa tỉa rơi len, khối nhầy tách nhỏ; (7d) thú cưỡi rơi yên, rương + đồ trong rương.
import { BLOCKS, COLORS, HORSE_ARMOR_KEYS, PIGLIN, XP, itemDef, maxDurability, randInt, stack, type ItemStack, type MobKey, type Rng } from "../../../shared/src/index.js";
import type { Mob } from "./mob.js";

export function dropLoot(m: Mob, rng: Rng, pop: (s: ItemStack) => void, spawn: (key: MobKey, x: number, y: number, z: number, variant: number) => void): void {
  if (m.held) pop(m.held); // cáo: đồ đang ngậm; (8b) tiểu linh: món được đưa
  if (m.bag) pop(m.bag);
  for (const s of m.pocket) pop(s); // (10d1) túi người lợn
  if (m.def.key === "piglin" && !m.baby && m.variant && rng() < PIGLIN.WEAPON_DROP + 0.01 * m.looting) // vũ khí: nỏ / kiếm vàng (đã mòn)
    pop(stack(m.variant === 2 ? "crossbow" : "gold_sword", 1, Math.floor(maxDurability(m.variant === 2 ? "crossbow" : "gold_sword") * (0.5 + rng() * 0.45))));
  if (m.carry) pop(stack(itemDef(BLOCKS[m.carry]!.key) ? BLOCKS[m.carry]!.key : "dirt")); // khối kẻ hư không cầm
  if (m.saddled) pop(stack("saddle")); // (7d)
  if (m.horseArmor) pop(stack(HORSE_ARMOR_KEYS[m.horseArmor]!)); // (10c) giáp ngựa
  if (m.chest) {
    pop(stack("chest"));
    for (const s of m.chest) if (s) pop(s);
  }
  if (m.def.sized && m.variant > 1) {
    // khối nhầy to / vừa tách thành 2–4 con nhỏ hơn một cỡ, không rơi đồ
    for (let i = randInt(rng, 2, 4); i > 0; i--)
      spawn(m.def.key, m.x + (rng() - 0.5) * m.width / 2, m.y + 0.2, m.z + (rng() - 0.5) * m.width / 2, m.variant / 2);
    if (m.def.key !== "magma_cube") return; // (10b) khối nhầy dung nham cỡ vừa / to: vẫn rơi kem dung nham
  } else if (m.def.key === "magma_cube") return; // cỡ nhỏ nhất: không rơi gì
  const byPlayer = performance.now() - m.playerHitAt < 5000; // (10c) người chơi đánh trong 5 giây trước khi chết (như kinh nghiệm)
  for (const d of m.def.drops) {
    if (d.player && !byPlayer) continue; // que quỷ lửa, sọ bộ xương héo: chỉ khi người chơi giết
    if (d.chance !== undefined && rng() >= d.chance + 0.01 * m.looting) continue; // (8b2) Cướp bóc: đồ hiếm +1% mỗi cấp
    const n = randInt(rng, d.min, d.max + (d.chance === undefined ? m.looting : 0)); // đồ thường: tối đa + cấp
    if (n <= 0) continue;
    // đồ đã mòn (cung bộ xương): độ bền còn lại ngẫu nhiên, thường thấp — công thức của Minecraft
    const max = d.worn ? maxDurability(d.item) : 0;
    const damage = max ? max - randInt(rng, 1, 1 + randInt(rng, 0, Math.max(max - 3, 1))) : 0;
    pop(stack(m.burnS > 0 && d.cooked ? d.cooked : d.item, n, Math.max(0, damage)));
  }
  if (m.def.key === "sheep" && !m.sheared) pop(stack(`${COLORS[m.variant] ?? "white"}_wool`));
}

/** (8b2) Kinh nghiệm khi chết: quái 5, động vật trưởng thành 1–3, con non 0; vài loài riêng (XP.MOB_XP). */
export function mobXp(m: Mob, rng: Rng): number {
  if (m.baby) return 0;
  const own = XP.MOB_XP[m.def.key];
  if (own !== undefined) return own;
  return m.def.hostile ? XP.HOSTILE : randInt(rng, XP.ANIMAL[0], XP.ANIMAL[1]);
}
