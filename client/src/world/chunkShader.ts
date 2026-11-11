// Shader cho mesh chunk: ánh sáng theo đỉnh (trời × độ sáng ban ngày, block ngả vàng),
// nhìn đêm debug, gợn sóng cho nước. Đổi độ sáng chỉ cần đổi uniform, không dựng lại mesh.
import * as THREE from "three";

export interface ChunkUniforms {
  uTime: { value: number };
  uDaylight: { value: number }; // 1 = ban ngày (Giai đoạn 7 mới chạy đồng hồ ngày đêm)
  uMinLight: { value: number }; // nhìn đêm debug (0 = tắt)
}

export const WATER_FX = {
  WAVE_HEIGHT: 0.035, // block
  WAVE_FREQ: 0.9,
  WAVE_SPEED: 1.6,
} as const;

const LIGHT_GLSL = `
uniform float uDaylight;
uniform float uMinLight;
varying vec2 vLight;
float lightCurve(float f) {
  f = clamp(f, 0.0, 1.0);
  return max(0.004, pow(f / (3.0 - 2.0 * f), 1.6));
}`;

export function applyChunkShader(mat: THREE.MeshBasicMaterial, u: ChunkUniforms, waves: boolean): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.uniforms.uDaylight = u.uDaylight;
    shader.uniforms.uMinLight = u.uMinLight;
    let vs = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aLight;\nvarying vec2 vLight;\nuniform float uTime;")
      .replace("#include <color_vertex>", "#include <color_vertex>\nvLight = aLight;");
    if (waves) {
      const f = WATER_FX.WAVE_FREQ, s = WATER_FX.WAVE_SPEED, h = WATER_FX.WAVE_HEIGHT;
      vs = vs.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        if (fract(position.y) > 0.5) {
          transformed.y += (sin(wPos.x * ${f.toFixed(3)} + uTime * ${s.toFixed(3)})
            + sin(wPos.z * ${(f * 0.8).toFixed(3)} + uTime * ${(s * 0.75).toFixed(3)})) * ${h.toFixed(3)};
        }`,
      );
    }
    shader.vertexShader = vs;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + LIGHT_GLSL)
      .replace(
        "#include <color_fragment>",
        `diffuseColor.rgb *= vColor.rgb;
        vec3 L = max(vec3(lightCurve(vLight.x) * uDaylight), lightCurve(vLight.y) * vec3(1.0, 0.86, 0.66));
        diffuseColor.rgb *= max(L, vec3(uMinLight));`,
      );
  };
}
