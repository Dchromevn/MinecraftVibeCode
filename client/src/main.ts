// Giai đoạn 0: cảnh Three.js với một khối lập phương xoay.
import * as THREE from "three";
import { STR } from "./strings.js";
import { connect, type NetStatus } from "./net.js";

const hud = document.getElementById("hud") as HTMLDivElement;
let netStatus: NetStatus = "connecting";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x55aa33, flatShading: true }),
);
scene.add(cube);

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(3, 5, 2);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

connect((s) => {
  netStatus = s;
});

function statusText(s: NetStatus): string {
  if (s === "connected") return STR.serverConnected;
  if (s === "disconnected") return STR.serverDisconnected;
  return STR.serverConnecting;
}

let last = performance.now();
let frames = 0;

function frame(now: number): void {
  frames++;
  if (now - last >= 1000) {
    hud.textContent = `${STR.title} — ${STR.stage0}\nFPS: ${frames}\n${statusText(netStatus)}`;
    frames = 0;
    last = now;
  }
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.015;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
