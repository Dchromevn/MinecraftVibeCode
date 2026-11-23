// Địa chỉ của máy này để bạn bè vào server ("Tạo server"): IPv4 của các card mạng (Wi-Fi, LAN, VPN ảo như Radmin / Tailscale).
import { networkInterfaces } from "node:os";

/** Mạng gia đình (192.168 / 10 / 172.16–31) xếp trước, rồi tới địa chỉ khác (VPN ảo). */
function rank(ip: string): number {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 1;
  return 2;
}

export function lanAddresses(port: number): string[] {
  const ips: string[] = [];
  for (const list of Object.values(networkInterfaces()))
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")) ips.push(a.address);
  return [...new Set(ips)].sort((a, b) => rank(a) - rank(b)).map((ip) => `${ip}:${port}`);
}
