/**
 * Where every <Image> gets its pixels from.
 *
 * Product photographs are uploaded as full-size PNGs with an alpha channel —
 * the 3D model is traced from that alpha, so it has to be kept — and they run
 * 1.3 to 2.4 MB each. Showing every piece on the homepage meant forty of those
 * going through Next's own optimiser at once: slow to warm, capped on the free
 * hosting plan, and locally some simply timed out and rendered as broken
 * images.
 *
 * Cloudinary already holds the originals and resizes on request, which is the
 * thing it is built to do. So photographs are asked for at the width the
 * layout needs, in whatever format the browser accepts best (f_auto, which
 * keeps transparency), at automatic quality. A card-size photo arrives as a
 * few tens of kilobytes instead of two megabytes.
 *
 * The 3D fitting room does not come through here — it loads the original PNG
 * directly, because it needs the full-resolution alpha to trace from.
 *
 * Anything else — the site's own SVGs and local assets — is served as-is.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const marker = "/image/upload/";

  if (src.startsWith("https://res.cloudinary.com/") && src.includes(marker)) {
    const q = quality ? `q_${quality}` : "q_auto";
    // c_limit only ever shrinks: a small original is never upscaled into a
    // blurry large one.
    const transform = `f_auto,${q},w_${width},c_limit`;
    return src.replace(marker, `${marker}${transform}/`);
  }

  // Local files have no resizer behind them. The width is appended so each
  // size still gets a distinct URL, which next/image expects of a loader.
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
