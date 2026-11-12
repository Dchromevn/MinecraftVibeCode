// Chụp màn hình game tự động bằng trình duyệt không giao diện (Edge / Chrome qua DevTools Protocol):
// tự chạy Vite ở cổng 5174, mở từng trang, chờ, chạy đoạn JS (eval), chụp ảnh, in HUD và lỗi console.
//   node tools/screenshot.mjs <jobs.json>
// Cần server đang chạy (Vite chuyển /ws sang server). Dùng server riêng để không vào thế giới đang chơi:
//   PORT=8090 npx tsx server/src/index.ts           (cửa sổ khác)
//   WS_TARGET=ws://localhost:8090 node tools/screenshot.mjs jobs.json
// jobs.json: [{ "url": "http://localhost:5174/?name=An&debug=1&nomsg=1", "out": "a.png", "wait": 15000,
//              "eval": "...JS trả về giá trị...", "waitAfterEval": 3000,
//              "steps": [{ "eval": "...", "wait": 1000, "out": "b.png" }] }]
// Trong trang có window.__game khi URL có ?debug=1 (camera, world, session, interact, net, give...).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jobs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const browserExe = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => existsSync(p));
if (!browserExe) throw new Error("Không tìm thấy Edge / Chrome");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CDP_PORT = 9333, VITE_PORT = 5174;

const vite = spawn("npx", ["vite", "--port", String(VITE_PORT), "--strictPort"], { cwd: join(root, "client"), shell: true, stdio: "ignore" });
const browser = spawn(browserExe, [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu-sandbox",
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  `--remote-debugging-port=${CDP_PORT}`, "--window-size=1280,720",
  `--user-data-dir=${process.env.TEMP ?? "/tmp"}/voxel-cdp-${Date.now()}`, "about:blank",
], { stdio: "ignore" });

try {
  for (let i = 0, up = false; i < 80 && !up; i++) {
    await wait(300);
    up = await fetch(`http://localhost:${VITE_PORT}/`).then((r) => r.ok).catch(() => false);
  }
  let targets = null;
  for (let i = 0; i < 50 && !targets; i++) {
    await wait(200);
    targets = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((r) => r.json()).catch(() => null);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let nextId = 1;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result ?? msg.error);
      pending.delete(msg.id);
    }
    if (msg.method === "Runtime.consoleAPICalled" && (msg.params.type === "error" || msg.params.type === "warning"))
      logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      logs.push(`exception: ${d.exception?.description ?? d.text} @ ${d.url ?? "?"}:${d.lineNumber}`);
    }
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      const id = nextId++;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return JSON.stringify(r.result?.value ?? r);
  };
  const shoot = async (out) => {
    const s = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(out, Buffer.from(s.data, "base64"));
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  for (const job of jobs) {
    logs.length = 0;
    await send("Page.navigate", { url: job.url.replace(":5173", `:${VITE_PORT}`) });
    await wait(job.wait ?? 8000);
    if (job.eval) {
      console.log("eval:", await evaluate(job.eval));
      await wait(job.waitAfterEval ?? 3000);
    }
    await shoot(job.out);
    const hud = await send("Runtime.evaluate", { expression: "document.getElementById('hud')?.textContent", returnByValue: true });
    console.log(`--- ${job.out}\n${hud.result?.value ?? ""}`);
    // nhiều bước trên cùng một trang: mỗi bước eval → chờ → chụp
    for (const step of job.steps ?? []) {
      if (step.eval) console.log("step eval:", await evaluate(step.eval));
      await wait(step.wait ?? 3000);
      if (step.out) {
        await shoot(step.out);
        console.log("step shot:", step.out);
      }
    }
    if (logs.length) console.log(`CONSOLE:\n${logs.slice(0, 8).join("\n")}`);
  }
  ws.close();
} finally {
  for (const p of [browser, vite]) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
    else p.kill();
  }
}
