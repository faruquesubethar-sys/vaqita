"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { GarmentType } from "@/components/tryon/garment-geometry";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

// WebGL only loads when someone actually asks to try something on.
const GarmentViewer = dynamic(
  () => import("./garment-viewer").then((m) => m.GarmentViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> },
);

function ViewerSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-px w-32 overflow-hidden bg-bone/12">
        <div className="h-px w-1/3 animate-[vq-load_1.4s_ease-in-out_infinite] bg-brass" />
      </div>
      <style>{`@keyframes vq-load{0%{transform:translateX(-120%)}100%{transform:translateX(420%)}}`}</style>
    </div>
  );
}

export type TryItVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  priceCents: number | null;
};

export type TryItProps = {
  productName: string;
  garmentType: string;
  printStyle: string;
  /** Optional product photograph projected onto the 3D garment. */
  textureUrl?: string | null;
  basePriceCents: number;
  variants: TryItVariant[];
  /** Stable per product, so the print texture does not reshuffle. */
  seed: number;
};

function asGarmentType(value: string): GarmentType {
  const allowed: GarmentType[] = ["TEE", "LONG_SLEEVE", "SHIRT", "TANK", "HOODIE"];
  return allowed.includes(value as GarmentType) ? (value as GarmentType) : "TEE";
}

/**
 * The try-on button plus its full-screen viewer.
 *
 * Deliberately a separate control from "add to bag": trying something on is a
 * browsing action, and forcing a size choice before someone can look at the
 * garment is the fastest way to lose them.
 */
export function TryIt({
  productName,
  garmentType,
  printStyle,
  textureUrl,
  basePriceCents,
  variants,
  seed,
  label = "Try it on",
  className,
}: TryItProps & { label?: string; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative overflow-hidden border border-bone/25 px-8 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors duration-500 hover:border-brass",
          className,
        )}
      >
        <span className="absolute inset-0 -z-10 translate-y-full bg-brass transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
        <span className="flex items-center justify-center gap-2.5 transition-colors duration-500 group-hover:text-ink">
          <CubeIcon />
          {label}
        </span>
      </button>

      {open && (
        <Portal>
          <TryItOverlay
            productName={productName}
            garmentType={garmentType}
            printStyle={printStyle}
            textureUrl={textureUrl}
            basePriceCents={basePriceCents}
            variants={variants}
            seed={seed}
            onClose={() => setOpen(false)}
          />
        </Portal>
      )}
    </>
  );
}

/**
 * Renders into document.body.
 *
 * A `position: fixed` element is positioned relative to the nearest ancestor
 * with a transform, filter or perspective — not the viewport. Product cards
 * translate on hover, so without this the full-screen fitting room would be
 * trapped inside a 200px card. Mounting is gated on an effect because
 * document.body does not exist during the server render.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function CubeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M3 7l9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function TryItOverlay({
  productName,
  garmentType,
  printStyle,
  textureUrl,
  basePriceCents,
  variants,
  seed,
  onClose,
}: TryItProps & { onClose: () => void }) {
  const { add } = useCart();
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const colours = useMemo(() => {
    const seen = new Map<string, { color: string; colorHex: string }>();
    for (const v of variants) {
      if (!seen.has(v.color)) seen.set(v.color, { color: v.color, colorHex: v.colorHex });
    }
    return [...seen.values()];
  }, [variants]);

  const [colour, setColour] = useState(
    () => variants.find((v) => v.stock > 0)?.color ?? colours[0]?.color ?? "",
  );
  const [variantId, setVariantId] = useState<string | null>(
    () => variants.find((v) => v.stock > 0)?.id ?? null,
  );
  const [added, setAdded] = useState(false);

  const sizes = useMemo(
    () => variants.filter((v) => v.color === colour),
    [variants, colour],
  );

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const validSelection = selected?.color === colour;
  const activeHex =
    colours.find((c) => c.color === colour)?.colorHex ?? colours[0]?.colorHex ?? "#888";
  const price = selected?.priceCents ?? basePriceCents;
  const canAdd = validSelection && (selected?.stock ?? 0) > 0;

  // Escape closes, and the body must not scroll behind a full-screen overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleColour = (next: string) => {
    setColour(next);
    const currentSize = selected?.size;
    const match =
      variants.find((v) => v.color === next && v.size === currentSize && v.stock > 0) ??
      variants.find((v) => v.color === next && v.stock > 0) ??
      null;
    setVariantId(match?.id ?? null);
  };

  const onAdd = () => {
    if (!variantId || !canAdd) return;
    startTransition(async () => {
      await add(variantId, 1);
      setAdded(true);
    });
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Try on ${productName}`}
      className="animate-fade-up fixed inset-0 z-90 flex flex-col bg-ink/97 backdrop-blur-xl focus:outline-none"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-bone/10 px-[var(--shell-x)] py-5">
        <div>
          <p className="eyebrow text-brass-lit">Fitting room</p>
          <h2 className="display mt-1 text-2xl text-alabaster">{productName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-[0.2em] text-stone transition-colors hover:text-alabaster"
        >
          Close
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_22rem]">
        {/* Stage */}
        <div className="relative min-h-[46vh]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_38%,#1b1d22_0%,#0d0d10_58%,#08080a_100%)]"
          />
          <GarmentViewer
            garmentType={asGarmentType(garmentType)}
            colorHex={activeHex}
            printStyle={printStyle}
            textureUrl={textureUrl}
            seed={seed}
            className="absolute inset-0"
          />
          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[0.625rem] uppercase tracking-[0.24em] text-smoke">
            Drag to turn · scroll to zoom
          </p>
        </div>

        {/* Controls */}
        <aside className="min-h-0 overflow-y-auto border-t border-bone/10 px-[var(--shell-x)] py-7 lg:border-l lg:border-t-0 lg:px-8">
          {colours.length > 1 && (
            <fieldset className="mb-8">
              <legend className="eyebrow mb-4">
                Colour — <span className="text-bone">{colour}</span>
              </legend>
              <div className="flex flex-wrap gap-3">
                {colours.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => handleColour(c.color)}
                    aria-pressed={c.color === colour}
                    aria-label={c.color}
                    title={c.color}
                    className={cn(
                      "h-9 w-9 rounded-full transition-all duration-500",
                      c.color === colour
                        ? "ring-1 ring-brass ring-offset-4 ring-offset-ink"
                        : "ring-1 ring-bone/20 hover:ring-bone/50",
                    )}
                    style={{ backgroundColor: c.colorHex }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="mb-8">
            <legend className="eyebrow mb-4">
              Size{" "}
              {validSelection && selected && (
                <span className="text-bone">— {selected.size}</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => {
                const soldOut = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => {
                      setVariantId(v.id);
                      setAdded(false);
                    }}
                    aria-pressed={v.id === variantId}
                    className={cn(
                      "min-w-13 border px-4 py-3 text-xs tracking-wider transition-all duration-300",
                      v.id === variantId
                        ? "border-brass bg-brass text-ink"
                        : "border-bone/20 text-stone hover:border-bone/55 hover:text-alabaster",
                      soldOut &&
                        "cursor-not-allowed border-bone/8 text-smoke/45 line-through hover:border-bone/8",
                    )}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>
            {validSelection && selected && selected.stock > 0 && selected.stock <= 3 && (
              <p className="mt-4 text-xs text-brass-lit">
                {selected.stock === 1
                  ? "Last one — single piece."
                  : `Only ${selected.stock} left.`}
              </p>
            )}
          </fieldset>

          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd || isPending}
            className={cn(
              "w-full border px-8 py-4 text-xs uppercase tracking-[0.24em] transition-colors duration-500",
              canAdd
                ? "border-brass bg-brass text-ink hover:bg-transparent hover:text-brass-lit"
                : "cursor-not-allowed border-bone/12 text-smoke",
            )}
          >
            {isPending
              ? "Adding…"
              : added
                ? "Added — add another?"
                : canAdd
                  ? `Add to bag — ${formatMoney(price)}`
                  : "Sold out"}
          </button>

          <p className="mt-6 text-xs leading-relaxed text-smoke">
            {textureUrl
              ? "The garment's own photograph is mapped onto this cut, so what you see is the real cloth on the real pattern."
              : "This is a true-to-pattern render of the cut, not a photograph. Colour is matched to the garment but will shift a little with your screen."}
          </p>
        </aside>
      </div>
    </div>
  );
}
