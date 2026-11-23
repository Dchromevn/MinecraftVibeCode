// Nền menu mở đầu: ảnh thế giới chụp lúc đang chơi (ban ngày, ở thế giới thường, không ở dưới nước), làm mờ sẵn rồi lưu
// localStorage; lần mở sau dùng làm nền. Chưa có ảnh: nền trời. Mỗi phiên chơi chụp lại một lần (nền đổi theo chỗ vừa chơi).
const KEY = "voxel.menuBg";
const SHOT_AFTER_MS = 20_000; // chờ chunk quanh người chơi hiện đủ
const SHOT_W = 960;
const BLUR_PX = 4;

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Đặt nền cho khung menu (#join). */
export function applyMenuBackground(el: HTMLElement): void {
  const img = stored();
  el.style.background = img
    ? `#1d2a3a url("${img}") center / cover no-repeat`
    : "linear-gradient(#6f9fe8, #b9d4f7 70%, #d9e8fb)";
}

/** Chụp nền một lần mỗi phiên: gọi ngay sau renderer.render(cảnh) trong vòng vẽ (bộ đệm vẽ còn nguyên). */
export class MenuShot {
  private readonly start = performance.now();
  private done = false;

  tick(now: number, canvas: HTMLCanvasElement, ok: boolean): void {
    if (this.done || !ok || now - this.start < SHOT_AFTER_MS) return;
    this.done = true;
    const h = Math.round((SHOT_W * canvas.height) / Math.max(1, canvas.width));
    const c = document.createElement("canvas");
    c.width = SHOT_W;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.filter = `blur(${BLUR_PX}px)`;
    ctx.drawImage(canvas, -BLUR_PX * 2, -BLUR_PX * 2, SHOT_W + BLUR_PX * 4, h + BLUR_PX * 4); // tràn mép: không viền mờ trắng
    try {
      localStorage.setItem(KEY, c.toDataURL("image/jpeg", 0.75));
    } catch {
      // đầy bộ nhớ / bị chặn: giữ ảnh cũ
    }
  }
}

// ---- logo: chữ khối pixel (5×7) tô bằng texture đá ----
const FONT: Record<string, string[]> = {
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

/** Vẽ logo vào canvas (cell = cỡ một ô pixel của chữ). Ảnh đá chưa tải được thì tô xám. */
export function drawLogo(text: string, cell: number, stone: HTMLImageElement | null): HTMLCanvasElement {
  const glyphs = [...text.toUpperCase()].map((ch) => FONT[ch] ?? FONT[" "]!);
  const cols = glyphs.reduce((n, g) => n + g[0]!.length + 1, -1);
  const depth = Math.max(2, Math.round(cell * 0.45)); // độ dày mặt cạnh (nhìn nổi khối)
  const c = document.createElement("canvas");
  c.width = cols * cell + depth;
  c.height = 7 * cell + depth;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const cells: [number, number][] = [];
  let x0 = 0;
  for (const g of glyphs) {
    g.forEach((row, y) => [...row].forEach((b, x) => b === "1" && cells.push([x0 + x, y])));
    x0 += g[0]!.length + 1;
  }
  // mặt cạnh tối phía sau, rồi mặt trước tô đá + viền sáng / tối
  ctx.fillStyle = "#2b2b2b";
  for (const [x, y] of cells) ctx.fillRect(x * cell + depth, y * cell + depth, cell, cell);
  ctx.fillStyle = "#3a3a3a";
  for (const [x, y] of cells) for (let d = 1; d < depth; d++) ctx.fillRect(x * cell + d, y * cell + d, cell, cell);
  for (const [x, y] of cells) {
    const px = x * cell, py = y * cell;
    if (stone?.complete && stone.naturalWidth) {
      const sx = (x * 5) % stone.naturalWidth, sy = (y * 5) % stone.naturalHeight; // mỗi ô lấy một mảng đá khác nhau
      ctx.drawImage(stone, sx, sy, Math.min(8, stone.naturalWidth - sx), Math.min(8, stone.naturalHeight - sy), px, py, cell, cell);
    } else {
      ctx.fillStyle = "#8a8a8a";
      ctx.fillRect(px, py, cell, cell);
    }
    ctx.fillStyle = "#ffffff30";
    ctx.fillRect(px, py, cell, Math.max(1, cell / 8));
    ctx.fillStyle = "#00000040";
    ctx.fillRect(px, py + cell - Math.max(1, cell / 8), cell, Math.max(1, cell / 8));
  }
  return c;
}

/** Tải ảnh đá cho logo (null nếu không có). */
export function loadStone(): Promise<HTMLImageElement | null> {
  return new Promise((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = "/textures/stone.png";
  });
}
