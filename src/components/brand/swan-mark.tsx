import { cn } from "@/lib/utils";

/**
 * The VAQITA house mark — a folded swan.
 *
 * Built as flat facets rather than curves so it stays crisp at favicon size and
 * matches the folded-paper logic of the physical mark: a gold body, dark green
 * inset panels where the paper turns away from the light, and an emerald eye.
 *
 * `id` must be unique per instance. SVG gradient ids are global to the
 * document, so two marks on one page with the same id would make the second
 * one inherit the first one's fill.
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
      viewBox="0 0 250 200"
      className={cn(className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF2B8" />
          <stop offset="28%" stopColor="#E5C158" />
          <stop offset="68%" stopColor="#B08D57" />
          <stop offset="100%" stopColor="#7A5C33" />
        </linearGradient>

        <linearGradient id={goldEdge} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8C6836" />
          <stop offset="50%" stopColor="#F5DB94" />
          <stop offset="100%" stopColor="#AA854B" />
        </linearGradient>

        {/* Vibrant emerald diamond jewel gradient matching the reference brooch */}
        <linearGradient id={green} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="35%" stopColor="#059669" />
          <stop offset="75%" stopColor="#046342" />
          <stop offset="100%" stopColor="#023b26" />
        </linearGradient>

        {/* Sparkling faceted emerald cut diamond eye */}
        <linearGradient id={eye} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="75%" stopColor="#059669" />
          <stop offset="100%" stopColor="#044e34" />
        </linearGradient>
      </defs>

      {/* Body wedge */}
      <path
        d="M96 150 L150 177 L206 154 L232 118 L210 32 L120 128 Z"
        fill={`url(#${gold})`}
      />

      {/* Head, neck and beak — 100% solid folded gold matching the reference image */}
      <path
        d="M20 98 L58 78 L54 56 L96 42 L122 74 L118 126 L136 158 L104 160 L88 124 L86 98 L54 106 Z"
        fill={`url(#${gold})`}
      />

      {/* Inset emerald diamond panels on the wings */}
      <path d="M128 122 L198 42 L206 72 L146 128 Z" fill={`url(#${green})`} />
      <path d="M141 131 L196 62 L206 99 L162 144 Z" fill={`url(#${green})`} />
      <path d="M121 152 L159 150 L189 147 L151 172 Z" fill={`url(#${green})`} />
      <path d="M200 104 L212 72 L220 110 L206 128 Z" fill={`url(#${green})`} />

      {/* Fold lines and gold ribs */}
      <g stroke={`url(#${goldEdge})`} strokeWidth="2.2" strokeLinecap="round">
        <path d="M120 128 L210 32" />
        <path d="M96 150 L206 154" />
        <path d="M150 177 L163 143" />
        <path d="M86 98 L118 104" />
        <path d="M54 56 L86 98" />
        <path d="M96 42 L88 76" />
        <path d="M118 126 L136 158" />
      </g>

      {/* Faceted emerald diamond eye */}
      <path d="M66 62 L84 58 L88 74 L70 78 Z" fill={`url(#${eye})`} />
      <path
        d="M66 62 L84 58 L88 74 L70 78 Z"
        stroke="#10b981"
        strokeWidth="1.2"
        opacity="0.85"
      />
      {/* Gemstone table facet glint */}
      <polygon points="70,64 80,61 82,71 72,74" fill="#a7f3d0" opacity="0.6" />

      {/* Specular stardust glitter on gold facets */}
      <g fill="#FFFDF0" opacity="0.75">
        <circle cx="168" cy="92" r="1.5" />
        <circle cx="187" cy="120" r="1.2" />
        <circle cx="131" cy="148" r="1.4" />
        <circle cx="104" cy="118" r="1.2" />
        <circle cx="74" cy="92" r="1.3" />
        <circle cx="216" cy="62" r="1.4" />
        <circle cx="196" cy="42" r="1.2" />
        <circle cx="48" cy="80" r="1.1" />
        <circle cx="112" cy="68" r="1.2" />
        <circle cx="145" cy="165" r="1.3" />
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
