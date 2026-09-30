/**
 * Light shafts.
 *
 * Real volumetric lighting means ray-marching a participating medium, which is
 * far too expensive for a hero banner. This fakes it convincingly: a few large
 * additive quads, soft on every edge, drifting slowly and fading as they turn
 * away from the camera. Because they are additive and unlit they cost almost
 * nothing, and because they intersect the draped form they read as depth.
 */

import { SIMPLEX } from "./glsl";

export const shaftVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const shaftFragmentShader = /* glsl */ `
uniform vec3  uColor;
uniform float uTime;
uniform float uIntensity;
uniform float uSeed;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;

${SIMPLEX}

void main() {
  // Soft on all four edges so the quad never shows its own silhouette.
  float edgeX = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x);
  float edgeY = smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.82, vUv.y);

  // Dust turbulence travelling along the shaft.
  float n = snoise(vec3(vUv * vec2(3.0, 1.4), uTime * 0.07 + uSeed)) * 0.5 + 0.5;

  // A shaft seen edge-on should disappear; seen face-on it should bloom.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float facing = abs(dot(normalize(vNormalW), V));

  float a = edgeX * edgeY * mix(0.45, 1.0, n) * facing * uIntensity;

  gl_FragColor = vec4(uColor * a, a);
}
`;
