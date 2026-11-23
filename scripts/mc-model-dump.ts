// Công cụ cho agent (Giai đoạn 7c): đọc hình học model sinh vật thật từ client.jar (người dùng tự tải) bằng javap của JDK, chạy
// thử mã bytecode của hàm dựng model (createBodyLayer...) rồi in danh sách phần (hộp, điểm xoay, góc, UV, cỡ ảnh) dạng JSON.
//   npx tsx scripts/mc-model-dump.ts <tên class> [tên hàm=createBodyLayer]
//   vd: npx tsx scripts/mc-model-dump.ts net.minecraft.client.model.animal.rabbit.AdultRabbitModel
// Chỉ hỗ trợ các lệnh bytecode hay gặp trong hàm dựng model; gặp lệnh lạ thì báo lỗi.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const JAVAP = ["C:/Program Files/Java/jdk-25/bin/javap.exe", "javap"].find((p) => p === "javap" || existsSync(p))!;
const JAR = join(process.cwd(), "assets-src/minecraft", readdirSync(join(process.cwd(), "assets-src/minecraft")).find((f) => f.endsWith(".jar"))!);

interface Cube { uv: [number, number]; box: number[]; inflate: number; mirror: boolean }
interface Pose { x: number; y: number; z: number; rx: number; ry: number; rz: number }
interface Part { name: string; cubes: Cube[]; pose: Pose; children: Map<string, Part> }
interface Builder { kind: "builder"; cubes: Cube[]; u: number; v: number; mirror: boolean }
type Val = number | string | null | Part | Builder | Pose | { kind: "deform"; g: number } | { kind: "mesh"; root: Part } |
  { kind: "layer"; mesh: { root: Part }; w: number; h: number } | { kind: "obj"; cls: string };

const ZERO: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
const newPart = (name: string): Part => ({ name, cubes: [], pose: { ...ZERO }, children: new Map() });

interface Ins { pc: number; op: string; arg: string; comment: string }
const classCache = new Map<string, string>();
function disasm(cls: string): string {
  let out = classCache.get(cls);
  if (!out) {
    out = execFileSync(JAVAP, ["-c", "-p", "-cp", JAR, cls], { encoding: "utf8", maxBuffer: 64 << 20 });
    classCache.set(cls, out);
  }
  return out;
}

/** Lệnh của hàm name (descriptor bắt đầu bằng desc nếu có). */
function method(cls: string, name: string, argc?: number): Ins[] {
  const lines = disasm(cls).split(/\r?\n/);
  let i = lines.findIndex((l) => new RegExp(`[\\s.]${name}\\(([^)]*)\\);`).test(l) &&
    (argc === undefined || (l.match(/\(([^)]*)\)/)![1]!.split(",").filter((s) => s.trim()).length === argc)));
  if (i < 0) {
    // (7d) hàm tĩnh thừa kế: tìm ở lớp cha (vd. EquineSaddleModel.createBodyMesh → AbstractEquineModel)
    const sup = lines.find((l) => / class .* extends /.test(l))?.match(/ extends ([\w.$]+)/)?.[1];
    if (sup && sup.startsWith("net.minecraft.client.model")) return method(sup, name, argc);
    throw new Error(`không thấy ${cls}.${name}`);
  }
  const out: Ins[] = [];
  for (i += 2; i < lines.length; i++) {
    const m = lines[i]!.match(/^\s+(\d+): (\w+)\s*([^/]*?)\s*(?:\/\/ (.*))?$/);
    if (!m) break;
    out.push({ pc: Number(m[1]), op: m[2]!, arg: m[3]!.trim(), comment: m[4] ?? "" });
  }
  return out;
}

function run(cls: string, name: string, args: Val[], argc?: number): Val {
  const code = method(cls, name, argc), at = new Map(code.map((c, k) => [c.pc, k]));
  const st: Val[] = [], loc: Val[] = [...args];
  const pop = (): Val => st.pop()!;
  const num = (): number => pop() as number;
  for (let k = 0; k < code.length; k++) {
    const { op, arg, comment } = code[k]!;
    const jump = (): void => { k = at.get(Number(arg))! - 1; };
    let m: RegExpMatchArray | null;
    if ((m = op.match(/^[fia]const_(m1|\d|null)$/)) || op === "aconst_null") st.push(op === "aconst_null" ? null : m![1] === "m1" ? -1 : Number(m![1]));
    else if (op === "bipush" || op === "sipush") st.push(Number(arg));
    else if (op === "ldc" || op === "ldc_w" || op === "ldc2_w") {
      const c = comment.match(/^(float|int|String|double|long) (.*)$/)!;
      st.push(c[1] === "String" ? c[2]! : parseFloat(c[2]!));
    } else if ((m = op.match(/^[fiad]load(?:_(\d))?$/))) st.push(loc[Number(m[1] ?? arg)]!);
    else if ((m = op.match(/^[fiad]store(?:_(\d))?$/))) loc[Number(m[1] ?? arg)] = pop();
    else if (op === "iinc") { const [a, b] = arg.split(",").map((s) => Number(s.trim())); loc[a!] = (loc[a!] as number) + b!; }
    else if (op === "dup") st.push(st[st.length - 1]!);
    else if (op === "pop") pop();
    else if (/^[fid](add|sub|mul|div|rem)$/.test(op)) {
      const b = num(), a = num(), o = op.slice(1);
      let r = o === "add" ? a + b : o === "sub" ? a - b : o === "mul" ? a * b : o === "div" ? a / b : a % b;
      if (op[0] === "i") r = Math.trunc(r);
      st.push(r);
    } else if (/^[fid]neg$/.test(op)) st.push(-num());
    else if (/^[ifd]2[ifd]$/.test(op)) st.push(op.endsWith("i") ? Math.trunc(num()) : num());
    else if (op === "goto") jump();
    else if ((m = op.match(/^if_icmp(\w\w)$/)) || (m = op.match(/^if(eq|ne|lt|ge|gt|le)$/))) {
      const b = op.startsWith("if_") ? num() : 0, a = num(), c = m[1]!;
      if ((c === "eq" && a === b) || (c === "ne" && a !== b) || (c === "lt" && a < b) || (c === "ge" && a >= b) || (c === "gt" && a > b) || (c === "le" && a <= b)) jump();
    } else if (op === "fcmpl" || op === "fcmpg") { const b = num(), a = num(); st.push(a > b ? 1 : a < b ? -1 : 0); }
    else if (op === "checkcast") { /* bỏ qua */ }
    else if (op === "new") st.push({ kind: "obj", cls: comment.replace(/^class /, "") });
    else if (op === "getstatic") {
      if (comment.includes("CubeDeformation.NONE")) st.push({ kind: "deform", g: 0 });
      else if (comment.includes("PartPose.ZERO")) st.push({ ...ZERO });
      else st.push({ kind: "obj", cls: comment });
    } else if (op === "areturn" || op === "ireturn" || op === "freturn") return pop();
    else if (op === "return") return null;
    else if (op === "invokedynamic") {
      // ghép chuỗi (tên phần đánh số, vd. tentacle + i): giữ phần số, đặt tiền tố "n"
      const d = comment.match(/:\(([^)]*)\)/)?.[1] ?? "", n = (d.match(/\[*(?:L[^;]+;|[ZBCSIFJD])/g) ?? []).length;
      const parts: Val[] = [];
      for (let j = 0; j < n; j++) parts.unshift(pop());
      st.push("n" + parts.join("_"));
    } else if (op.startsWith("invoke")) {
      const mm = comment.match(/Method (?:([\w/$]+)\.)?([\w<>$"]+):\(([^)]*)\)(.*)$/);
      if (!mm) throw new Error(`không đọc được lệnh gọi: ${op} ${comment}`);
      const owner = (mm[1] ?? cls.replaceAll(".", "/")).replaceAll("/", "."), name2 = mm[2]!.replaceAll("\"", ""), desc = mm[3]!;
      const argTypes = desc.match(/\[*(?:L[^;]+;|[ZBCSIFJD])/g) ?? [];
      const a: Val[] = argTypes.map(() => null);
      for (let j = argTypes.length - 1; j >= 0; j--) a[j] = pop();
      const self = op === "invokestatic" ? null : pop();
      const short = owner.split(".").pop()!;
      const r = call(short, owner, name2, self, a, argTypes);
      if (r !== undefined) {
        if (name2 === "<init>") { if (self && typeof self === "object" && "kind" in self && self.kind === "obj") Object.assign(self, r); }
        else st.push(r);
      } else if (!mm[4]!.startsWith("V")) throw new Error(`chưa hỗ trợ ${owner}.${name2}(${desc})`);
    } else throw new Error(`chưa hỗ trợ lệnh ${op} ${arg} // ${comment}`);
  }
  return null;
}

function call(short: string, owner: string, name: string, self: Val, a: Val[], types: string[]): Val | undefined {
  const s = self as never as Record<string, unknown>;
  if (short === "MeshDefinition" && name === "<init>") return { kind: "mesh", root: newPart("root") } as Val;
  if (short === "MeshDefinition" && name === "getRoot") return (self as { root: Part }).root;
  if (short === "CubeDeformation" && name === "<init>") return { kind: "deform", g: a[0] as number };
  if (short === "CubeDeformation" && name === "extend") return { kind: "deform", g: (s.g as number) + (a[0] as number) };
  if (short === "CubeListBuilder" && (name === "create" || name === "<init>")) return { kind: "builder", cubes: [], u: 0, v: 0, mirror: false }; // (8a) new CubeListBuilder()
  if (short === "CubeListBuilder") {
    const b = self as Builder;
    if (name === "texOffs") { b.u = a[0] as number; b.v = a[1] as number; return b; }
    if (name === "mirror") { b.mirror = a.length ? !!a[0] : true; return b; }
    if (name === "addBox") {
      const nums = a.filter((x) => typeof x === "number") as number[];
      const off = typeof a[0] === "string" ? 0 : 0;
      const deform = a.find((x) => x && typeof x === "object" && "kind" in x && x.kind === "deform") as { g: number } | undefined;
      const mirror = types.includes("Z") ? !!a[types.indexOf("Z")] : b.mirror;
      const box = nums.slice(off, off + 6);
      b.cubes.push({ uv: [b.u, b.v], box, inflate: deform?.g ?? 0, mirror });
      return b;
    }
  }
  if (short === "PartPose") {
    const n = a as number[];
    if (name === "offset") return { ...ZERO, x: n[0]!, y: n[1]!, z: n[2]! };
    if (name === "rotation") return { ...ZERO, rx: n[0]!, ry: n[1]!, rz: n[2]! };
    if (name === "offsetAndRotation") return { x: n[0]!, y: n[1]!, z: n[2]!, rx: n[3]!, ry: n[4]!, rz: n[5]! };
  }
  if (short === "PartDefinition") {
    const p = self as Part;
    if (name === "addOrReplaceChild") {
      const c = newPart(a[0] as string), b = a[1] as Builder;
      c.cubes = b?.cubes ?? [];
      c.pose = (a[2] as Pose) ?? { ...ZERO };
      p.children.set(c.name, c);
      return c;
    }
    if (name === "getChild") return p.children.get(a[0] as string) ?? newPart(a[0] as string);
    if (name === "clearChild" || name === "clearRecursively") { p.children.delete(a[0] as string); return p; }
  }
  if (short === "LayerDefinition" && name === "create") return { kind: "layer", mesh: a[0] as { root: Part }, w: a[1] as number, h: a[2] as number };
  if (owner === "java.lang.Math" && typeof (Math as unknown as Record<string, unknown>)[name] === "function")
    return (Math as unknown as Record<string, (...x: number[]) => number>)[name]!(...(a as number[]));
  if (owner === "net.minecraft.util.Mth" && name === "cos") return Math.cos(a[0] as number);
  if (owner === "net.minecraft.util.Mth" && name === "sin") return Math.sin(a[0] as number);
  if (short === "MeshTransformer" && name === "scaling") return { kind: "obj", cls: "scale:" + a[0] } as Val;
  if (short === "LayerDefinition" && name === "apply") {
    const sc = (a[0] as { cls?: string })?.cls?.startsWith("scale:") ? Number((a[0] as { cls: string }).cls.slice(6)) : 1;
    return { ...(self as object), scale: ((self as { scale?: number }).scale ?? 1) * sc } as never;
  }
  // hàm dựng của lớp cha / lớp model khác (không phải lớp dựng geom.*)
  if (owner.startsWith("net.minecraft.client.model") && !owner.startsWith("net.minecraft.client.model.geom") && name !== "<init>")
    return run(owner, name, a, types.length);
  if (name === "<init>") return {} as Val;
  return undefined;
}

export interface DumpPart { name: string; parent: string | null; pose: Pose; cubes: Cube[] }

/** Hình học model: cỡ ảnh (nếu hàm trả LayerDefinition) + danh sách phần (phần cha trước phần con). */
export function dumpModel(cls: string, fn = "createBodyLayer", withDeform: boolean | number = false, post?: string): { tex: [number, number] | null; scale: number; parts: DumpPart[] } {
  // withDeform: true = tham số CubeDeformation; số = tham số float (7d: tỉ lệ lừa / la)
  const args: Val[] = typeof withDeform === "number" ? [withDeform] : withDeform ? [{ kind: "deform", g: 0 }] : [];
  const res = run(cls, fn, args, args.length) as {
    mesh?: { root: Part }; root?: Part; w?: number; h?: number; scale?: number;
  };
  const root = res.mesh?.root ?? res.root!, flat: DumpPart[] = [];
  if (post) run(cls, post, [root], 1); // (7d) hàm sửa lưới gọi qua lambda (DonkeyModel.modifyMesh: rương, tai)
  const walk = (p: Part, parent: string | null): void => {
    for (const c of p.children.values()) {
      flat.push({ name: c.name, parent, pose: c.pose, cubes: c.cubes });
      walk(c, c.name);
    }
  };
  walk(root, null);
  return { tex: res.w ? [res.w, res.h!] : null, scale: res.scale ?? 1, parts: flat };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/mc-model-dump.ts")) {
  const [cls, fn = "createBodyLayer", deform] = process.argv.slice(2);
  console.log(JSON.stringify(dumpModel(cls!, fn, deform === "deform")));
}
