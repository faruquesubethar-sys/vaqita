import { SIMPLEX } from "./glsl";

/**
 * Shader for the hero backdrop cloth.
 *
 * The surface is a dense plane displaced in the vertex stage by layered
 * simplex noise, which reads as heavy fabric settling rather than a wave — the
 * octaves are weighted so one slow, large fold dominates and the finer ones
 * only break up the silhouette.
 *
 * Lighting is done analytically in the fragment stage instead of with scene
 * lights: a single key direction, a fresnel rim in brass, and a cheap sheen
 * term that mimics the way worsted wool catches light at grazing angles.
 */

export const clothVertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform vec2  uPointer;
uniform float uPointerStrength;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vFold;

${SIMPLEX}

/**
 * Height of the cloth at a point. Three octaves: one slow dominant fold, one
 * mid ripple travelling across it, one fine grain to catch the specular.
 */
float clothHeight(vec2 p, float t) {
  float h  = snoise(vec3(p * uFrequency,         t * 0.10)) * 1.00;
  h       += snoise(vec3(p * uFrequency * 2.30,  t * 0.16)) * 0.38;
  h       += snoise(vec3(p * uFrequency * 5.10,  t * 0.22)) * 0.13;

  // The cursor lifts the cloth locally, as though drawn up by a hand. Falls
  // off with distance so the disturbance stays soft-edged.
  float d = distance(p, uPointer * 2.6);
  h += exp(-d * d * 0.85) * uPointerStrength;

  return h * uAmplitude;
}

void main() {
  vUv = uv;

  vec3 pos = position;
  float h = clothHeight(pos.xy, uTime);
  pos.z += h;

  // Normals by central difference. Cheaper and steadier than deriving them in
  // the fragment stage, which produces faceting on a displaced plane.
  float e = 0.06;
  float hx = clothHeight(pos.xy + vec2(e, 0.0), uTime);
  float hy = clothHeight(pos.xy + vec2(0.0, e), uTime);
  vec3 tangentX = normalize(vec3(e, 0.0, hx - h));
  vec3 tangentY = normalize(vec3(0.0, e, hy - h));
  vNormal = normalize(cross(tangentX, tangentY));

  // Steepness drives where the weave darkens in the fragment stage.
  vFold = clamp(length(vec2(hx - h, hy - h)) / e, 0.0, 1.0);

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const clothFragmentShader = /* glsl */ `
uniform vec3  uColorDeep;
uniform vec3  uColorBase;
uniform vec3  uColorSheen;
uniform vec3  uAccent;
uniform float uTime;
uniform float uOpacity;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vFold;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(vec3(-0.55, 0.85, 0.62));

  float lambert = clamp(dot(N, L), 0.0, 1.0);

  // Wool has almost no mirror highlight; the light it returns is broad and
  // low. A high exponent here would make it read as satin or plastic.
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 18.0) * 0.30;

  // Grazing-angle sheen — the single cue that sells this as cloth.
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.2);

  vec3 color = mix(uColorDeep, uColorBase, lambert);
  color = mix(color, uColorSheen, fresnel * 0.55);
  color += uAccent * fresnel * 0.42;
  color += vec3(spec);

  // Creases sit darker, as they do in real drape.
  color *= 1.0 - vFold * 0.22;

  // Vignette toward the edges so the plane dissolves instead of ending.
  float edge = smoothstep(0.0, 0.34, vUv.x) * smoothstep(1.0, 0.66, vUv.x)
             * smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.70, vUv.y);

  // Dither. Without it, a dark gradient this wide bands visibly on 8-bit
  // displays — the single most common tell of a cheap-looking WebGL hero.
  float grain = fract(sin(dot(vUv * uTime * 0.05, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(color, uOpacity * edge);
}
`;
