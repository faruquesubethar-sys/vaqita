/**
 * Turns an uploaded product photo into something the 3D viewer can use.
 *
 * This runs in the browser, before upload, on purpose:
 *
 *  - It needs a canvas to read pixels, and doing it client-side avoids adding
 *    a native image library (sharp, canvas) to the server — those are the two
 *    dependencies most likely to break a deploy.
 *  - The admin sees the detected colourway immediately and can correct it,
 *    rather than uploading and waiting to find out what the server guessed.
 *
 * What it does, in order: find the background from the corners, trim to the
 * garment's bounding box, and take the dominant colour of what is left.
 */

export type ExtractedImage = {
  /** The trimmed image, ready to upload. Keeps alpha when the source had it. */
  blob: Blob;
  /** Dominant garment colour, as #rrggbb. */
  colorHex: string;
  /** A short human label, e.g. "Deep Olive". */
  colorName: string;
  width: number;
  height: number;
  /** Data URL for an immediate preview, before anything is uploaded. */
  previewUrl: string;
  /**
   * Whether the image carries a real cut-out.
   *
   * This is what decides the quality of the 3D: with a transparent background
   * the mesh is traced from this garment's own outline and matches it exactly.
   * Without one there is nothing to trace, and the photo is laid over a generic
   * mesh of the right type instead.
   */
  hasCutout: boolean;
};

const MAX_EDGE = 1024;

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A rough, readable name for a colour.
 *
 * Deliberately coarse — it is a starting point the admin will usually rename,
 * not an attempt at a paint chart.
 */
function nameFor(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255));

  const tone = l < 0.18 ? "Deep" : l < 0.4 ? "Dark" : l < 0.62 ? "" : l < 0.82 ? "Light" : "Pale";

  if (sat < 0.12) {
    const grey = l < 0.15 ? "Black" : l < 0.35 ? "Charcoal" : l < 0.6 ? "Grey" : l < 0.85 ? "Stone" : "White";
    return tone && grey !== "Black" && grey !== "White" ? `${tone} ${grey}` : grey;
  }

  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;

  const family =
    hue < 15 ? "Red"
    : hue < 40 ? "Rust"
    : hue < 62 ? "Ochre"
    : hue < 90 ? "Olive"
    : hue < 160 ? "Green"
    : hue < 200 ? "Teal"
    : hue < 250 ? "Blue"
    : hue < 290 ? "Indigo"
    : hue < 330 ? "Plum"
    : "Oxblood";

  return tone ? `${tone} ${family}` : family;
}

/** Squared distance in RGB — cheap and good enough for background matching. */
function dist2(a: number[], b: number[]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export async function extractFromFile(file: File): Promise<ExtractedImage> {
  const bitmap = await createImageBitmap(file);

  // Cap the working size: a 6000px phone photo costs seconds to scan and adds
  // nothing, since this ends up as a texture on a small mesh.
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read the image — canvas is unavailable.");

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, w, h);
  const at = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  /**
   * An alpha channel, when the file has one, is used instead of guessing.
   *
   * Deriving the background from corner colours fails in both directions and
   * there is no threshold that fixes both: a white tee on a white sweep has no
   * boundary to find, and a dark tee on grey concrete barely has one. If the
   * uploaded file already says which pixels are garment, believe it.
   */
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const hasAlpha = corners.some((p) => p[3] < 240);

  const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / corners.length);

  // Tolerance scales with how noisy the corners are, so a clean studio white
  // trims tightly while a mottled backdrop still gets removed.
  const spread = Math.max(...corners.map((p) => dist2(p, bg)));
  const tolerance = Math.max(900, spread * 2.2);

  /** True when this pixel belongs to the garment. */
  const isGarment = (px: number[]) =>
    hasAlpha ? px[3] > 24 : px[3] >= 24 && dist2(px, bg) >= tolerance;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  // Colour accumulation, weighted toward saturated pixels: a garment's
  // identity is its hue, and averaging in every dull shadow pixel drags any
  // colour toward grey.
  let rs = 0;
  let gs = 0;
  let bs = 0;
  let weight = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = at(x, y);
      if (!isGarment(px)) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const max = Math.max(px[0], px[1], px[2]);
      const min = Math.min(px[0], px[1], px[2]);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (max + min) / 2;
      // Ignore near-black and near-white; both are usually shadow or highlight
      // rather than the cloth's actual colour.
      if (lum < 12 || lum > 245) continue;

      const wgt = 0.35 + sat;
      rs += px[0] * wgt;
      gs += px[1] * wgt;
      bs += px[2] * wgt;
      weight += wgt;
    }
  }

  // Nothing separable from the background — fall back to the whole frame.
  if (maxX < 0 || weight === 0) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }

  const r = weight > 0 ? rs / weight : bg[0];
  const g = weight > 0 ? gs / weight : bg[1];
  const b = weight > 0 ? bs / weight : bg[2];

  // Pad the crop slightly so the trim never clips a sleeve edge.
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad + 1) - cx;
  const ch = Math.min(h, maxY + pad + 1) - cy;

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Could not crop the image.");
  octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

  // Nothing further is done to a file that arrived with alpha: re-cutting it
  // by colour would undo a mask that is already correct.

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not encode the image."))),
      "image/png",
    );
  });

  return {
    blob,
    colorHex: toHex(r, g, b),
    colorName: nameFor(r, g, b),
    width: cw,
    height: ch,
    previewUrl: out.toDataURL("image/png"),
    hasCutout: hasAlpha,
  };
}
