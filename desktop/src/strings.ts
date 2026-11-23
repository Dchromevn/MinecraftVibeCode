// Chữ hiển thị của app desktop (vỏ Electron). Chữ trong game nằm ở client/src/strings.ts.
export const S = {
  title: "Voxel Survival",
  starting: "Đang khởi động thế giới…",
  saving: "Đang lưu thế giới…",
  opening: "Đang mở thế giới…",
  failTitle: "Không khởi động được server",
  failBody: (err: string, log: string): string => `${err}\n\nNhật ký server: ${log}`,
  crashTitle: "Server đã dừng đột ngột",
  crashBody: (code: number | null, log: string): string => `Mã thoát: ${code ?? "?"}\n\nNhật ký server: ${log}`,
};

/** Trang chờ đơn giản (data URL) khi server đang khởi động / đang lưu. */
export function waitPage(text: string): string {
  const html = `<!doctype html><meta charset="utf-8"><title>${S.title}</title>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#1b1b1b;
color:#ddd;font:20px system-ui,sans-serif">${text}</body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
