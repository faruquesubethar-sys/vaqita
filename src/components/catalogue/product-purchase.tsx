"use client";

import { useMemo, useState, useTransition } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  priceCents: number | null;
};

/**
 * Colour and size selection plus add-to-bag.
 *
 * Sizes are shown for the chosen colour only, and sizes that do not exist in
 * that colour are omitted rather than shown disabled — a size that is
 * permanently unavailable in this colourway is noise, whereas one that is
 * merely out of stock is useful information and stays visible, struck through.
 */
export function ProductPurchase({
  variants,
  basePriceCents,
}: {
  variants: Variant[];
  basePriceCents: number;
}) {
  const { add } = useCart();
  const [isPending, startTransition] = useTransition();

  const colours = useMemo(() => {
    const seen = new Map<string, { color: string; colorHex: string }>();
    for (const v of variants) {
      if (!seen.has(v.color)) seen.set(v.color, { color: v.color, colorHex: v.colorHex });
    }
    return [...seen.values()];
  }, [variants]);

  // Default to the first colour that has anything in stock.
  const [colour, setColour] = useState(() => {
    const available = variants.find((v) => v.stock > 0);
    return available?.color ?? colours[0]?.color ?? "";
  });

  const sizesForColour = useMemo(
    () => variants.filter((v) => v.color === colour),
    [variants, colour],
  );

  const [variantId, setVariantId] = useState<string | null>(() => {
    const first = variants.find((v) => v.stock > 0);
    return first?.id ?? null;
  });

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const selectedIsValid = selected?.color === colour;

  const price = selected?.priceCents ?? basePriceCents;
  const isOneSize = sizesForColour.length === 1 && sizesForColour[0].size === "One Size";

  const handleColour = (next: string) => {
    setColour(next);
    // Carry the size across to the new colour when it exists there.
    const currentSize = selected?.size;
    const match =
      variants.find((v) => v.color === next && v.size === currentSize && v.stock > 0) ??
      variants.find((v) => v.color === next && v.stock > 0) ??
      null;
    setVariantId(match?.id ?? null);
  };

  const canAdd = selectedIsValid && (selected?.stock ?? 0) > 0;

  const onAdd = () => {
    if (!variantId || !canAdd) return;
    startTransition(async () => {
      await add(variantId, 1);
    });
  };

  return (
    <div className="mt-10">
      {colours.length > 1 && (
        <fieldset className="mb-8">
          <legend className="eyebrow mb-4">
            Colour — <span className="text-bone">{colour}</span>
          </legend>
          <div className="flex gap-3">
            {colours.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => handleColour(c.color)}
                aria-pressed={c.color === colour}
                aria-label={c.color}
                title={c.color}
                className={cn(
                  "relative h-9 w-9 rounded-full transition-all duration-500",
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

      {!isOneSize && (
        <fieldset className="mb-8">
          <legend className="eyebrow mb-4 flex w-full items-center justify-between">
            <span>
              Size{" "}
              {selectedIsValid && selected && (
                <span className="text-bone">— {selected.size}</span>
              )}
            </span>
          </legend>

          <div className="flex flex-wrap gap-2">
            {sizesForColour.map((v) => {
              const soldOut = v.stock <= 0;
              const isSelected = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-w-14 border px-4 py-3 text-xs tracking-wider transition-all duration-400",
                    isSelected
                      ? "border-brass bg-brass text-ink"
                      : "border-bone/20 text-stone hover:border-bone/55 hover:text-alabaster",
                    soldOut &&
                      "cursor-not-allowed border-bone/8 text-smoke/45 line-through hover:border-bone/8 hover:text-smoke/45",
                  )}
                >
                  {v.size}
                </button>
              );
            })}
          </div>

          {/* Scarcity, but only when it is true. */}
          {selectedIsValid && selected && selected.stock > 0 && selected.stock <= 3 && (
            <p className="mt-4 text-xs text-brass-lit">
              {selected.stock === 1
                ? "Last one in this size."
                : `Only ${selected.stock} left in this size.`}
            </p>
          )}
        </fieldset>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd || isPending}
        className={cn(
          "group relative w-full overflow-hidden border px-8 py-5 text-xs uppercase tracking-[0.24em] transition-colors duration-500",
          canAdd
            ? "border-brass bg-brass text-ink hover:bg-transparent hover:text-brass-lit"
            : "cursor-not-allowed border-bone/12 text-smoke",
        )}
      >
        {isPending
          ? "Adding…"
          : canAdd
            ? `Add to bag — ${formatMoney(price)}`
            : "Sold out"}
      </button>

      <p className="mt-5 text-xs leading-relaxed text-smoke">
        Free shipping over ₹2,500 · Seven-day returns, tags on and unworn ·
        Stock comes in one of each size, so a return is refunded rather than
        exchanged — we will not have another.
      </p>
    </div>
  );
}
