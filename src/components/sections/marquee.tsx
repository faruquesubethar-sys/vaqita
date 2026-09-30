const ITEMS = [
  "Hand graded",
  "Single-stitch hems",
  "Deadstock, never issued",
  "240gsm tubular cotton",
  "Small-lot reactive dye",
  "Triple-stitched seams",
  "Try every piece in 3D",
  "One owner before you",
];

/**
 * A running band of material credentials.
 *
 * The track is duplicated and translated by exactly -50%, so the second copy
 * lands where the first began and the loop has no visible seam.
 */
export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-bone/10 py-5">
      <div className="marquee-track flex w-max items-center gap-16 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-16" aria-hidden={copy === 1}>
            {ITEMS.map((item) => (
              <span
                key={item}
                className="flex items-center gap-16 text-[0.6875rem] uppercase tracking-[0.28em] text-smoke"
              >
                {item}
                <span className="inline-block h-1 w-1 rotate-45 bg-brass" />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Feathered edges, so words enter and leave rather than being clipped. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
