// Cầu nối trang game ↔ app desktop (Electron, chạy trong sandbox nên viết CommonJS thuần, không qua tsc).
// Trang game thấy window.voxelDesktop thì hiện màn hình mở đầu của app (client/src/net/startScreen.ts). App xử lý: gameHost.ts.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voxelDesktop", {
  /** { ownerToken, port, world } */
  info: () => ipcRenderer.invoke("voxel:info"),
  /** Mở / đóng cho máy khác vào; trả về các địa chỉ "IP:cổng" bạn bè dùng được (rỗng khi đóng). */
  setLan: (open) => ipcRenderer.invoke("voxel:lan", { open: open === true }),
  /** Danh sách thế giới: kind = "solo" | "server". */
  worlds: (kind) => ipcRenderer.invoke("voxel:worlds", { kind }),
  createWorld: (kind, name, seed) => ipcRenderer.invoke("voxel:createWorld", { kind, name, seed }),
  deleteWorld: (id) => ipcRenderer.invoke("voxel:deleteWorld", { id }),
  /** Chơi thế giới id (lan = mở cho bạn bè). { reload: true } = app đổi thế giới và tải lại trang. */
  play: (id, lan) => ipcRenderer.invoke("voxel:play", { id, lan: lan === true }),
});
