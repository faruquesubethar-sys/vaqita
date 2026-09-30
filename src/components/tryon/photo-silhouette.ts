/**
 * Reads a garment's outline out of its own photograph.
 *
 * The 3D preview used to project a photo of *your* tee onto *a generic* tee
 * mesh. No two garments are cut alike — a boxy 240gsm tee and a slim polo have
 * different shoulder slope, sleeve angle and body taper — so the photo never
 * sat where the cloth was, and the fit always read as "close, but not it".
 *
 * If the uploaded image has a transparent background, it already describes the
 * exact outline of that exact garment. This module turns that alpha channel
 * into a clean binary mask; `buildGarmentFromMask` then meshes it. Mesh and
 * photograph end up sharing one silhouette, so the mapping between them is the
 * identity and the fit is exact by construction.
 */

export type SilhouetteMask = {
  /** 1 inside the garment, 0 outside. Row 0 is the TOP of the photograph. */
  data: Uint8Array;
  width: number;
  height: number;
  /** Fraction of the frame the garment fills. */
  coverage: number;
  /**
   * The garment's dominant cloth colour, as #rrggbb.
   *
   * Used for the back of the mesh. Only the front carries the photograph, and
   * without this a cream tee turns charcoal the moment you rotate it.
   */
  clothHex: string;
};

export type SilhouetteFailure =
  | "no-alpha" // a JPEG, or a PNG that was flattened onto a background
  | "too-small" // a speck, not a garment
  | "unreadable"; // canvas unavailable or the pixels could not be read

export type SilhouetteResult =
  | { ok: true; mask: SilhouetteMask }
  | { ok: false; reason: SilhouetteFailure };

/**
 * Extracts the mask.
 *
 * The image is downsampled first: a 2000px photo carries no more silhouette
 * information than a 200px one, and every pass below is O(w·h).
 */
export function silhouetteFromImage(
  image: CanvasImageSource & { width?: number; height?: number },
  maxSize = 220,
): SilhouetteResult {
  const srcW = Number((image as HTMLImageElement).naturalWidth || image.width);
  const srcH = Number((image as HTMLImageElement).naturalHeight || image.height);
  if (!srcW || !srcH) return { ok: false, reason: "unreadable" };

  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const width = Math.max(8, Math.round(srcW * scale));
  const height = Math.max(8, Math.round(srcH * scale));

  let pixels: Uint8ClampedArray;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { ok: false, reason: "unreadable" };
    ctx.drawImage(image, 0, 0, width, height);
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // A cross-origin image taints the canvas. Uploads are same-origin, so this
    // only happens for a texture pointed at another host.
    return { ok: false, reason: "unreadable" };
  }

  const count = width * height;
  const mask = new Uint8Array(count);
  let inside = 0;
  let opaque = 0;

  for (let i = 0; i < count; i++) {
    const a = pixels[i * 4 + 3];
    if (a > 128) {
      mask[i] = 1;
      inside++;
    }
    if (a > 250) opaque++;
  }

  // A photo with no cut-out is opaque edge to edge; meshing it would produce a
  // rectangle. Fall back to the parametric garment instead.
  if (opaque / count > 0.985) return { ok: false, reason: "no-alpha" };
  if (inside / count < 0.02) return { ok: false, reason: "too-small" };

  fillInteriorHoles(mask, width, height);
  const kept = keepLargestComponent(mask, width, height);
  if (kept / count < 0.02) return { ok: false, reason: "too-small" };

  return {
    ok: true,
    mask: {
      data: mask,
      width,
      height,
      coverage: kept / count,
      clothHex: dominantColour(mask, pixels, width, height),
    },
  };
}

/**
 * The most common colour inside the garment.
 *
 * A mean would be dragged toward whatever is printed on the chest — average a
 * white tee with a big black graphic and you get grey. The mode of a coarse
 * histogram returns the cloth itself, because the cloth is simply the largest
 * area. Pixels within two cells of the outline are skipped: they carry the
 * background's colour fringe from whatever cut the image out.
 */
function dominantColour(
  mask: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  const BINS = 12;
  const counts = new Int32Array(BINS * BINS * BINS);
  const sums = new Float64Array(BINS * BINS * BINS * 3);

  const interior = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= height) return false;
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= width || !mask[yy * width + xx]) return false;
      }
    }
    return true;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i] || !interior(x, y)) continue;
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const bin =
        (Math.min(BINS - 1, (r * BINS) / 256) | 0) * BINS * BINS +
        (Math.min(BINS - 1, (g * BINS) / 256) | 0) * BINS +
        (Math.min(BINS - 1, (b * BINS) / 256) | 0);
      counts[bin]++;
      sums[bin * 3] += r;
      sums[bin * 3 + 1] += g;
      sums[bin * 3 + 2] += b;
    }
  }

  let best = -1;
  let bestCount = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > bestCount) {
      bestCount = counts[i];
      best = i;
    }
  }
  if (best < 0) return "#b9b3a6";

  // Average within the winning bin rather than taking its centre, so the
  // result is the actual colour and not a quantised approximation of it.
  const hex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v / bestCount)))
      .toString(16)
      .padStart(2, "0");

  return `#${hex(sums[best * 3])}${hex(sums[best * 3 + 1])}${hex(sums[best * 3 + 2])}`;
}

/**
 * Marks any background pocket that cannot reach the frame edge as garment.
 *
 * A soft print or a semi-transparent wash can leave holes in the alpha channel.
 * Left alone, each one becomes a literal hole in the mesh. Anything enclosed by
 * cloth is cloth — only background connected to the border is really background.
 */
function fillInteriorHoles(mask: Uint8Array, width: number, height: number) {
  const reached = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;

  const seed = (i: number) => {
    if (!mask[i] && !reached[i]) {
      reached[i] = 1;
      queue[tail++] = i;
    }
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (y > 0) seed(i - width);
    if (y < height - 1) seed(i + width);
  }

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] && !reached[i]) mask[i] = 1;
  }
}

/**
 * Drops every blob but the biggest, and returns its area.
 *
 * Background removal usually leaves a few stray pixels — a hanger hook, a shadow
 * edge, JPEG ringing. Each survivor would be meshed as its own floating scrap.
 */
function keepLargestComponent(mask: Uint8Array, width: number, height: number): number {
  const label = new Int32Array(mask.length).fill(-1);
  const queue = new Int32Array(mask.length);
  let best = -1;
  let bestSize = 0;
  let next = 0;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start] >= 0) continue;

    const id = next++;
    let head = 0;
    let tail = 0;
    label[start] = id;
    queue[tail++] = start;
    let size = 0;

    while (head < tail) {
      const i = queue[head++];
      size++;
      const x = i % width;
      const y = (i / width) | 0;
      const push = (j: number) => {
        if (mask[j] && label[j] < 0) {
          label[j] = id;
          queue[tail++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      if (y > 0) push(i - width);
      if (y < height - 1) push(i + width);
    }

    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && label[i] !== best) mask[i] = 0;
  }
  return bestSize;
}
