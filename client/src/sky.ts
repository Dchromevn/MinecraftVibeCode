// Bầu trời gradient (mái vòm theo camera) và sương mù cùng màu chân trời.
import * as THREE from "three";

export const SKY_ZENITH = new THREE.Color(0x3d7ddc);
export const SKY_HORIZON = new THREE.Color(0xbfe0ff);

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  varying vec3 vDir;
  void main() {
    float t = clamp(normalize(vDir).y, 0.0, 1.0);
    vec3 c = mix(horizon, zenith, pow(t, 0.55));
    gl_FragColor = vec4(c, 1.0);
  }
`;

export interface Sky {
  mesh: THREE.Mesh;
  /** Gọi mỗi khung để mái vòm đi theo camera. */
  follow(camera: THREE.Camera): void;
}

export function createSky(radius: number): Sky {
  const geo = new THREE.SphereGeometry(radius, 24, 12);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: SKY_ZENITH },
      horizon: { value: SKY_HORIZON },
    },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    follow(camera) {
      mesh.position.copy(camera.position);
    },
  };
}

export function createFog(viewDistance: number): THREE.Fog {
  return new THREE.Fog(SKY_HORIZON, viewDistance * 0.6, viewDistance);
}
