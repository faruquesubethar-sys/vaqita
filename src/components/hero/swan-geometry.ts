import * as THREE from "three";

/**
 * The house mark as real extruded geometry.
 *
 * The logo is an origami swan — folded flat planes — so extruding its actual
 * outline is both the honest 3D reading of the mark and, conveniently, the
 * cheapest. The coordinates below are the same ones the SVG uses, so the hero
 * and the favicon are literally the same shape.
 *
 * SVG's y axis points down and three.js's points up, so every y is negated on
 * the way in.
 */

/**
 * The mark, traced from the reference brooch rather than drawn by eye.
 *
 * The photograph was segmented (the piece sits on near-white paper, so a
 * luminance threshold separates it cleanly), the largest component's contour
 * simplified with Douglas-Peucker, and the result mapped into this 250 x 200
 * space preserving aspect. The green inlays were lifted separately by hue.
 *
 * So these numbers are measurements, not approximations of a memory of the
 * photograph — which is what the previous outline was, and why the head came
 * out blocky and the neck twice the thickness it should have been.
 */
const OUTLINE: [number, number][] = [
  [84.9, 0],
  [61.3, 13.7],
  [42.2, 62.6],
  [46, 76.3],
  [74.2, 59.5],
  [87.2, 70.2],
  [49.8, 109.9],
  [40.6, 161.8],
  [72.7, 198.5],
  [152.9, 196.2],
  [209.4, 136.6],
  [190.3, 130.5],
  [210.1, 94.7],
  [210.1, 3.8],
  [88.7, 116.8],
  [125.4, 58.8],
  [124.6, 25.2],
  [114.7, 36.6],
];

/**
 * The green inlays, in descending size.
 *
 * The four large ones are the wing fan; the rest are the body panels. They
 * are separate planes rather than one shape on purpose — each is tilted to
 * its own angle in `buildFoldedFacets`, which is what makes light break
 * across the wing instead of washing it evenly.
 */
const PANELS: [number, number][][] = [
  // Wing fan, outer to inner.
  [[203.2, 14.5], [153.6, 64.1], [138.4, 100.8], [204.8, 35.9]],
  [[194.8, 56.5], [136.1, 113], [126.9, 133.6], [181.9, 92.4]],
  [[204.8, 86.3], [187.2, 100], [178.1, 124.4], [184.2, 122.1], [198.7, 108.4]],
  [[204.8, 51.9], [194.1, 83.2], [204.8, 73.3]],
  // Tail and lower body.
  [[193.3, 142], [171.2, 142.7], [158.2, 167.9], [164.3, 171]],
  [[158.2, 144.3], [136.1, 148.9], [131.5, 151.9], [150.6, 162.6]],
  // Breast.
  [[90.3, 134.4], [84.2, 167.2], [107.1, 148.1]],
  [[110.1, 109.2], [104, 113], [94.8, 125.2], [110.9, 138.2]],
];

/** The one cut stone, at the head. Traced from the same photograph. */
const EYE: [number, number][] = [
  [55.2, 35.9],
  [58.2, 41.2],
  [65.8, 41.2],
  [69.7, 45.8],
  [72.7, 43.5],
  [69.7, 32.1],
  [66.6, 29.8],
  [60.5, 31.3],
];

const CX = 125;
const CY = 100;
const SCALE = 0.016;
const SHELL_DEPTH = 0.26;
const BEVEL_THICKNESS = 0.02;

/**
 * A last hair of inset on each panel.
 *
 * Most of the gold crease is already in the traced coordinates: the wing is
 * one connected green region in the photograph, cut through by gold lines, so
 * the panels were separated by eroding across those lines. The erosion left
 * the gap. This only crisps the edge.
 */
// Negative: the panels are grown back out slightly.
// Separating the wing wedges meant eroding across the gold lines, and that
// erosion plus the anti-aliased edge the colour mask discards left the gold
// creases about three times the width they are on the real piece.
const CREASE = -2.2;

/* -------------------------------------------------------------- geometry */

function toShape(points: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const sx = (x - CX) * SCALE;
    const sy = -(y - CY) * SCALE; // SVG y grows downward
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  });
  shape.closePath();
  return shape;
}

function signedArea(points: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Shrinks a convex polygon by `d`, measured perpendicular to each edge.
 *
 * Done by offsetting every edge line inward and re-intersecting neighbours,
 * rather than pulling vertices toward the centroid. On a long thin triangle —
 * which most of these facets are — a centroid pull shortens the long axis far
 * more than the short one and the facet stops matching the fold it represents.
 */
function insetPolygon(points: [number, number][], d: number): [number, number][] {
  const n = points.length;
  if (n < 3) return points;

  // Edge normals point inward only if we know the winding.
  const inward = signedArea(points) > 0 ? 1 : -1;

  type Line = { px: number; py: number; dx: number; dy: number };
  const lines: Line[] = [];

  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const len = Math.hypot(ex, ey) || 1;
    const ux = ex / len;
    const uy = ey / len;
    // Left normal of the edge direction; `inward` flips it for CW polygons.
    const nx = -uy * inward;
    const ny = ux * inward;
    lines.push({ px: x1 + nx * d, py: y1 + ny * d, dx: ux, dy: uy });
  }

  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const denom = a.dx * b.dy - a.dy * b.dx;

    // Parallel edges have no intersection; keep the original vertex rather
    // than emitting a non-finite one, which would silently kill the mesh.
    if (Math.abs(denom) < 1e-9) {
      out.push(points[i]);
      continue;
    }

    const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / denom;
    const x = a.px + a.dx * t;
    const y = a.py + a.dy * t;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      out.push(points[i]);
      continue;
    }
    out.push([x, y]);
  }

  // An over-inset facet collapses or turns inside out. Detect it by the area
  // flipping sign, and fall back to the original rather than render a knot.
  if (Math.sign(signedArea(out)) !== Math.sign(signedArea(points))) return points;

  return out;
}

export type SwanGeometries = {
  shell: THREE.ExtrudeGeometry;
  /** Folded, not extruded — see buildFoldedFan. */
  facets: THREE.BufferGeometry;
  eye: THREE.ExtrudeGeometry;
  dispose: () => void;
};

/**
 * Builds the swan, already centred on the origin.
 *
 * All pieces are translated by the *same* offset rather than each being
 * centred independently — centring them separately would drift the facets and
 * the eye off the body, since each has a different bounding box.
 */
/**
 * Builds the green inlays as separate tilted planes.
 *
 * The brooch itself is flat — it is a pin. Rendering it flat, though, gives
 * every panel the same surface normal, so they all take the key light at the
 * same angle and shade to one value: a sticker with thickness, which is what
 * this was before.
 *
 * Each panel is therefore kept perfectly planar, as it is on the real piece,
 * but set at its own slight angle. Planar, so it still reads as a flat inlay
 * rather than a dome; angled, so neighbours catch the light independently and
 * the wing breaks up as it turns. Parallel panels cannot do that at any
 * material setting, which is why no amount of roughness tuning fixed it.
 *
 * Tilts are derived from the panel index rather than random, so the mark
 * looks identical on every load.
 */
function buildFoldedFacets(): THREE.BufferGeometry {
  const positions: number[] = [];
  const BASE = 0.016;

  PANELS.forEach((panel, index) => {
    const inset = insetPolygon(panel, CREASE);
    if (inset.length < 3) return;

    // Centroid, in the same 250 x 200 space the points are given in.
    let cx = 0;
    let cy = 0;
    for (const [x, y] of inset) {
      cx += x;
      cy += y;
    }
    cx /= inset.length;
    cy /= inset.length;

    // Two irrational multipliers keep successive panels from ever landing on
    // the same pair of angles, without needing a random source.
    const tiltX = Math.sin(index * 2.399) * 0.34;
    const tiltY = Math.cos(index * 1.618) * 0.28;

    const to3 = ([x, y]: [number, number]): [number, number, number] => [
      (x - CX) * SCALE,
      -(y - CY) * SCALE,
      // A plane through the centroid: still exactly flat, just not parallel
      // to its neighbours.
      BASE + ((x - cx) * tiltX + (y - cy) * tiltY) * SCALE,
    ];

    // Fan from the centroid. Every vertex lies on the same plane, so this
    // stays planar however the polygon is shaped.
    const centre = to3([cx, cy]);
    for (let i = 0; i < inset.length; i++) {
      const a = to3(inset[i]);
      const b = to3(inset[(i + 1) % inset.length]);
      positions.push(...centre, ...a, ...b);
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  // Non-indexed on purpose: shared vertices would average normals across the
  // panel edges and smooth away the facets this exists to create.
  g.computeVertexNormals();
  return g;
}

export function buildSwanGeometry(quality: "high" | "low" = "high"): SwanGeometries {
  const bevelSegments = quality === "high" ? 3 : 1;

  const shell = new THREE.ExtrudeGeometry([toShape(OUTLINE)], {
    depth: SHELL_DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL_THICKNESS,
    bevelSize: 0.014,
    bevelSegments,
    curveSegments: 1,
  });

  // The wing's green panels, each genuinely folded rather than extruded flat.
  const facets = buildFoldedFacets();

  const eye = new THREE.ExtrudeGeometry([toShape(EYE)], {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.012,
    bevelSegments: quality === "high" ? 2 : 1,
    curveSegments: 1,
  });

  shell.computeBoundingBox();
  const box = shell.boundingBox!;
  const dx = -(box.max.x + box.min.x) / 2;
  const dy = -(box.max.y + box.min.y) / 2;
  const dz = -(box.max.z + box.min.z) / 2;

  shell.translate(dx, dy, dz);

  /**
   * Overlays are placed at the shell's front face in the centred frame.
   * Eye sits slightly proud so it catches highlights like a set gemstone.
   */
  const halfDepth = (box.max.z - box.min.z) / 2;
  facets.translate(dx, dy, halfDepth - 0.005);
  eye.translate(dx, dy, halfDepth + 0.008);

  shell.computeVertexNormals();
  facets.computeVertexNormals();
  eye.computeVertexNormals();

  // A NaN vertex makes the whole mesh vanish without throwing, so it is worth
  // one explicit check rather than another silent invisible hero.
  for (const [name, g] of [
    ["shell", shell],
    ["facets", facets],
    ["eye", eye],
  ] as const) {
    const pos = g.getAttribute("position").array as ArrayLike<number>;
    for (let i = 0; i < pos.length; i++) {
      if (!Number.isFinite(pos[i])) {
        console.error(`[swan] ${name} geometry produced a non-finite vertex`);
        break;
      }
    }
  }

  return {
    shell,
    facets,
    eye,
    dispose: () => {
      shell.dispose();
      facets.dispose();
      eye.dispose();
    },
  };
}
