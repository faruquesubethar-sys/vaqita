/**
 * Generates product imagery as SVG flat-lays.
 *
 * Each file is a garment photographed-from-above illustration: the real
 * silhouette of the cut, in the real colourway, on a studio ground with a
 * jersey weave and a soft shadow. They stand in for photography without
 * pretending to be a photograph of a product that does not exist.
 *
 * The silhouettes intentionally mirror the shapes the 3D try-on builds, so the
 * card and the fitting room show the same garment.
 *
 *   node scripts/generate-imagery.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "products");

mkdirSync(OUT, { recursive: true });

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function luma(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (
    (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  );
}

/**
 * Garment outlines, drawn on a 1000 x 1250 canvas.
 *
 * Proportions are taken from real flat-lay measurements, not eyeballed. A tee
 * laid flat is roughly 1.4 times as long as it is wide across the body; the
 * first version of these shapes was 2.8, which is a tube rather than a shirt
 * and read as obviously fake at card size.
 */
const SHAPES = {
  TEE: `M300 244 L420 252 Q500 318 580 252 L700 244 L908 330 L856 510 L762 476
        L776 1046 Q500 1082 224 1046 L238 476 L144 510 L92 330 Z`,
  POLO: `M300 244 L416 250 L500 344 L584 250 L700 244 L908 330 L856 510 L762 476
        L776 1040 Q500 1076 224 1040 L238 476 L144 510 L92 330 Z`,
  LONG_SLEEVE: `M300 244 L420 252 Q500 318 580 252 L700 244 L940 350 L872 880
        L764 858 L776 1046 Q500 1082 224 1046 L236 858 L128 880 L60 350 Z`,
  SHIRT: `M296 238 L420 244 L500 336 L580 244 L704 238 L912 326 L852 500 L764 468
        L780 1080 Q500 1108 220 1080 L236 468 L148 500 L88 326 Z`,
  TANK: `M372 250 Q500 300 628 250 L664 330 Q628 420 636 500 L640 1036
        Q500 1070 360 1036 L364 500 Q372 420 336 330 Z`,
  HOODIE: `M300 300 Q500 210 700 300 L936 392 L868 566 L768 528 L782 1060
        Q500 1096 218 1060 L232 528 L132 566 L64 392 Z`,
  TRACK_TOP: `M316 262 Q500 228 684 262 L684 318 L936 400 L866 890 L768 866
        L780 1056 Q500 1090 220 1056 L232 866 L134 890 L64 400 L316 318 Z`,
  TRACK_PANT: `M300 196 Q500 168 700 196 L722 320 Q728 450 714 580 L680 1150
        Q592 1172 528 1150 L500 700 L472 1150 Q408 1172 320 1150 L286 580
        Q272 450 278 320 Z`,
  TROUSER: `M308 192 Q500 164 692 192 L710 312 Q718 448 704 586 L672 1186
        Q590 1204 530 1186 L500 706 L470 1186 Q410 1204 328 1186 L296 586
        Q282 448 290 312 Z`,
  CAP: `M230 660 Q230 372 500 372 Q770 372 770 660 L880 692 Q886 752 830 770
        L230 770 Z`,
};

/** Collar shapes, so a tee does not read like a shirt. */
const COLLARS = {
  TEE: `M420 252 Q500 318 580 252 Q500 286 420 252 Z`,
  LONG_SLEEVE: `M420 252 Q500 318 580 252 Q500 286 420 252 Z`,
  POLO: `M416 250 L500 344 L584 250 L566 238 L500 306 L434 238 Z`,
  SHIRT: `M420 244 L500 336 L580 244 L562 232 L500 300 L438 232 Z`,
  TANK: `M372 250 Q500 300 628 250 Q500 342 372 250 Z`,
  HOODIE: `M330 288 Q500 214 670 288 Q500 356 330 288 Z`,
  TRACK_TOP: `M316 262 Q500 228 684 262 L684 318 Q500 286 316 318 Z`,
  TRACK_PANT: `M300 196 Q500 168 700 196 L704 254 Q500 226 296 254 Z`,
  TROUSER: `M308 192 Q500 164 692 192 L696 244 Q500 218 304 244 Z`,
  CAP: `M230 660 Q500 600 770 660 L770 700 Q500 640 230 700 Z`,
};

function print(style, ink) {
  const cx = 500;
  const cy = 560;
  switch (style) {
    case "BLOCK":
      return `<g fill="${ink}" opacity="0.88">
        <rect x="${cx - 150}" y="${cy - 60}" width="300" height="46" rx="3"/>
        <rect x="${cx - 104}" y="${cy + 10}" width="208" height="30" rx="3"/>
      </g>`;
    case "ARCH":
      return `<g fill="none" stroke="${ink}" stroke-width="40" opacity="0.85" stroke-linecap="round">
        <path d="M${cx - 150} ${cy + 40} Q${cx} ${cy - 110} ${cx + 150} ${cy + 40}"/>
      </g>`;
    case "STAMP":
      return `<g fill="none" stroke="${ink}" stroke-width="16" opacity="0.8">
        <circle cx="${cx}" cy="${cy}" r="104"/>
        <path d="M${cx - 128} ${cy} L${cx + 128} ${cy}"/>
      </g>`;
    case "SWAN":
      return `<g fill="${ink}" opacity="0.86" transform="translate(${cx - 120} ${cy - 96}) scale(0.96)">
        <path d="M96 150 L150 177 L206 154 L232 118 L210 32 L120 128 Z"/>
        <path d="M20 98 L58 78 L54 56 L96 42 L122 74 L118 126 L136 158 L104 160 L88 124 L86 98 L54 106 Z"/>
      </g>`;
    default:
      return "";
  }
}

function flatLay({ base, shape = "TEE", printStyle = "NONE", seed = 1 }) {
  const light = shade(base, 0.16);
  const dark = shade(base, -0.3);
  const deep = shade(base, -0.52);
  const ink = luma(base) > 0.45 ? "#16171b" : "#efeadf";

  const W = 1000;
  const H = 1250;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="cloth" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="46%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>

    <pattern id="jersey" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="${base}"/>
      <path d="M0 3.5 H7" stroke="${light}" stroke-width="1" opacity=".30"/>
      <path d="M3.5 0 V7" stroke="${deep}" stroke-width="1" opacity=".22"/>
    </pattern>

    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>

    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>

    <radialGradient id="ground" cx="50%" cy="46%" r="72%">
      <stop offset="0%" stop-color="#1b1c20"/>
      <stop offset="100%" stop-color="#0b0b0c"/>
    </radialGradient>

    <clipPath id="body"><path d="${SHAPES[shape] ?? SHAPES.TEE}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#ground)"/>

  <!-- Cast shadow, offset down-right from the garment -->
  <g opacity="0.55" filter="url(#soft)" transform="translate(26 30)">
    <path d="${SHAPES[shape] ?? SHAPES.TEE}" fill="#000"/>
  </g>

  <!-- Garment -->
  <path d="${SHAPES[shape] ?? SHAPES.TEE}" fill="url(#cloth)"/>
  <g clip-path="url(#body)">
    <rect width="${W}" height="${H}" fill="url(#jersey)" opacity="0.5"/>

    <!-- Folds: soft strokes that follow how a flat-laid garment creases -->
    <g filter="url(#soft)" opacity="0.5">
      <path d="M356 340 Q392 640 336 1020" stroke="${deep}" stroke-width="44" fill="none"/>
      <path d="M660 350 Q618 660 676 1020" stroke="${deep}" stroke-width="38" fill="none"/>
      <path d="M500 300 Q512 600 500 1000" stroke="${light}" stroke-width="30" fill="none" opacity=".65"/>
    </g>

    ${print(printStyle, ink)}

    <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".055" style="mix-blend-mode:overlay"/>
  </g>

  <!-- Collar and hem sit slightly darker, as ribbing does -->
  <path d="${COLLARS[shape] ?? COLLARS.TEE}" fill="${deep}" opacity="0.85"/>
  <path d="${SHAPES[shape] ?? SHAPES.TEE}" fill="none" stroke="${deep}" stroke-width="3" opacity="0.5"/>
</svg>`;
}

/** Wide editorial crops — cloth texture rather than a garment. */
function texture({ base, seed = 1, w = 1600, h = 1100 }) {
  const light = shade(base, 0.2);
  const dark = shade(base, -0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <pattern id="j" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <rect width="8" height="8" fill="${base}"/>
      <path d="M0 4 H8" stroke="${light}" stroke-width="1.2" opacity=".4"/>
      <path d="M4 0 V8" stroke="${dark}" stroke-width="1.2" opacity=".3"/>
    </pattern>
    <radialGradient id="v" cx="50%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".68"/>
    </radialGradient>
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>
    <filter id="s"><feGaussianBlur stdDeviation="30"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#j)"/>
  <g opacity=".5" filter="url(#s)">
    <path d="M${w * 0.16} 0 Q ${w * 0.4} ${h * 0.5}, ${w * 0.24} ${h}" fill="none" stroke="${light}" stroke-width="90" opacity=".28"/>
    <path d="M${w * 0.74} 0 Q ${w * 0.56} ${h * 0.52}, ${w * 0.84} ${h}" fill="none" stroke="${dark}" stroke-width="130" opacity=".45"/>
  </g>
  <rect width="${w}" height="${h}" filter="url(#g)" opacity=".05" style="mix-blend-mode:overlay"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>
</svg>`;
}

// ---------------------------------------------------------------- manifest

const GARMENTS = [
  // Thrift Tee
  ["tee-faded-black", { base: "#2b2b2e", shape: "TEE", printStyle: "ARCH", seed: 3 }],
  ["tee-faded-black-alt", { base: "#26262a", shape: "TEE", printStyle: "NONE", seed: 4 }],
  ["tee-sun-ochre", { base: "#b07c3c", shape: "TEE", printStyle: "ARCH", seed: 5 }],

  ["tee-bottle-green", { base: "#20402f", shape: "TEE", printStyle: "SWAN", seed: 6 }],
  ["tee-bottle-green-alt", { base: "#1b3728", shape: "TEE", printStyle: "NONE", seed: 7 }],
  ["tee-bone", { base: "#cfc8b8", shape: "TEE", printStyle: "SWAN", seed: 8 }],

  ["tee-oxblood", { base: "#5b2a2c", shape: "TEE", printStyle: "STAMP", seed: 9 }],
  ["tee-oxblood-alt", { base: "#4e2426", shape: "TEE", printStyle: "NONE", seed: 10 }],

  ["tee-washed-indigo", { base: "#39455c", shape: "TEE", printStyle: "BLOCK", seed: 11 }],
  ["tee-washed-indigo-alt", { base: "#323c51", shape: "TEE", printStyle: "NONE", seed: 12 }],

  ["tee-cement", { base: "#8c8880", shape: "TEE", printStyle: "BLOCK", seed: 13 }],
  ["tee-charcoal-blank", { base: "#33343a", shape: "TEE", printStyle: "NONE", seed: 14 }],
  ["tee-white-blank", { base: "#ddd9cf", shape: "TEE", printStyle: "NONE", seed: 15 }],

  // Surplus
  ["ls-olive", { base: "#454b38", shape: "LONG_SLEEVE", printStyle: "STAMP", seed: 16 }],
  ["ls-olive-alt", { base: "#3d4231", shape: "LONG_SLEEVE", printStyle: "NONE", seed: 17 }],
  ["ls-navy", { base: "#2a3448", shape: "LONG_SLEEVE", printStyle: "STAMP", seed: 18 }],

  ["shirt-olive", { base: "#4a5039", shape: "SHIRT", printStyle: "NONE", seed: 19 }],
  ["shirt-olive-alt", { base: "#414734", shape: "SHIRT", printStyle: "NONE", seed: 20 }],
  ["shirt-khaki", { base: "#8d7f60", shape: "SHIRT", printStyle: "NONE", seed: 21 }],

  ["shirt-chambray", { base: "#55688a", shape: "SHIRT", printStyle: "NONE", seed: 22 }],
  ["shirt-chambray-alt", { base: "#4b5d7d", shape: "SHIRT", printStyle: "NONE", seed: 23 }],
  ["shirt-black", { base: "#2c2d31", shape: "SHIRT", printStyle: "NONE", seed: 24 }],

  ["shirt-flannel-rust", { base: "#7a4432", shape: "SHIRT", printStyle: "NONE", seed: 25 }],
  ["shirt-flannel-green", { base: "#3c5240", shape: "SHIRT", printStyle: "NONE", seed: 26 }],

  // Overdye / vintage
  ["tank-black", { base: "#2a2a2d", shape: "TANK", printStyle: "NONE", seed: 27 }],
  ["tank-sand", { base: "#b9ab90", shape: "TANK", printStyle: "NONE", seed: 28 }],

  ["hoodie-ash", { base: "#4c4d52", shape: "HOODIE", printStyle: "SWAN", seed: 29 }],
  ["hoodie-ash-alt", { base: "#43444a", shape: "HOODIE", printStyle: "NONE", seed: 30 }],
  ["hoodie-forest", { base: "#26402f", shape: "HOODIE", printStyle: "SWAN", seed: 31 }],

  ["tee-acid-grey", { base: "#6e6f74", shape: "TEE", printStyle: "STAMP", seed: 32 }],
  ["tee-acid-grey-alt", { base: "#636469", shape: "TEE", printStyle: "NONE", seed: 33 }],
  ["tee-rust", { base: "#8a4a30", shape: "TEE", printStyle: "ARCH", seed: 34 }],
];

const NEW_GARMENTS = [
  // Polos
  ["polo-navy", { base: "#27364e", shape: "POLO", printStyle: "NONE", seed: 60 }],
  ["polo-navy-alt", { base: "#223045", shape: "POLO", printStyle: "NONE", seed: 61 }],
  ["polo-sage", { base: "#6d7a62", shape: "POLO", printStyle: "NONE", seed: 62 }],
  ["polo-cream", { base: "#c8c0ab", shape: "POLO", printStyle: "SWAN", seed: 63 }],
  ["polo-burgundy", { base: "#5c2f36", shape: "POLO", printStyle: "NONE", seed: 64 }],
  ["polo-black", { base: "#2a2a2e", shape: "POLO", printStyle: "SWAN", seed: 65 }],

  // Track
  ["track-top-navy", { base: "#243049", shape: "TRACK_TOP", printStyle: "BLOCK", seed: 66 }],
  ["track-top-navy-alt", { base: "#1f2a40", shape: "TRACK_TOP", printStyle: "NONE", seed: 67 }],
  ["track-top-maroon", { base: "#57282f", shape: "TRACK_TOP", printStyle: "BLOCK", seed: 68 }],
  ["track-pant-black", { base: "#26262a", shape: "TRACK_PANT", printStyle: "NONE", seed: 69 }],
  ["track-pant-black-alt", { base: "#212125", shape: "TRACK_PANT", printStyle: "NONE", seed: 70 }],
  ["track-pant-grey", { base: "#5e5f65", shape: "TRACK_PANT", printStyle: "NONE", seed: 71 }],

  // Trousers
  ["trouser-charcoal", { base: "#34353b", shape: "TROUSER", printStyle: "NONE", seed: 72 }],
  ["trouser-charcoal-alt", { base: "#2e2f34", shape: "TROUSER", printStyle: "NONE", seed: 73 }],
  ["trouser-stone", { base: "#8b8271", shape: "TROUSER", printStyle: "NONE", seed: 74 }],
  ["trouser-olive", { base: "#4b5039", shape: "TROUSER", printStyle: "NONE", seed: 75 }],
  ["trouser-brown", { base: "#5b4433", shape: "TROUSER", printStyle: "NONE", seed: 76 }],

  // Accessories
  ["cap-black", { base: "#292a2e", shape: "CAP", printStyle: "SWAN", seed: 77 }],
  ["cap-black-alt", { base: "#232428", shape: "CAP", printStyle: "NONE", seed: 78 }],
  ["cap-olive", { base: "#4a5039", shape: "CAP", printStyle: "SWAN", seed: 79 }],
  ["cap-bone", { base: "#c5bda9", shape: "CAP", printStyle: "SWAN", seed: 80 }],
];


/**
 * One intake lot of thrifted graphic tees.
 *
 * Deliberately printStyle "NONE": the graphics on these pieces are third-party
 * artwork, so the placeholder shows the true colourway and cut only. Real
 * photographs are uploaded per piece through the admin.
 */
const THRIFT_LOT = [
  ["lot-pablo", { base: "#d4708f", shape: "TEE", printStyle: "NONE", seed: 101 }],
  ["lot-cherub", { base: "#6f6a80", shape: "TEE", printStyle: "NONE", seed: 102 }],
  ["lot-panther", { base: "#c8c6c0", shape: "TEE", printStyle: "NONE", seed: 103 }],
  ["lot-cowboy", { base: "#ded5c2", shape: "TEE", printStyle: "NONE", seed: 104 }],
  ["lot-dragon", { base: "#1f1f22", shape: "TEE", printStyle: "NONE", seed: 105 }],
  ["lot-hangingon", { base: "#3a3a3c", shape: "TEE", printStyle: "NONE", seed: 106 }],
  ["lot-skulls", { base: "#232326", shape: "TEE", printStyle: "NONE", seed: 107 }],
  ["lot-spine", { base: "#2a2f3f", shape: "TEE", printStyle: "NONE", seed: 108 }],
  ["lot-grillz", { base: "#e8e6e0", shape: "TEE", printStyle: "NONE", seed: 109 }],
  ["lot-bear", { base: "#e9e7e2", shape: "TEE", printStyle: "NONE", seed: 110 }],
  ["lot-coldhearted", { base: "#e5e2da", shape: "TEE", printStyle: "NONE", seed: 111 }],
  ["lot-money", { base: "#2e2724", shape: "TEE", printStyle: "NONE", seed: 112 }],
  ["lot-race", { base: "#ddd9d1", shape: "TEE", printStyle: "NONE", seed: 113 }],
  ["lot-saint", { base: "#7d7b78", shape: "TEE", printStyle: "NONE", seed: 114 }],
  ["lot-corvette", { base: "#dcd8d0", shape: "TEE", printStyle: "NONE", seed: 115 }],
  ["lot-mustang", { base: "#d9a9a3", shape: "TEE", printStyle: "NONE", seed: 116 }],
  ["lot-bolt", { base: "#b3b1ac", shape: "TEE", printStyle: "NONE", seed: 117 }],
  ["lot-88", { base: "#1e1e20", shape: "TEE", printStyle: "NONE", seed: 118 }],
  ["lot-highroller", { base: "#4e4c33", shape: "TEE", printStyle: "NONE", seed: 119 }],
  ["lot-skaters", { base: "#5c4a38", shape: "TEE", printStyle: "NONE", seed: 120 }],
  ["lot-losangeles", { base: "#2f3d5c", shape: "TEE", printStyle: "NONE", seed: 121 }],
  ["lot-eyes", { base: "#a5252a", shape: "TEE", printStyle: "NONE", seed: 122 }],
  ["lot-motorcycle", { base: "#6e2b32", shape: "TEE", printStyle: "NONE", seed: 123 }],
  ["lot-arachnid", { base: "#4a3b2e", shape: "TEE", printStyle: "NONE", seed: 124 }],
  ["lot-seven", { base: "#e6e3db", shape: "TEE", printStyle: "NONE", seed: 125 }],
  ["lot-rb20", { base: "#1e2a4a", shape: "TEE", printStyle: "NONE", seed: 126 }],
  ["lot-shakur", { base: "#4a4c35", shape: "TEE", printStyle: "NONE", seed: 127 }],
  ["lot-swoosh", { base: "#7d9ad1", shape: "TEE", printStyle: "NONE", seed: 128 }],
  ["lot-basketball", { base: "#24303c", shape: "TEE", printStyle: "NONE", seed: 129 }],
  ["lot-lablack", { base: "#24242a", shape: "TEE", printStyle: "NONE", seed: 130 }],
];

const TEXTURES = [
  ["editorial-sorting", { base: "#3a3a3e", seed: 40 }],
  ["editorial-bale", { base: "#4a4136", seed: 42 }],
  ["collection-thrift-tees", { base: "#2f3036", seed: 44, w: 1400, h: 1750 }],
  ["collection-surplus", { base: "#454a38", seed: 46, w: 1400, h: 1750 }],
  ["collection-polos", { base: "#2b3a4e", seed: 48, w: 1400, h: 1750 }],
  ["collection-track", { base: "#3a3038", seed: 50, w: 1400, h: 1750 }],
  ["collection-trousers", { base: "#4a4438", seed: 52, w: 1400, h: 1750 }],
  ["collection-accessories", { base: "#6b6459", seed: 54, w: 1400, h: 1750 }],
];

for (const [name, opts] of [...GARMENTS, ...NEW_GARMENTS, ...THRIFT_LOT]) {
  writeFileSync(resolve(OUT, `${name}.svg`), flatLay(opts), "utf8");
}
for (const [name, opts] of TEXTURES) {
  writeFileSync(resolve(OUT, `${name}.svg`), texture(opts), "utf8");
}

console.log(
  `Wrote ${GARMENTS.length + NEW_GARMENTS.length + THRIFT_LOT.length} garment flat-lays and ${TEXTURES.length} textures to public/products/`,
);
