import * as THREE from "three";

import type { SilhouetteMask } from "./photo-silhouette";

/**
 * Procedural garment meshes.
 *
 * There is no downloaded .glb here on purpose — an external model is a
 * licensing question and a network dependency, and it cannot recolour or
 * reshape itself per product. Instead each garment is generated from a 2D
 * silhouette that is then *inflated* into a solid.
 *
 * The method:
 *   1. Describe the garment flat, as a signed distance field. Negative inside,
 *      zero on the outline, positive outside. Unions of rounded boxes and
 *      circles give a tee, a shirt, a tank or a hoodie from the same code.
 *   2. Sample that field over a grid. For every sample inside the outline,
 *      push a front vertex toward +Z and a back vertex toward -Z by an amount
 *      that falls to zero at the outline. The two sheets therefore meet along
 *      the edge and enclose a volume — the same trick used for inflatable
 *      lettering.
 *   3. Add cloth: a little noise so the surface is never mathematically flat,
 *      and a downward sag so it hangs rather than floats.
 *
 * The result is a closed, watertight-enough mesh with correct normals that
 * costs one CPU pass and no network request.
 */

export type GarmentType =
  | "TEE"
  | "LONG_SLEEVE"
  | "SHIRT"
  | "TANK"
  | "HOODIE"
  | "POLO"
  | "TRACK_TOP"
  | "TRACK_PANT"
  | "TROUSER"
  | "CAP";

type Sdf = (x: number, y: number) => number;

/** Signed distance to a box with rounded corners, centred at (cx, cy). */
function roundedBox(
  x: number,
  y: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  radius: number,
): number {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

function circle(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.hypot(x - cx, y - cy) - r;
}

/** Distance from point to 2D line segment. */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const lenSq = bax * bax + bay * bay;
  const h = lenSq > 1e-8 ? Math.max(0, Math.min(1, (pax * bax + pay * bay) / lenSq)) : 0;
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

/** Accurate signed distance to a 2D closed polygon (negative inside, positive outside). */
function polygonSdf(px: number, py: number, points: [number, number][]): number {
  let minD = Infinity;
  let inside = false;
  const n = points.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];

    const d = distToSegment(px, py, xi, yi, xj, yj);
    if (d < minD) minD = d;

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }

  return inside ? -minD : minD;
}

/** Smooth union — keeps armhole joins soft instead of creased. */
function smoothUnion(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

const TEE_POINTS: [number, number][] = [
  [-0.24, 0.96],  // collar left
  [-0.48, 0.86],  // shoulder slope mid left
  [-0.72, 0.70],  // shoulder to sleeve join left
  [-0.98, 0.44],  // sleeve tip left
  [-0.79, 0.18],  // sleeve cuff bottom left
  [-0.67, 0.12],  // armpit left
  [-0.68, -0.40], // waist left
  [-0.72, -0.97], // hem bottom left
  [0.72, -0.97],  // hem bottom right
  [0.68, -0.40],  // waist right
  [0.67, 0.12],   // armpit right
  [0.79, 0.18],   // sleeve cuff bottom right
  [0.98, 0.44],   // sleeve tip right
  [0.72, 0.70],   // shoulder to sleeve join right
  [0.48, 0.86],   // shoulder slope mid right
  [0.24, 0.96],   // collar right
  [0.00, 0.83],   // crew neck dip
];

type GarmentSpec = {
  sdf: Sdf;
  /** Half-thickness of the inflated body at its deepest. */
  depth: number;
  /** How far in from the outline the inflation reaches full depth. */
  falloff: number;
  /** Vertical extent, used to frame the camera. */
  height: number;
  /** Where the chest print sits, in silhouette units. */
  print: { cx: number; cy: number; halfW: number; halfH: number };
};

/**
 * Silhouettes are authored in a space where x spans roughly -1.15..1.15 and
 * y spans -1.25..1.05, with y = 0 at the chest.
 */
function specFor(type: GarmentType): GarmentSpec {
  /**
   * The torso, given its top and bottom edges directly.
   *
   * Expressed as edges rather than centre-plus-height on purpose: the sleeves
   * are positioned by where the shoulder is, and if the body's top edge does
   * not actually reach that line the two shapes never touch and the garment
   * renders as three separate pads.
   */
  const torso = (
    x: number,
    y: number,
    halfW: number,
    top: number,
    bottom: number,
    radius = 0.16,
  ) => roundedBox(x, y, 0, (top + bottom) / 2, halfW, (top - bottom) / 2, radius);

  switch (type) {
    case "TANK": {
      return {
        sdf: (x, y) => {
          const body = roundedBox(x, y, 0, -0.2, 0.52, 0.86, 0.18);
          // Deep armholes cut in from either side, and a wide neck.
          const armL = circle(x, y, -0.56, 0.42, 0.34);
          const armR = circle(x, y, 0.56, 0.42, 0.34);
          const neck = circle(x, y, 0, 0.92, 0.3);
          // Subtracting a shape is max(shell, -shape); the nearest cutter wins.
          const cutters = Math.min(armL, armR, neck);
          return Math.max(body, -cutters);
        },
        depth: 0.2,
        falloff: 0.26,
        height: 2.1,
        print: { cx: 0, cy: 0.1, halfW: 0.34, halfH: 0.3 },
      };
    }

    case "LONG_SLEEVE": {
      return {
        sdf: (x, y) => {
          const body = torso(x, y, 0.56, 0.86, -1.05);
          // Sleeves run out and down to the wrist, overlapping the shoulder.
          const sleeveL = roundedBox(x, y, -0.82, 0.12, 0.40, 0.66, 0.18);
          const sleeveR = roundedBox(x, y, 0.82, 0.12, 0.40, 0.66, 0.18);
          const neck = circle(x, y, 0, 0.95, 0.27);
          const shell = smoothUnion(smoothUnion(body, sleeveL, 0.22), sleeveR, 0.22);
          return Math.max(shell, -neck);
        },
        depth: 0.21,
        falloff: 0.24,
        height: 2.3,
        print: { cx: 0, cy: 0.12, halfW: 0.36, halfH: 0.32 },
      };
    }

    case "SHIRT": {
      return {
        sdf: (x, y) => {
          // Straighter body, squarer shoulder than a tee.
          const body = roundedBox(x, y, 0, -0.22, 0.58, 0.9, 0.1);
          const sleeveL = roundedBox(x, y, -0.82, 0.44, 0.34, 0.3, 0.12);
          const sleeveR = roundedBox(x, y, 0.82, 0.44, 0.34, 0.3, 0.12);
          const neck = circle(x, y, 0, 1.0, 0.26);
          const shell = smoothUnion(smoothUnion(body, sleeveL, 0.14), sleeveR, 0.14);
          return Math.max(shell, -neck);
        },
        depth: 0.23,
        falloff: 0.22,
        height: 2.25,
        print: { cx: 0, cy: 0.1, halfW: 0.3, halfH: 0.26 },
      };
    }

    case "HOODIE": {
      return {
        sdf: (x, y) => {
          const body = roundedBox(x, y, 0, -0.24, 0.64, 0.92, 0.2);
          const sleeveL = roundedBox(x, y, -0.92, 0.06, 0.44, 0.66, 0.22);
          const sleeveR = roundedBox(x, y, 0.92, 0.06, 0.44, 0.66, 0.22);
          // The hood sits above the shoulders instead of a neck hole.
          const hood = circle(x, y, 0, 0.96, 0.42);
          return smoothUnion(
            smoothUnion(smoothUnion(body, sleeveL, 0.26), sleeveR, 0.26),
            hood,
            0.2,
          );
        },
        depth: 0.28,
        falloff: 0.3,
        height: 2.4,
        print: { cx: 0, cy: 0.02, halfW: 0.38, halfH: 0.3 },
      };
    }

    case "POLO": {
      return {
        sdf: (x, y) => {
          const body = torso(x, y, 0.56, 0.86, -0.70);
          const sleeveL = roundedBox(x, y, -0.62, 0.48, 0.24, 0.28, 0.12);
          const sleeveR = roundedBox(x, y, 0.62, 0.48, 0.24, 0.28, 0.12);
          // Collar wings sit proud of the shoulder line — the one silhouette
          // difference between a polo and a tee.
          const collarL = roundedBox(x, y, -0.17, 0.93, 0.19, 0.10, 0.04);
          const collarR = roundedBox(x, y, 0.17, 0.93, 0.19, 0.10, 0.04);
          const neck = circle(x, y, 0, 0.99, 0.21);

          let shell = smoothUnion(smoothUnion(body, sleeveL, 0.2), sleeveR, 0.2);
          shell = smoothUnion(smoothUnion(shell, collarL, 0.05), collarR, 0.05);
          return Math.max(shell, -neck);
        },
        depth: 0.2,
        falloff: 0.22,
        height: 1.78,
        print: { cx: 0, cy: 0.1, halfW: 0.3, halfH: 0.24 },
      };
    }

    case "TRACK_TOP": {
      return {
        sdf: (x, y) => {
          const body = torso(x, y, 0.6, 0.84, -0.92, 0.12);
          const sleeveL = roundedBox(x, y, -0.84, 0.1, 0.4, 0.64, 0.16);
          const sleeveR = roundedBox(x, y, 0.84, 0.1, 0.4, 0.64, 0.16);
          // A stand collar rather than a neck hole — it is a zip-through.
          const collar = roundedBox(x, y, 0, 0.94, 0.26, 0.14, 0.06);
          const shell = smoothUnion(
            smoothUnion(smoothUnion(body, sleeveL, 0.2), sleeveR, 0.2),
            collar,
            0.08,
          );
          return shell;
        },
        depth: 0.24,
        falloff: 0.26,
        height: 2.3,
        print: { cx: 0, cy: 0.1, halfW: 0.3, halfH: 0.24 },
      };
    }

    case "TRACK_PANT":
    case "TROUSER": {
      const slim = type === "TROUSER";
      const legHalfW = slim ? 0.17 : 0.2;
      const legCx = slim ? 0.225 : 0.245;
      const legBottom = slim ? -1.3 : -1.22;

      return {
        sdf: (x, y) => {
          // Hips, then two legs, then a slot cut between them for the inseam.
          const hips = roundedBox(x, y, 0, 0.66, 0.45, 0.44, 0.13);
          const legL = roundedBox(
            x,
            y,
            -legCx,
            (0.34 + legBottom) / 2,
            legHalfW,
            (0.34 - legBottom) / 2,
            0.09,
          );
          const legR = roundedBox(
            x,
            y,
            legCx,
            (0.34 + legBottom) / 2,
            legHalfW,
            (0.34 - legBottom) / 2,
            0.09,
          );

          const shell = smoothUnion(smoothUnion(hips, legL, 0.1), legR, 0.1);

          // The cutter is a thin slot with a rounded top — that rounding is the
          // rise, and without it the crotch comes to a sharp unwearable point.
          const slot = roundedBox(x, y, 0, (0.3 + legBottom) / 2 - 0.1, 0.05, 1.0, 0.05);
          const rise = circle(x, y, 0, 0.3, 0.085);
          const cutter = smoothUnion(slot, rise, 0.06);

          return Math.max(shell, -cutter);
        },
        depth: slim ? 0.19 : 0.22,
        falloff: 0.2,
        height: 2.6,
        // Trousers carry no chest print; the rect is kept off the garment.
        print: { cx: -0.34, cy: 0.62, halfW: 0.12, halfH: 0.1 },
      };
    }

    case "CAP": {
      return {
        sdf: (x, y) => {
          // Intersecting a disc with an upper half-plane gives the crown.
          const disc = circle(x, y, -0.1, 0.02, 0.52);
          const crown = Math.max(disc, 0.02 - y);
          const brim = roundedBox(x, y, 0.44, 0.0, 0.46, 0.08, 0.07);
          return smoothUnion(crown, brim, 0.06);
        },
        depth: 0.3,
        falloff: 0.24,
        height: 1.4,
        print: { cx: -0.1, cy: 0.3, halfW: 0.22, halfH: 0.16 },
      };
    }

    case "TEE":
    default: {
      return {
        // Accurately reproduces the real flat-lay t-shirt silhouette:
        // downward sloping shoulders, angled sleeves, natural crewneck, and clean drape.
        sdf: (x, y) => polygonSdf(x, y, TEE_POINTS) - 0.025,
        depth: 0.18,
        falloff: 0.20,
        height: 2.15,
        print: { cx: 0, cy: 0.14, halfW: 0.36, halfH: 0.32 },
      };
    }
  }
}

/** Cheap value noise — enough to break up the surface, no library needed. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  // Smoothstep interpolation, so the noise has no visible grid.
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export type GarmentGeometryResult = {
  geometry: THREE.BufferGeometry;
  height: number;
  print: GarmentSpec["print"];
  /**
   * The garment's extent inside UV space, as x, y, width, height.
   *
   * UVs span the whole sampling rectangle, but the garment only occupies part
   * of it. A projected photograph has to be remapped through this or it gets
   * squashed into the bounding box instead of laid onto the cloth.
   */
  bounds: { x: number; y: number; w: number; h: number };
};

type MeshInput = {
  sdf: Sdf;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cols: number;
  rows: number;
  depth: number;
  falloff: number;
  /** World position -> UV. The two silhouette sources map differently. */
  uvFor: (x: number, y: number) => [number, number];
  /**
   * Height of the body underneath, at a point, in world units.
   *
   * Without one the garment inflates symmetrically about its own outline and
   * comes out as a cushion: no shoulders, no chest, no waist. Every fix
   * attempted on the photograph side was really chasing this.
   */
  torso?: (x: number, y: number) => number;
};

/**
 * Inflates a 2D signed distance field into a closed garment shell.
 *
 * This is the shared meshing pass. It does not care where the field came
 * from — a hand-written parametric silhouette or one traced out of a
 * photograph — which is the whole point of splitting it out.
 */
function meshFromSdf(input: MeshInput): {
  geometry: THREE.BufferGeometry;
  bounds: { x: number; y: number; w: number; h: number };
} {
  const { sdf, minX, maxX, minY, maxY, cols, rows, depth, falloff, uvFor, torso } = input;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let uMin = 1;
  let uMax = 0;
  let vMin = 1;
  let vMax = 0;

  // Grid index -> vertex index, or -1 when that sample lies outside the
  // silhouette. Two sheets: front and back.
  const frontIndex = new Int32Array(cols * rows).fill(-1);
  const backIndex = new Int32Array(cols * rows).fill(-1);

  const distances = new Float32Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + ((maxX - minX) * c) / (cols - 1);
      const y = minY + ((maxY - minY) * r) / (rows - 1);
      distances[r * cols + c] = sdf(x, y);
    }
  }

  const cellX = (maxX - minX) / (cols - 1);
  const cellY = (maxY - minY) / (rows - 1);
  const cell = Math.max(cellX, cellY);

  /**
   * Moves a sample onto the silhouette's zero level.
   *
   * Without this the outline is stair-stepped, because every vertex sits
   * wherever the sampling grid happened to put it. The field is close enough
   * to a true distance function that stepping backwards along its gradient by
   * the distance itself lands on the edge.
   */
  const snapToOutline = (x: number, y: number, d: number): [number, number] => {
    if (d < -cell * 1.5) return [x, y]; // well inside; leave it alone
    const h = cell * 0.5;
    const gx = (sdf(x + h, y) - sdf(x - h, y)) / (2 * h);
    const gy = (sdf(x, y + h) - sdf(x, y - h)) / (2 * h);
    const len = Math.hypot(gx, gy);
    if (len < 1e-6) return [x, y];
    return [x - (gx / len) * d, y - (gy / len) * d];
  };

  const pushVertex = (x: number, y: number, z: number, u: number, v: number) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const d = distances[i];

      // Samples up to one cell *outside* are kept, then snapped back onto the
      // outline below, where they collapse to zero thickness. Dropping them
      // instead leaves every boundary cell that is only partly covered out of
      // the mesh entirely, and the silhouette comes out as a staircase one
      // grid cell deep — obvious on a traced garment seen at a grazing angle.
      if (d > cell) continue;

      const gx0 = minX + ((maxX - minX) * c) / (cols - 1);
      const gy0 = minY + ((maxY - minY) * r) / (rows - 1);
      const [x, y] = snapToOutline(gx0, gy0, d);

      // Inflation profile: 0 at the outline, 1 deep inside. The square root
      // gives a rounded edge rather than a tent.
      const t = Math.min(-d / falloff, 1);
      const puff = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));

      // Cloth: broad folds plus a finer weave-scale ripple.
      const fold =
        (valueNoise(x * 2.2 + 11, y * 1.5) - 0.5) * 0.055 +
        (valueNoise(x * 6.5, y * 4.5 + 3) - 0.5) * 0.018;

      // Fabric hangs — the lower the point, the more it drifts back and down.
      const hang = Math.max(0, -y) * 0.04;

      // The garment takes the greater of its own thickness and the body
      // beneath it, then both are faded out by `puff` so the front and back
      // sheets still meet along the outline and the mesh stays closed.
      const body = torso ? torso(x, y) : 0;
      const z = Math.max(depth, body) * puff + fold * puff;

      // The UV is taken at the *snapped* position, so a vertex pulled onto the
      // outline samples the photograph's outline too rather than the texel it
      // started on.
      const [u, v] = uvFor(x, y);

      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;

      frontIndex[i] = pushVertex(x, y - hang * 0.2, z, u, v);
      backIndex[i] = pushVertex(x, y - hang * 0.2, -z * 0.92, u, v);
    }
  }

  // Two triangles per fully-inside quad, for each sheet. Winding is opposite
  // on the back so both faces point outward.
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = r * cols + c + 1;
      const cc = (r + 1) * cols + c;
      const dd = (r + 1) * cols + c + 1;

      if (frontIndex[a] < 0 || frontIndex[b] < 0 || frontIndex[cc] < 0 || frontIndex[dd] < 0) {
        continue;
      }

      // Row index grows with +y and column with +x, so (a, b, cc) is the
      // counter-clockwise winding whose normal points at the viewer. Getting
      // this backwards points the front sheet's normals into the mesh, which
      // pins fresnel at 1 and floods the garment with rim colour.
      indices.push(frontIndex[a], frontIndex[b], frontIndex[cc]);
      indices.push(frontIndex[b], frontIndex[dd], frontIndex[cc]);

      indices.push(backIndex[a], backIndex[cc], backIndex[b]);
      indices.push(backIndex[b], backIndex[cc], backIndex[dd]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return {
    geometry,
    bounds: { x: uMin, y: vMin, w: uMax - uMin, h: vMax - vMin },
  };
}

/**
 * Builds a garment mesh from its hardcoded parametric silhouette.
 *
 * Used when a product has no cut-out photograph to trace.
 *
 * `resolution` is the grid width; height is derived from the aspect. 150 gives
 * a clean silhouette on desktop, 96 is enough on a phone.
 */
export function buildGarmentGeometry(
  type: GarmentType,
  resolution = 150,
): GarmentGeometryResult {
  const spec = specFor(type);

  const minX = -1.3;
  const maxX = 1.3;
  const minY = -1.35;
  const maxY = 1.3;

  const { geometry, bounds } = meshFromSdf({
    sdf: spec.sdf,
    minX,
    maxX,
    minY,
    maxY,
    cols: resolution,
    rows: Math.round((resolution * (maxY - minY)) / (maxX - minX)),
    depth: spec.depth,
    falloff: spec.falloff,
    uvFor: (x, y) => [(x - minX) / (maxX - minX), (y - minY) / (maxY - minY)],
  });

  return { geometry, height: spec.height, print: spec.print, bounds };
}

/** The framing height the camera expects for each garment type. */
export function garmentHeight(type: GarmentType): number {
  return specFor(type).height;
}

/**
 * Two-pass chamfer distance transform.
 *
 * Gives the distance, in pixels, from every cell to the nearest seed cell.
 * Exact Euclidean would need a far more involved algorithm; chamfer with
 * 1 / root-2 weights is within a couple of percent, which is well under one
 * grid cell at the resolutions used here.
 */
function chamferDistance(seed: Uint8Array, width: number, height: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : INF;

  const A = 1;
  const B = Math.SQRT2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let v = d[i];
      if (y > 0) {
        v = Math.min(v, d[i - width] + A);
        if (x > 0) v = Math.min(v, d[i - width - 1] + B);
        if (x < width - 1) v = Math.min(v, d[i - width + 1] + B);
      }
      if (x > 0) v = Math.min(v, d[i - 1] + A);
      d[i] = v;
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let v = d[i];
      if (y < height - 1) {
        v = Math.min(v, d[i + width] + A);
        if (x > 0) v = Math.min(v, d[i + width - 1] + B);
        if (x < width - 1) v = Math.min(v, d[i + width + 1] + B);
      }
      if (x < width - 1) v = Math.min(v, d[i + 1] + A);
      d[i] = v;
    }
  }

  return d;
}

/** One 3x3 box blur. Takes the stair-stepping off an alpha edge. */
function smoothField(field: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(field.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += field[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

/**
 * Builds a garment mesh from a photograph's own outline.
 *
 * The returned mesh's UVs are the identity mapping onto that photograph, so
 * the cloth and the picture of the cloth are the same shape — sleeve edges,
 * shoulder slope, hem and neckline all line up because they are the same
 * curve, not two curves that were fitted to each other.
 *
 * Honest limit: the *front outline* is exact. Depth is still synthesised by
 * inflation — one photograph cannot say how deep a garment is. This is a
 * faithful 3D of the garment's shape, not a scan of its volume.
 */
/**
 * The body a garment is worn on, as a depth at each point.
 *
 * Not a mannequin mesh — just the shape the cloth has to sit over. An
 * elliptical cross-section whose width and depth vary with height: narrow at
 * the hem, fullest through the chest, squaring off at the shoulders.
 *
 * The sleeves are deliberately left out of it. They hang off the arms, which
 * are much thinner than the torso, so running the chest profile across the
 * full width of a tee would blow the sleeves up into balloons. Beyond the
 * body's half-width the depth falls away and the existing outline inflation
 * takes over, which is about right for a sleeve.
 */
function torsoProfile(worldWidth: number, height: number) {
  const halfW = worldWidth / 2;
  // A tee is far wider than the body in it: the rest is sleeve.
  const bodyHalf = halfW * 0.56;

  return (x: number, y: number) => {
    // 0 at the hem, 1 at the shoulders.
    const v = Math.min(1, Math.max(0, y / height + 0.5));

    // Waist in, chest out, shoulders square.
    const widthAt = bodyHalf * (0.84 + 0.16 * smoothStep(v * 1.15));
    const t = Math.abs(x) / widthAt;
    if (t >= 1) return 0;

    // Deepest through the chest rather than at either end.
    const fullness = 0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, v * 0.95 + 0.05));
    const maxDepth = widthAt * 0.58 * fullness;

    // Elliptical section. The square root is what makes it read as a body
    // rather than a slab with rounded corners.
    return maxDepth * Math.sqrt(1 - t * t);
  };
}

function smoothStep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

export function buildGarmentFromMask(
  mask: SilhouetteMask,
  targetHeight: number,
  resolution = 150,
): GarmentGeometryResult | null {
  const { data, width, height } = mask;

  let minPx = width;
  let maxPx = -1;
  let minPy = height;
  let maxPy = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[y * width + x]) continue;
      if (x < minPx) minPx = x;
      if (x > maxPx) maxPx = x;
      if (y < minPy) minPy = y;
      if (y > maxPy) maxPy = y;
    }
  }
  if (maxPx < minPx || maxPy < minPy) return null;

  const boxW = maxPx - minPx + 1;
  const boxH = maxPy - minPy + 1;
  if (boxW < 8 || boxH < 8) return null;

  // Signed field in pixels: negative inside the garment, zero on its outline.
  // The half-pixel shift puts the zero level between the last cloth pixel and
  // the first background one rather than on top of the cloth pixel.
  const background = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) background[i] = data[i] ? 0 : 1;

  const toGarment = chamferDistance(data, width, height);
  const toBackground = chamferDistance(background, width, height);

  const raw = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    raw[i] = data[i] ? -(toBackground[i] - 0.5) : toGarment[i] - 0.5;
  }
  const field = smoothField(raw, width, height);

  // World mapping: the garment's bounding box is centred on the origin and
  // scaled to the height the camera framing expects.
  const unitsPerPixel = targetHeight / boxH;
  const centrePx = (minPx + maxPx) / 2;
  const centrePy = (minPy + maxPy) / 2;

  const worldWidth = boxW * unitsPerPixel;

  const toPixelX = (x: number) => centrePx + x / unitsPerPixel;
  const toPixelY = (y: number) => centrePy - y / unitsPerPixel;

  /** Bilinear sample of the signed field, in world coordinates. */
  const sdf: Sdf = (x, y) => {
    const px = toPixelX(x);
    const py = toPixelY(y);
    // Outside the frame is background, and far enough out that nothing snaps
    // to a clamped edge.
    if (px < 0 || py < 0 || px > width - 1 || py > height - 1) return targetHeight;

    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const fx = px - x0;
    const fy = py - y0;

    const a = field[y0 * width + x0];
    const b = field[y0 * width + x1];
    const c = field[y1 * width + x0];
    const d = field[y1 * width + x1];

    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return (top + (bottom - top) * fy) * unitsPerPixel;
  };

  // Thickness scales with the garment: a trouser leg is not as deep as a boxy
  // tee, and both should look right without per-type tuning.
  const depth = Math.min(0.3, Math.max(0.07, worldWidth * 0.088));
  const falloff = Math.min(0.32, Math.max(0.09, worldWidth * 0.105));

  // Sample a little beyond the garment so the outline never touches the edge
  // of the grid, where the gradient used for snapping is one-sided.
  const pad = targetHeight * 0.05;
  const halfW = worldWidth / 2 + pad;
  const halfH = targetHeight / 2 + pad;

  const rows = Math.max(48, resolution);
  const cols = Math.max(48, Math.round((rows * halfW) / halfH));

  const { geometry, bounds } = meshFromSdf({
    sdf,
    minX: -halfW,
    maxX: halfW,
    minY: -halfH,
    maxY: halfH,
    cols,
    rows,
    depth,
    falloff,
    torso: torsoProfile(worldWidth, targetHeight),
    // Identity mapping back onto the source photograph. Texel centres, not
    // texel corners — a half-pixel slip here shows as a fringe of background
    // colour around the sleeve.
    uvFor: (x, y) => [
      (toPixelX(x) + 0.5) / width,
      1 - (toPixelY(y) + 0.5) / height,
    ],
  });

  const position = geometry.getAttribute("position");
  if (!position || position.count < 64) {
    geometry.dispose();
    return null;
  }

  return {
    geometry,
    height: targetHeight,
    // A traced garment carries its own graphics in the photograph; a shader
    // print on top of that would be a second, fake one.
    print: { cx: 0, cy: 0, halfW: 0, halfH: 0 },
    bounds,
  };
}
