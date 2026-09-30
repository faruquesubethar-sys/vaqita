import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProductCard,
  productCardInclude,
} from "@/components/catalogue/product-card";
import { ProductGallery } from "@/components/catalogue/product-gallery";
import { ProductPurchase } from "@/components/catalogue/product-purchase";
import { TryIt } from "@/components/tryon/try-it";
import { Reveal } from "@/components/motion/reveal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

/**
 * Rendered per request, never prerendered.
 *
 * This page reads cookies (session and cart) while rendering, so it cannot be
 * a static page — and it must say so rather than letting Next infer it.
 *
 * Inference got this wrong in production and returned 500 for every product.
 * The catalogue was empty when the site was built, so `generateStaticParams`
 * produced nothing, no product page was ever rendered during the build, and
 * the `cookies()` call was never observed. Next marked the route static. The
 * first real request then tried to statically render a product, hit
 * `cookies()`, and threw — a failure that could not happen locally, because
 * by then the catalogue had a product in it and the build saw the truth.
 *
 * Stock is also per-piece here: most of this shop is one-of-a-kind, so an
 * hour of cached HTML would keep offering something already sold.
 */
export const dynamic = "force-dynamic";

/** Stable per-product number, so the print crackle never reshuffles. */
function seedFromSlug(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 997;
  return h;
}

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
      collection: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} · VAQITA`,
      description: product.description,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await db.product.findMany({
    where: {
      status: "ACTIVE",
      collectionId: product.collectionId,
      NOT: { id: product.id },
    },
    include: {
      ...productCardInclude,
    },
    take: 3,
  });

  const details = [
    { label: "Composition", value: product.composition },
    { label: "Fit", value: product.fit },
    { label: "Origin", value: product.madeIn },
    { label: "Care", value: product.care },
  ].filter((d): d is { label: string; value: string } => Boolean(d.value));

  return (
    <>
      <div className="shell pt-32">
        <nav className="eyebrow flex items-center gap-2" aria-label="Breadcrumb">
          <Link href="/collections" className="transition-colors hover:text-alabaster">
            Collection
          </Link>
          <span aria-hidden>/</span>
          {product.collection && (
            <>
              <Link
                href={`/collections/${product.collection.slug}`}
                className="transition-colors hover:text-alabaster"
              >
                {product.collection.name}
              </Link>
              <span aria-hidden>/</span>
            </>
          )}
          <span className="text-bone">{product.name}</span>
        </nav>
      </div>

      <article className="shell mt-10 grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <ProductGallery images={product.images} productName={product.name} />

        {/* The buy column sticks while the gallery scrolls — on a page this
            tall, losing the add-to-bag control costs conversions. */}
        <div className="lg:sticky lg:top-28 lg:self-start lg:pb-20">
          <p className="eyebrow">{product.collection?.name ?? "VAQITA"}</p>

          <h1 className="display mt-4 text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] text-alabaster">
            {product.name}
          </h1>

          {product.subtitle && (
            <p className="mt-3 text-sm text-stone">{product.subtitle}</p>
          )}

          <div className="mt-6 flex items-baseline gap-4">
            <p className="text-xl tabular-nums text-alabaster">
              {formatMoney(product.priceCents)}
            </p>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <p className="text-sm tabular-nums text-smoke line-through">
                {formatMoney(product.compareAtCents)}
              </p>
            )}
          </div>

          <p className="mt-8 text-[0.95rem] leading-relaxed text-stone">
            {product.description}
          </p>

          {/* Try-on sits above the buy controls: looking at the garment is the
              step before choosing a size, not after it. */}
          <TryIt
            className="mt-9 w-full"
            productName={product.name}
            garmentType={product.garmentType}
            printStyle={product.graphicStyle}
            textureUrl={product.textureUrl}
            textureBackUrl={product.textureBackUrl}
            basePriceCents={product.priceCents}
            seed={seedFromSlug(product.slug)}
            variants={product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              stock: v.stock,
              priceCents: v.priceCents,
            }))}
            label="Try it on in 3D"
          />

          <ProductPurchase
            variants={product.variants}
            basePriceCents={product.priceCents}
          />

          <dl className="mt-12 divide-y divide-bone/10 border-t border-bone/10">
            {details.map((d) => (
              <div key={d.label} className="grid grid-cols-[7rem_1fr] gap-4 py-4">
                <dt className="eyebrow pt-0.5">{d.label}</dt>
                <dd className="text-sm leading-relaxed text-stone">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      {product.story && (
        <section className="shell mt-28 border-t border-bone/10 pt-20">
          <Reveal className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-20">
            <p className="eyebrow">How it is made</p>
            <p className="display max-w-4xl text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.35] text-bone">
              {product.story}
            </p>
          </Reveal>
        </section>
      )}

      {related.length > 0 && (
        <section className="shell mt-28">
          <Reveal>
            <p className="eyebrow">Also in {product.collection?.name ?? "the collection"}</p>
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 110}>
                <ProductCard product={p} index={i} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
