// Công cụ cho agent (Giai đoạn 10c): đọc cách dựng từng mảnh pháo đài Vực Lửa thật từ client.jar (NetherFortressPieces) bằng javap
// của JDK — chạy thử mã bytecode của hàm postProcess trên một "thế giới giả", ghi lại mọi lệnh đặt block theo tọa độ trong mảnh
// (chưa xoay), rồi sinh shared/src/worldgen/fortressPiecesGen.ts (chỉ chứa số). Chạy lại khi đổi bản client.jar:
//   npx tsx scripts/mc-fortress-dump.ts
// Lệnh ghi lại: ["B", x0, y0, z0, x1, y1, z1, viền, trong, bỏ qua ô trống] (generateBox), ["S", x, y, z, khối] (placeBlock / setBlock),
// ["D", x, y, z, khối] (fillColumnDown: kéo cột xuống tới nền), ["C", x, y, z] (rương, chỉ khi mảnh cần rương), ["P", x, y, z] (lồng quỷ lửa).
// Số ngẫu nhiên (đầu cầu cụt: RandomSource theo selfSeed) ghi thành chuỗi "r<n>" = rng.nextInt(n) theo đúng thứ tự gọi.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const JAVAP = ["C:/Program Files/Java/jdk-25/bin/javap.exe", "javap"].find((p) => p === "javap" || existsSync(p))!;
const JAR = join(process.cwd(), "assets-src/minecraft", readdirSync(join(process.cwd(), "assets-src/minecraft")).find((f) => f.endsWith(".jar"))!);
const PKG = "net.minecraft.world.level.levelgen.structure.structures.NetherFortressPieces$";
const PIECES = [
  "BridgeStraight", "BridgeEndFiller", "BridgeCrossing", "RoomCrossing", "StairsRoom", "MonsterThrone", "CastleEntrance",
  "CastleSmallCorridorPiece", "CastleSmallCorridorCrossingPiece", "CastleSmallCorridorRightTurnPiece", "CastleSmallCorridorLeftTurnPiece",
  "CastleCorridorStairsPiece", "CastleCorridorTBalconyPiece", "CastleStalkRoom",
];

type Val = number | string | null | { k: string; [x: string]: unknown };
interface Ins { pc: number; op: string; arg: string; comment: string }

function method(cls: string, name: string): Ins[] {
  const lines = execFileSync(JAVAP, ["-c", "-p", "-cp", JAR, cls], { encoding: "utf8", maxBuffer: 64 << 20 }).split(/\r?\n/);
  let i = lines.findIndex((l) => new RegExp(`[\\s.]${name}\\(`).test(l) && l.trim().endsWith(";"));
  if (i < 0) throw new Error(`không thấy ${cls}.${name}`);
  const out: Ins[] = [];
  for (i += 2; i < lines.length; i++) {
    const t = lines[i]!;
    if (/^\s+\d+: tableswitch|lookupswitch/.test(t)) throw new Error("chưa hỗ trợ switch");
    const m = t.match(/^\s+(\d+): (\w+)\s*([^/]*?)\s*(?:\/\/ (.*))?$/);
    if (!m) break;
    out.push({ pc: Number(m[1]), op: m[2]!, arg: m[3]!.trim(), comment: m[4] ?? "" });
  }
  return out;
}

/** Chạy postProcess của mảnh; trả về danh sách lệnh. */
function dump(piece: string): unknown[] {
  const code = method(PKG + piece, "postProcess"), at = new Map(code.map((c, k) => [c.pc, k]));
  const ops: unknown[] = [], self = { k: "this", fields: { isNeedingChest: 1, hasPlacedSpawner: 0, selfSeed: 0 } as Record<string, Val> };
  const st: Val[] = [], loc: Val[] = [self, { k: "level" }, null, null, { k: "random" }, { k: "box" }, null, null];
  const pop = (): Val => st.pop()!;
  const num = (): number => {
    const v = pop();
    if (typeof v !== "number") throw new Error(`cần số, gặp ${JSON.stringify(v)}`);
    return v;
  };
  const stateName = (s: Val): string => {
    const o = s as { k: string; block: string; props: Record<string, string> };
    if (o?.k !== "state") throw new Error(`cần block state, gặp ${JSON.stringify(s)}`);
    return o.block === "nether_brick_stairs" ? `${o.block}:${o.props.facing}` : o.block; // hàng rào tự nối theo khối bên cạnh
  };
  for (let k = 0; k < code.length; k++) {
    const { op, arg, comment } = code[k]!;
    const jump = (): void => void (k = at.get(Number(arg))! - 1);
    let m: RegExpMatchArray | null;
    if ((m = op.match(/^[il]const_(m1|\d)$/))) st.push(m[1] === "m1" ? -1 : Number(m[1]));
    else if (op === "aconst_null") st.push(null);
    else if (op === "bipush" || op === "sipush") st.push(Number(arg));
    else if ((m = op.match(/^[ial]load(?:_(\d))?$/))) st.push(loc[Number(m[1] ?? arg)]!);
    else if ((m = op.match(/^[ial]store(?:_(\d))?$/))) loc[Number(m[1] ?? arg)] = pop();
    else if (op === "iinc") { const [a, b] = arg.split(",").map((s) => Number(s.trim())); loc[a!] = (loc[a!] as number) + b!; }
    else if (op === "dup") st.push(st[st.length - 1]!);
    else if (op === "pop") pop();
    else if (/^i(add|sub|mul|div|rem|and|or|xor|shl|shr)$/.test(op)) {
      const b = num(), a = num(), o = op.slice(1);
      st.push(o === "and" ? a & b : o === "or" ? a | b : o === "xor" ? a ^ b : o === "shl" ? a << b : o === "shr" ? a >> b :
        Math.trunc(o === "add" ? a + b : o === "sub" ? a - b : o === "mul" ? a * b : o === "div" ? a / b : a % b));
    } else if (op === "goto") jump();
    else if ((m = op.match(/^if_icmp(\w\w)$/)) || (m = op.match(/^if(eq|ne|lt|ge|gt|le)$/))) {
      const b = op.startsWith("if_") ? num() : 0, a = num(), c = m[1]!;
      if ((c === "eq" && a === b) || (c === "ne" && a !== b) || (c === "lt" && a < b) || (c === "ge" && a >= b) || (c === "gt" && a > b) || (c === "le" && a <= b)) jump();
    } else if (op === "ifnull" || op === "ifnonnull") { const v = pop(); if ((v === null) === (op === "ifnull")) jump(); }
    else if (op === "checkcast" || op === "i2l" || op === "l2i") { /* bỏ qua (selfSeed int → long) */ }
    else if (op === "instanceof") { pop(); st.push(1); }
    else if (op === "getfield") {
      const o = pop() as { k: string; fields?: Record<string, Val> }, f = comment.match(/Field (?:[\w/$]+\.)?(\w+):/)![1]!;
      st.push(o?.k === "this" && f !== "boundingBox" ? (o.fields![f] ?? 0) : { k: "field", f });
    } else if (op === "putfield") { const v = pop(), o = pop() as { k: string; fields?: Record<string, Val> }; if (o?.k === "this") o.fields![comment.match(/Field (\w+):/)![1]!] = v; }
    else if (op === "getstatic") {
      const f = comment.match(/Field ([\w/$]+)\.(\w+):/)!, owner = f[1]!.split("/").pop()!, name = f[2]!;
      if (owner === "Blocks") st.push({ k: "block", name: name.toLowerCase() });
      else if (owner === "Direction") st.push({ k: "dir", name: name.toLowerCase() });
      else if (owner === "FenceBlock" || owner === "StairBlock") st.push({ k: "prop", name: name.toLowerCase() });
      else st.push({ k: "static", name });
    } else if (op === "return") return ops;
    else if (op.startsWith("invoke")) {
      const mm = comment.match(/(?:Interface)?Method (?:([\w/$]+)\.)?([\w<>$"]+):\(([^)]*)\)(.*)$/)!;
      const owner = (mm[1] ?? "").split("/").pop()!, name = mm[2]!.replaceAll("\"", ""), types = mm[3]!.match(/\[*(?:L[^;]+;|[ZBCSIFJD])/g) ?? [];
      const a: Val[] = types.map(() => null);
      for (let j = types.length - 1; j >= 0; j--) a[j] = pop();
      const obj = op === "invokestatic" ? null : pop();
      const r = call(owner, name, obj, a, ops, stateName);
      if (r !== undefined) st.push(r);
      else if (!mm[4]!.startsWith("V")) throw new Error(`chưa hỗ trợ ${owner}.${name}`);
    } else throw new Error(`chưa hỗ trợ lệnh ${op} ${arg} // ${comment}`);
  }
  return ops;
}

function call(owner: string, name: string, obj: Val, a: Val[], ops: unknown[], sn: (s: Val) => string): Val | undefined {
  const o = obj as { k: string; name?: string; block?: string; props?: Record<string, string> } | null;
  if (name === "defaultBlockState") return { k: "state", block: o!.name!, props: {} };
  if (name === "setValue") {
    const p = a[0] as unknown as { name: string }, v = a[1] as unknown as { k: string; name?: string } | number;
    return { k: "state", block: o!.block!, props: { ...o!.props, [p.name]: typeof v === "number" ? String(v) : v.name! } };
  }
  if (owner === "Boolean" && name === "valueOf") return a[0];
  if (name === "generateBox") {
    const n = a.slice(2, 8) as number[];
    ops.push(["B", ...n, sn(a[8]!), sn(a[9]!), a[10] ? 1 : 0]);
    return null;
  }
  if (name === "placeBlock") return ops.push(["S", a[2], a[3], a[4], sn(a[1]!)]), null;
  if (name === "fillColumnDown") return ops.push(["D", a[2], a[3], a[4], sn(a[1]!)]), null;
  if (name === "createChest") return ops.push(["C", a[3], a[4], a[5]]), 1;
  if (name === "getWorldPos") return { k: "pos", p: [a[0], a[1], a[2]] };
  if (name === "isInside") return 1;
  if (name === "setBlock") {
    const p = (a[0] as unknown as { p: number[] }).p, s = sn(a[1]!);
    ops.push(s === "spawner" ? ["P", ...p] : ["S", ...p, s]);
    return 1;
  }
  if (name === "getBlockEntity") return { k: "be" };
  if (name === "scheduleTick" || name === "setEntityId") return null;
  if (owner === "RandomSource" && name.startsWith("create")) return { k: "rng" };
  if (name === "nextInt" && o?.k === "rng") return `r${a[0] as number}`;
  if (owner === "Math") return (Math as unknown as Record<string, (...x: number[]) => number>)[name]!(...(a as number[]));
  return undefined;
}

let out = "// Tự sinh bởi scripts/mc-fortress-dump.ts từ client.jar (đừng sửa tay): lệnh dựng từng mảnh pháo đài Vực Lửa theo tọa độ trong\n" +
  "// mảnh (x ngang, y lên, z sâu — chưa xoay). B: hộp [x0,y0,z0,x1,y1,z1, viền, trong, bỏ qua ô trống]; S: một khối; D: kéo cột xuống\n" +
  "// tới nền; C: rương; P: lồng quỷ lửa. \"r<n>\" = số ngẫu nhiên 0..n−1 (theo thứ tự).\n" +
  "export type FortOp = (string | number)[];\nexport const FORTRESS_OPS: Record<string, FortOp[]> = {\n";
for (const p of PIECES) {
  const ops = dump(p);
  out += `  ${p}: ${JSON.stringify(ops)},\n`;
  console.log(`[mc-fortress-dump] ${p}: ${ops.length} lệnh`);
}
out += "};\n";
writeFileSync(join(process.cwd(), "shared/src/worldgen/fortressPiecesGen.ts"), out);
