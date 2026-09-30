/**
 * Cotton jersey shading for the try-on garments.
 *
 * The three things that separate cloth from plastic, in order of how much they
 * matter:
 *
 *  1. **Wrap-around diffuse.** Cotton scatters light under its surface, so the
 *     terminator between lit and unlit is soft and creeps past 90°. A plain
 *     Lambert term gives the hard terminator that makes render-shop t-shirts
 *     look like vinyl.
 *  2. **Weave.** A visible micro-grid, scaled so it is felt rather than seen,
 *     modulating both colour and normal.
 *  3. **Sheen, not specular.** Fabric returns a broad grazing-angle glow with
 *     no mirror highlight at all.
 */

export const fabricVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vSide;

void main() {
  vUv = uv;
  // The mesh is two sheets. The front one's object-space normal points at +Z,
  // the back one at -Z, which is how the fragment stage knows where a screen
  // print belongs — a print on the back of a tee would be wrong.
  vSide = normal.z;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const fabricFragmentShader = /* glsl */ `
uniform vec3  uColor;
uniform vec3  uSheen;
uniform vec3  uKeyDir;
uniform vec3  uRimColor;
uniform float uTime;
uniform float uWeaveScale;
uniform float uRoughness;

// Photograph projected onto the garment's front face.
uniform sampler2D uTexture;
uniform sampler2D uTextureBack;
uniform int       uHasBack;
uniform int       uHasTexture;
uniform vec4      uTextureRect; // x, y, w, h of the garment inside UV space
// 1 when the mesh was traced from this very photograph, so UV is already the
// identity onto it and no fitting or background guessing is needed.
uniform int       uPhotoFit;
// The cloth colour behind the camera-facing photograph. Equal to uColor unless
// the mesh was traced, in which case it is read out of the photograph itself.
uniform vec3      uBackColor;

// Chest print
uniform int   uPrintStyle;   // 0 none, 1 block, 2 arch, 3 stamp, 4 swan
uniform vec3  uPrintColor;
uniform vec4  uPrintRect;    // cx, cy, halfW, halfH in UV space
uniform float uPrintSeed;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vSide;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

/** Interlocking knit loops. Two offset sine grids read as jersey, not canvas. */
float weave(vec2 uv) {
  vec2 p = uv * uWeaveScale;
  float warp = sin(p.x * 6.2831853);
  float weft = sin(p.y * 6.2831853 + warp * 0.6);
  return (warp * 0.5 + weft * 0.5) * 0.5 + 0.5;
}

float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }

/**
 * Negative inside a counter-clockwise triangle.
 *
 * Not a true distance — the magnitude scales with edge length — but it is
 * signed and continuous, which is all a soft-edged mask needs.
 */
float tri(vec2 p, vec2 a, vec2 b, vec2 c) {
  float e0 = cross2(b - a, p - a);
  float e1 = cross2(c - b, p - b);
  float e2 = cross2(a - c, p - c);
  return -min(min(e0, e1), e2);
}

/**
 * The house mark, as nine triangles.
 *
 * Traced from the logo's own facets rather than approximated with distance
 * primitives: an origami swan is flat planes, so polygons are both the honest
 * representation and the cheap one.
 */
float swanMask(vec2 q) {
  // Body — fanned from the single reflex vertex, which is the one fan that
  // stays counter-clockwise for every triangle.
  vec2 F = vec2(-0.05, -0.28);
  vec2 A = vec2(-0.29, -0.50);
  vec2 B = vec2( 0.25, -0.77);
  vec2 C = vec2( 0.81, -0.54);
  vec2 D = vec2( 1.07, -0.18);
  vec2 E = vec2( 0.85,  0.68);

  float d = tri(q, F, A, B);
  d = min(d, tri(q, F, B, C));
  d = min(d, tri(q, F, C, D));
  d = min(d, tri(q, F, D, E));

  // Neck
  vec2 n1 = vec2(-0.34, -0.22);
  vec2 n2 = vec2(-0.06, -0.26);
  vec2 n3 = vec2( 0.00,  0.24);
  vec2 n4 = vec2(-0.30,  0.28);
  d = min(d, tri(q, n1, n2, n3));
  d = min(d, tri(q, n1, n3, n4));

  // Head
  vec2 h1 = vec2(-0.70, 0.18);
  vec2 h2 = vec2(-0.24, 0.24);
  vec2 h3 = vec2(-0.30, 0.58);
  vec2 h4 = vec2(-0.72, 0.42);
  d = min(d, tri(q, h1, h2, h3));
  d = min(d, tri(q, h1, h3, h4));

  // Beak
  d = min(d, tri(q, vec2(-1.05, 0.02), vec2(-0.68, 0.10), vec2(-0.70, 0.28)));

  return smoothstep(0.014, 0.0, d);
}

/** Rounded-box distance in UV space, for the print shapes. */
float boxDist(vec2 p, vec2 half_, float r) {
  vec2 d = abs(p) - (half_ - r);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

/** Returns print coverage 0..1 at this UV. */
float printMask(vec2 uv) {
  if (uPrintStyle == 0) return 0.0;
  // Front sheet only.
  if (vSide <= 0.0) return 0.0;

  vec2 c = uPrintRect.xy;
  vec2 h = uPrintRect.zw;
  vec2 p = uv - c;

  // Only the front sheet carries the print; the back is left blank.
  float m = 0.0;

  if (uPrintStyle == 1) {
    // BLOCK — two solid bars, like a screen-printed wordmark.
    float bar1 = boxDist(p - vec2(0.0, h.y * 0.30), vec2(h.x, h.y * 0.20), 0.004);
    float bar2 = boxDist(p + vec2(0.0, h.y * 0.22), vec2(h.x * 0.72, h.y * 0.14), 0.004);
    m = max(smoothstep(0.004, 0.0, bar1), smoothstep(0.004, 0.0, bar2));
  } else if (uPrintStyle == 2) {
    // ARCH — collegiate curve. Bend the sample space, then draw a bar.
    vec2 q = p;
    q.y -= (1.0 - q.x * q.x / max(h.x * h.x, 1e-4)) * h.y * 0.34;
    float bar = boxDist(q, vec2(h.x, h.y * 0.17), 0.004);
    m = smoothstep(0.004, 0.0, bar);
  } else if (uPrintStyle == 3) {
    // STAMP — a ring with a bar through it, like a surplus depot mark.
    float ring = abs(length(p / h) - 0.78) - 0.10;
    float bar = boxDist(p, vec2(h.x * 0.86, h.y * 0.12), 0.003);
    m = max(smoothstep(0.03, 0.0, ring), smoothstep(0.004, 0.0, bar));
  } else if (uPrintStyle == 4) {
    m = swanMask(p / h);
  }

  // Screen print on jersey never lands perfectly — break the edge up a little.
  float crack = vnoise(uv * 180.0 + uPrintSeed);
  m *= 0.82 + crack * 0.18;

  return clamp(m, 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uKeyDir);

  float w = weave(vUv);

  // Perturb the normal by the weave gradient so the knit catches light.
  vec2 e = vec2(1.0 / max(uWeaveScale, 1.0) * 0.35, 0.0);
  float wx = weave(vUv + e.xy) - weave(vUv - e.xy);
  float wy = weave(vUv + e.yx) - weave(vUv - e.yx);
  N = normalize(N + vec3(wx, wy, 0.0) * 0.28);

  // Wrap diffuse — the single most important term for cloth.
  float ndl = dot(N, L);
  float wrap = clamp((ndl + 0.55) / 1.55, 0.0, 1.0);
  float diffuse = wrap * wrap;

  // Fill from the opposite side so the shadow half keeps its shape. A product
  // viewer is lit like a studio, not like a single bare bulb.
  vec3 fillDir = normalize(vec3(0.62, 0.15, 0.55));
  float fill = clamp(dot(N, fillDir) * 0.5 + 0.5, 0.0, 1.0) * 0.34;

  // Overhead wash, which is what stops a dark colourway reading as a hole.
  float top = clamp(N.y * 0.5 + 0.5, 0.0, 1.0) * 0.22;

  // Ambient sky/ground split. Kept low: this term is multiplied by the base
  // colour, and anything higher lifts a dark colourway toward grey once the
  // renderer converts linear output to sRGB.
  float sky = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 ambient = mix(vec3(0.10, 0.10, 0.12), vec3(0.30, 0.30, 0.33), sky);

  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);

  vec3 base = uColor;
  float photoMix = 0.0;

  // A supplied photograph textures the garment across its entire surface on the
  // side facing the camera (sleeves, shoulders, collar, chest, hem).
  if (uHasTexture == 1 && vSide > 0.0) {
    vec2 tUv = uPhotoFit == 1
      ? vUv
      : (vUv - uTextureRect.xy) / max(uTextureRect.zw, vec2(1e-4));
    if (tUv.x >= 0.0 && tUv.x <= 1.0 && tUv.y >= 0.0 && tUv.y <= 1.0) {
      vec4 sampled = texture2D(uTexture, tUv);

      float isTransparent = 1.0 - smoothstep(0.05, 0.25, sampled.a);
      float isBg;

      if (uPhotoFit == 1) {
        // The cloth was cut from this image's own outline, so every point on
        // it is inside the garment. Guessing at "background" here would punch
        // holes in a black tee — the darkest pixels are the garment.
        isBg = isTransparent;
      } else {
        // Legacy path: a photograph laid over a generic mesh, where parts of
        // the UV rect genuinely are backdrop.
        float brightness = max(sampled.r, max(sampled.g, sampled.b));
        float isBlackBg = 1.0 - smoothstep(0.015, 0.045, brightness);
        isBg = clamp(isTransparent + isBlackBg, 0.0, 1.0);
      }

      // Where it's background, blend smoothly to uColor (the garment cloth colour)
      vec3 photoColor = mix(sampled.rgb, uColor, isBg);
      base = mix(uColor, photoColor, 1.0 - isBg);
      photoMix = (1.0 - isBg) * sampled.a;
    }
  } else if (uHasBack == 1 && vSide <= 0.0) {
    // The reverse of the garment, from its own photograph.
    //
    // Mirrored in u. The back sheet's vertices carry the same UVs as the
    // front ones they sit behind, so viewed from behind the image would come
    // out reversed — the neck label on the wrong shoulder. Flipping u puts
    // the back photo the way round you would actually see it.
    vec2 bUv = uPhotoFit == 1
      ? vec2(1.0 - vUv.x, vUv.y)
      : vec2(1.0 - (vUv.x - uTextureRect.x) / max(uTextureRect.z, 1e-4),
             (vUv.y - uTextureRect.y) / max(uTextureRect.w, 1e-4));

    if (bUv.x >= 0.0 && bUv.x <= 1.0 && bUv.y >= 0.0 && bUv.y <= 1.0) {
      vec4 sampled = texture2D(uTextureBack, bUv);
      float isTransparent = 1.0 - smoothstep(0.05, 0.25, sampled.a);
      float isBg = isTransparent;
      if (uPhotoFit != 1) {
        float brightness = max(sampled.r, max(sampled.g, sampled.b));
        isBg = clamp(isTransparent + (1.0 - smoothstep(0.015, 0.045, brightness)), 0.0, 1.0);
      }
      base = mix(sampled.rgb, uBackColor, isBg);
      photoMix = (1.0 - isBg) * sampled.a;
    } else {
      base = uBackColor;
    }
  } else if (uHasTexture == 1 && vSide <= 0.0) {
    // Back of the shirt: the photograph only shows one side, so this is the
    // garment's own cloth colour rather than a mirrored, fake print.
    //
    // Lifted toward the front's brightness. Now the garment is draped over a
    // body its sides are steep, so a band of back sheet is visible all round
    // the silhouette — and left at plain shadow value it read as a grey halo
    // rather than as the same cloth turning away from the light.
    base = uBackColor * 1.25;
    photoMix = 0.0;
  }

  // The weave adds realistic cloth texture while preserving print crispness
  base *= mix(0.88 + w * 0.24, 1.0, photoMix * 0.65);

  // Lighting strength is dialled down where a photograph supplies the shading.
  float lit = mix(1.0, 0.42, photoMix);
  vec3 color = base * (diffuse * 1.05 * lit + fill * 0.55 * lit + top * 0.5 * lit)
             + base * mix(ambient, vec3(0.78), photoMix);
  // Sheen is tinted by the cloth rather than pure white, so a dark garment
  // does not grow a grey halo at its edges.
  color += mix(base, uSheen, 0.5) * fresnel * (0.14 + uRoughness * 0.12);
  color += uRimColor * pow(fresnel, 2.2) * 0.18;

  // Print sits on top, matte — ink is flatter than the cloth around it.
  float pm = uHasTexture == 1 ? 0.0 : printMask(vUv);
  if (pm > 0.001) {
    vec3 ink = uPrintColor * (diffuse * 0.92 + fill + 0.10);
    color = mix(color, ink, pm);
  }

  // Fine fibre grain, and a dither to keep flat colour from banding.
  float grain = vnoise(vUv * 900.0) - 0.5;
  color += grain * 0.022;

  // Soft highlight roll-off. Without it a pale garment — cream, bone, white —
  // clips to flat paper white under this much light and loses every fold it
  // has, which is most of what made the render look synthetic.
  //
  // Eased right off for a photographed garment: the photo already has its own
  // highlights rolled off by the camera, and compressing them a second time
  // visibly darkens the whole piece.
  color = color / (1.0 + color * mix(0.38, 0.10, photoMix));

  gl_FragColor = vec4(color, 1.0);
}
`;

export const PRINT_STYLE_IDS: Record<string, number> = {
  NONE: 0,
  BLOCK: 1,
  ARCH: 2,
  STAMP: 3,
  SWAN: 4,
};
