/**
 * Shader for the hero's draped form — the standing column of cloth.
 *
 * The geometry is an open-ended cone. Every vertex is pushed out along its
 * radial axis by layered noise whose vertical frequency is deliberately much
 * lower than its angular frequency, so the folds run *down* the form the way
 * hanging cloth actually falls, rather than pooling into blobs.
 *
 * Normals are recomputed analytically from two neighbouring displaced points
 * (one step around the axis, one step up it). Without that the form shades
 * like a smooth cone and the folds become invisible — the displacement would
 * be there in silhouette and nowhere in the lighting.
 */

import { SIMPLEX } from "./glsl";

export const drapeVertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmplitude;
uniform vec2  uPointer;
uniform float uSwell;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying vec3  vObjPos;
varying float vFold;
varying float vHeight;

${SIMPLEX}

vec3 radialAxis(vec3 p) {
  vec2 r = p.xz;
  float len = max(length(r), 0.0001);
  return vec3(r.x / len, 0.0, r.y / len);
}

vec3 rotateY(vec3 p, float a) {
  float s = sin(a), c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

/** Radial offset of the cloth surface at an undisplaced point. */
float drapeAmount(vec3 p, float t) {
  // Angular frequency high, vertical frequency low — this ratio is what makes
  // it read as drape instead of noise.
  float f  = snoise(vec3(p.x * 2.30, p.y * 0.42, p.z * 2.30 + t * 0.09)) * 1.00;
  f       += snoise(vec3(p.x * 5.10, p.y * 0.95, p.z * 5.10 - t * 0.13)) * 0.34;
  f       += snoise(vec3(p.x * 11.0, p.y * 1.90, p.z * 11.0 + t * 0.18)) * 0.11;

  // Cloth is pinned at the shoulder and free at the hem, so folds open out as
  // they descend. p.y runs roughly -1..1 over the form.
  float hem = smoothstep(-1.0, 0.85, p.y);
  f *= mix(1.35, 0.30, hem);

  // The cursor pushes the near side of the cloth, like a draught.
  vec3 dir = normalize(vec3(uPointer.x, uPointer.y * 0.45, 1.0));
  float facing = max(dot(radialAxis(p), dir), 0.0);
  f += pow(facing, 3.0) * uSwell;

  return f * uAmplitude;
}

vec3 displace(vec3 p, float t) {
  return p + radialAxis(p) * drapeAmount(p, t);
}

void main() {
  vObjPos = position;
  vHeight = position.y;

  vec3 P = displace(position, uTime);

  // Neighbours: one small rotation around the axis, one small step upward.
  float da = 0.035;
  float dy = 0.045;
  vec3 pA = rotateY(position, da);
  vec3 pB = position + vec3(0.0, dy, 0.0);

  vec3 A = displace(pA, uTime);
  vec3 B = displace(pB, uTime);

  vec3 tangentA = A - P;
  vec3 tangentB = B - P;
  vec3 n = normalize(cross(tangentB, tangentA));

  // Keep normals pointing outward; the cross product's sign flips around the
  // seam otherwise and the form develops a visible black stripe.
  if (dot(n, radialAxis(position)) < 0.0) n = -n;

  // World space, NOT normalMatrix — that transforms to view space, and the
  // fragment stage lights with world-space camera and light vectors. Mixing
  // the two leaves the form unlit from every angle.
  vNormal = normalize(mat3(modelMatrix) * n);

  // How far this point deviates from the mean radius — drives crease shading.
  vFold = clamp(abs(drapeAmount(position, uTime)) / max(uAmplitude, 0.0001), 0.0, 1.0);

  vec4 world = modelMatrix * vec4(P, 1.0);
  vWorldPos = world.xyz;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const drapeFragmentShader = /* glsl */ `
uniform vec3  uColorDeep;
uniform vec3  uColorBase;
uniform vec3  uAccent;
uniform vec3  uKeyDir;
uniform float uTime;
uniform float uExposure;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying vec3  vObjPos;
varying float vFold;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uKeyDir);

  // Single hard key from one side. A second fill light would flatten the form,
  // and the drama here is entirely in how deep the unlit side goes.
  float key = max(dot(N, L), 0.0);

  // A weak bounce from below keeps the shadow side from going pure black.
  float bounce = max(dot(N, vec3(0.0, -1.0, 0.35)), 0.0) * 0.16;

  // Broad, low specular — worsted wool, not satin.
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 22.0) * 0.32;

  // Grazing-angle sheen. This is the cue that sells it as cloth.
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

  vec3 color = mix(uColorDeep, uColorBase, key);
  color += bounce * uColorBase;
  color += uAccent * fresnel * 0.85;
  color += vec3(spec) * mix(0.5, 1.0, key);

  // Creases sit darker; the deepest folds read almost black.
  color *= 1.0 - vFold * 0.30;

  // The cloth dissolves into shadow at both ends rather than stopping on the
  // cylinder's open rims — without this the form reads as a cut-off tube.
  float hemFade = smoothstep(-1.15, -0.30, vHeight);
  float shoulderFade = 1.0 - smoothstep(0.20, 1.02, vHeight);
  color *= mix(0.14, 1.0, hemFade) * mix(0.05, 1.0, shoulderFade);

  float grain = fract(sin(dot(vObjPos.xy * (1.0 + uTime * 0.02), vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * 0.015;

  gl_FragColor = vec4(color * uExposure, 1.0);
}
`;
