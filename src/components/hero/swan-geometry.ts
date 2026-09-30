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

// Outline points, in the SVG's 250 x 200 space.
const BODY: [number, number][] = [
  [96, 150],
  [150, 177],
  [206, 154],
  [232, 118],
  [210, 32],
  [120, 128],
];

/**
 * The beak is blunted to a short flat rather than a single point.
 *
 * ExtrudeGeometry's bevel offsets each vertex along its angle bisector, and at
 * a spike that acute the offset diverges — which produced NaN positions and a
 * silently invisible mesh. A 9-unit flat is invisible at display size and
 * keeps the bevel well-conditioned.
 */
const NECK: [number, number][] = [
  [24, 94],
  [58, 78],
  [54, 56],
  [96, 42],
  [122, 74],
  [118, 126],
  [136, 158],
  [104, 160],
  [88, 124],
  [86, 98],
  [54, 106],
  [24, 103],
];

/**
 * The wing's fold facets.
 *
 * These are NOT decorative panels laid over the body — they are a fan that
 * partitions the wing exactly, radiating from the wing root at [120,128],
 * which is the single reflex vertex of the body outline and therefore the
 * point every crease in a folded wing would run from.
 *
 * Each facet is inset before extrusion, so the gold body shows through between
 * them as a crease. That is what makes the green read as a *face of the fold*
 * rather than a green box stuck on a gold swan.
 */
const WING_ROOT: [number, number] = [120, 128];

const WING_FACETS: { points: [number, number][]; emerald: boolean }[] = [
  // Lower wing base, stays gold (body base with gold glitter stardust).
  { points: [WING_ROOT, [96, 150], [150, 177]], emerald: false },
  // Lower wing facet (emerald diamond panel).
  { points: [WING_ROOT, [150, 177], [206, 154]], emerald: true },
  // Tail facet (emerald diamond panel).
  { points: [WING_ROOT, [206, 154], [232, 118]], emerald: true },
  // Upper mid facet (emerald diamond panel).
  { points: [WING_ROOT, [232, 118], [221, 75]], emerald: true },
  // Upper wing tip facet (emerald diamond panel — green in reference image).
  { points: [WING_ROOT, [221, 75], [210, 32]], emerald: true },
];

// Note: The head, beak and neck are 100% solid faceted gold, exactly like the reference brooch.
// Only the eye is an emerald gemstone.


const EYE: [number, number][] = [
  [66, 62],
  [84, 58],
  [88, 74],
  [70, 78],
];

const CX = 125;
const CY = 100;
const SCALE = 0.016;
const SHELL_DEPTH = 0.26;
const BEVEL_THICKNESS = 0.02;

/**
 * Width of the gold crease left between adjacent facets, in SVG units.
 *
 * Measured off the reference brooch: the gold reads as thin lines dividing
 * large green planes, not as a broad gold body with small green wedges set
 * into it. 4.2 gave the latter.
 */
const CREASE = 2.3;

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
  facets: THREE.ExtrudeGeometry;
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
export function buildSwanGeometry(quality: "high" | "low" = "high"): SwanGeometries {
  const bevelSegments = quality === "high" ? 3 : 1;

  const shell = new THREE.ExtrudeGeometry([toShape(BODY), toShape(NECK)], {
    depth: SHELL_DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL_THICKNESS,
    bevelSize: 0.014,
    bevelSegments,
    curveSegments: 1,
  });

  // Emerald facets: the wing fold planes, inset so gold ribs show between them.
  const emeraldShapes = WING_FACETS.filter((f) => f.emerald).map((f) =>
    toShape(insetPolygon(f.points, CREASE)),
  );
  // Head and neck are solid gold; only the eye is an emerald diamond gemstone.

  /**
   * Cut as diamond-faceted gemstones with table-cut bevels.
   * Steep flat sides rising to a flat top break light into multiple
   * brilliant specular highlights per facet.
   */
  const facets = new THREE.ExtrudeGeometry(emeraldShapes, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.02,
    bevelSegments: quality === "high" ? 2 : 1,
    curveSegments: 1,
  });

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
