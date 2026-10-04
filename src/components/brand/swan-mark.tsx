import { cn } from "@/lib/utils";

/**
 * The VAQITA house mark — a folded swan.
 *
 * Traced from the same photograph of the brooch as the 3D mark in the hero,
 * and coloured from the same samples, so the logo in the header is the same
 * object the visitor is about to watch assemble itself.
 *
 * It was not. The logo kept an earlier hand-drawn swan — blocky head, neck
 * twice its real thickness — in bright mint green, long after the 3D one had
 * been rebuilt from measurements. Side by side they read as two different
 * birds.
 *
 * Flat facets rather than curves, so it stays crisp at favicon size and
 * matches the folded-paper logic of the physical piece.
 *
 * `id` must be unique per instance. SVG gradient ids are global to the
 * document, so two marks on one page sharing an id would make the second
 * inherit the first one's fill.
 */
export function SwanMark({
  className,
  id = "swan",
  title,
}: {
  className?: string;
  id?: string;
  title?: string;
}) {
  const gold = `${id}-gold`;
  const goldEdge = `${id}-gold-edge`;
  const green = `${id}-green`;
  const eye = `${id}-eye`;

  return (
    <svg
      viewBox="30 -6 190 212"
      className={cn(className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      <defs>
        {/* Warmer than the sampled #bea489, to match the 3D mark.

            The sample is faithful to a photograph of the piece on white
            paper, where the metal picks up the paper and reads pale. Against
            this page's near-black it goes chalky and stops looking like gold,
            so both marks are warmed the same way rather than one being
            correct and the other looking right. */}
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9ae" />
          <stop offset="32%" stopColor="#efc563" />
          <stop offset="70%" stopColor="#d9a441" />
          <stop offset="100%" stopColor="#8c6422" />
        </linearGradient>

        <linearGradient id={goldEdge} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8c6422" />
          <stop offset="50%" stopColor="#ffe9ae" />
          <stop offset="100%" stopColor="#c99233" />
        </linearGradient>

        {/* Forest inlay, lifted a step from the #3b4f44 measured off the
            brooch.

            The photograph has the piece on white paper, where that value
            reads as dark green. Here the mark sits on near-black, and at
            header size the panels stopped reading as inlay and started
            reading as holes punched in the gold. A logo needs more contrast
            than a large render of the same object. */}
        <linearGradient id={green} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6f8a78" />
          <stop offset="55%" stopColor="#52705f" />
          <stop offset="100%" stopColor="#3b4f44" />
        </linearGradient>

        {/* The one cut stone on the piece, and the only saturated thing on it. */}
        <linearGradient id={eye} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1fbd7e" />
          <stop offset="45%" stopColor="#0d764e" />
          <stop offset="100%" stopColor="#064c33" />
        </linearGradient>
      </defs>

      {/* The body: one traced outline, not two drawn shapes. */}
      <path d="M84.9 0 L61.3 13.7 L42.2 62.6 L46 76.3 L74.2 59.5 L87.2 70.2 L49.8 109.9 L40.6 161.8 L72.7 198.5 L152.9 196.2 L209.4 136.6 L190.3 130.5 L210.1 94.7 L210.1 3.8 L88.7 116.8 L125.4 58.8 L124.6 25.2 L114.7 36.6 Z" fill={`url(#${gold})`} />

      {/* The green inlays. */}
      <path d="M203.2 14.5 L153.6 64.1 L138.4 100.8 L204.8 35.9 Z" fill={`url(#${green})`} />
      <path d="M194.8 56.5 L136.1 113 L126.9 133.6 L181.9 92.4 Z" fill={`url(#${green})`} />
      <path d="M204.8 86.3 L187.2 100 L178.1 124.4 L184.2 122.1 L198.7 108.4 Z" fill={`url(#${green})`} />
      <path d="M204.8 51.9 L194.1 83.2 L204.8 73.3 Z" fill={`url(#${green})`} />
      <path d="M193.3 142 L171.2 142.7 L158.2 167.9 L164.3 171 Z" fill={`url(#${green})`} />
      <path d="M158.2 144.3 L136.1 148.9 L131.5 151.9 L150.6 162.6 Z" fill={`url(#${green})`} />
      <path d="M90.3 134.4 L84.2 167.2 L107.1 148.1 Z" fill={`url(#${green})`} />
      <path d="M110.1 109.2 L104 113 L94.8 125.2 L110.9 138.2 Z" fill={`url(#${green})`} />

      {/* The folds. Without them the neck is a smooth tapering tube, which
          reads as a snake rather than a bird. Ten of the longest only — all
          twenty-six would be mud at header size. */}
      <g
        stroke={`url(#${goldEdge})`}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      >
        <path d="M102.5 143.5 L181.1 64.9" />
        <path d="M121.6 140.5 L193.3 84.7" />
        <path d="M82.6 175.6 L168.1 175.6" />
        <path d="M107.8 143.5 L165.8 84" />
        <path d="M148.3 93.1 L206.3 35.1" />
        <path d="M54.4 123.7 L102.5 68.7" />
        <path d="M159 179.4 L200.2 138.2" />
        <path d="M105.5 113 L146 153.4" />
        <path d="M138.4 113 L178.1 72.5" />
        <path d="M112.4 142.7 L155.2 171.8" />
      </g>

      {/* The eye. */}
      <path d="M55.2 35.9 L58.2 41.2 L65.8 41.2 L69.7 45.8 L72.7 43.5 L69.7 32.1 L66.6 29.8 L60.5 31.3 Z" fill={`url(#${eye})`} />

      {/* A few specks of the glitter in the real gold. */}
      <g fill="#ffe9ae" opacity="0.7">
        <circle cx="168" cy="92" r="1.4" />
        <circle cx="120" cy="150" r="1.2" />
        <circle cx="72" cy="120" r="1.2" />
        <circle cx="196" cy="48" r="1.3" />
        <circle cx="150" cy="176" r="1.2" />
      </g>
    </svg>
  );
}

/** Mark plus wordmark, for the header and footer. */
export function SwanLogo({
  className,
  markClassName,
  id = "swan-logo",
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  id?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <SwanMark id={id} className={cn("h-7 w-auto shrink-0", markClassName)} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "display text-alabaster transition-all duration-700",
            compact ? "text-lg tracking-[0.3em]" : "text-xl tracking-[0.38em]",
          )}
        >
          VAQITA
        </span>
        <span
          className={cn(
            "mt-1 text-[0.5rem] uppercase tracking-[0.34em] text-stone transition-opacity duration-500",
            compact && "opacity-0",
          )}
        >
          Mens Fashion Hub
        </span>
      </span>
    </span>
  );
}
