// Chạy thử app desktop từ desktop/stage/app (npm run desktop). Bỏ biến ELECTRON_RUN_AS_NODE mà VS Code / một số
// công cụ đặt sẵn — còn biến này thì electron.exe chạy như Node thường, không mở cửa sổ.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const electron = createRequire(import.meta.url)("electron") as string; // gói electron trả về đường dẫn electron.exe
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [join(root, "desktop", "stage", "app")], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
