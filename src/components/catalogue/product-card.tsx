import Image from "next/image";
import Link from "next/link";

import { TryIt } from "@/components/tryon/try-it";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  slug: string;
  name: string;
  subtitle: string | null;
  priceCents: number;
  compareAtCents: number | null;
  garmentType: string;
  graphicStyle: string;
  textureUrl: string | null;
  textureBackUrl: string | null;
  images: { url: string; alt: string | null }[];
  variants: {
    id: string;
    size: string;
    color: string;
    colorHex: string;
    stock: number;
    priceCents: number | null;
  }[];
  collection?: { name: string } | null;
};

/** Prisma include shared by every page that renders a card. */
export const productCardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 2 },
  variants: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      size: true,
      color: true,
      colorHex: true,
      stock: true,
      priceCents: true,
    },
  },
};

function seedFromSlug(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 997;
  return h;
}

export function ProductCard({
  product,
  priority = false,
  index = 0,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  index?: number;
  className?: string;
}) {
  const [primary, secondary] = product.images;

  // One swatch per colourway, not per variant — a product with five sizes in
  // two colours should show two dots, not ten.
  const colours = Array.from(
    new Map(product.variants.map((v) => [v.color, v])).values(),
  );

  const inStock = product.variants.some((v) => v.stock > 0);
  const onSale =
    product.compareAtCents !== null && product.compareAtCents > product.priceCents;

  return (
    <article className={cn("group/card", className)}>
      {/* The link and the try-on button are siblings. Nesting a button inside
          an anchor is invalid, and it breaks keyboard activation on both. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-graphite">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0"
          aria-label={product.name}
        >
          {primary && (
            <Image
              src={primary.url}
              alt={primary.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              priority={priority}
              className={cn(
                "object-cover transition-all duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)]",
                secondary
                  ? "group-hover/card:opacity-0"
                  : "group-hover/card:scale-105",
              )}
            />
          )}

          {secondary && (
            <Image
              src={secondary.url}
              alt={secondary.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              className="object-cover opacity-0 transition-all duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:scale-105 group-hover/card:opacity-100"
            />
          )}

          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 transition-opacity duration-1000 group-hover/card:opacity-100" />
        </Link>

        {onSale && (
          <span className="pointer-events-none absolute left-4 top-4 bg-brass px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.2em] text-ink">
            Graded price
          </span>
        )}
        {!inStock && (
          <span className="pointer-events-none absolute left-4 top-4 border border-bone/30 bg-ink/70 px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.2em] text-stone backdrop-blur-sm">
            Sold out
          </span>
        )}

        {/* Try-on, revealed on hover and always reachable by keyboard. */}
        {inStock && (
          <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
            <TryIt
              className="w-full !py-3 bg-ink/70 backdrop-blur-sm"
              label="Try it on"
              productName={product.name}
              garmentType={product.garmentType}
              printStyle={product.graphicStyle}
              textureUrl={product.textureUrl}
              textureBackUrl={product.textureBackUrl}
              basePriceCents={product.priceCents}
              seed={seedFromSlug(product.slug)}
              variants={product.variants}
            />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 pt-5">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-alabaster transition-colors duration-500 group-hover/card:text-brass-lit">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          {product.subtitle && (
            <p className="mt-1 truncate text-xs text-smoke">{product.subtitle}</p>
          )}

          {colours.length > 1 && (
            <div className="mt-3 flex gap-1.5">
              {colours.map((c) => (
                <span
                  key={c.color}
                  title={c.color}
                  className="block h-2 w-2 rounded-full ring-1 ring-bone/25"
                  style={{ backgroundColor: c.colorHex }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="foil text-sm tabular-nums">
            {formatMoney(product.priceCents)}
          </p>
          {onSale && (
            <p className="text-xs tabular-nums text-smoke line-through">
              {formatMoney(product.compareAtCents!)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
