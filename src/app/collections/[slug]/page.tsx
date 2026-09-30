import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import {
  ProductCard,
  productCardInclude,
} from "@/components/catalogue/product-card";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { db } from "@/lib/db";

/**
 * Rendered per request, for the same reason as the product page: this tree
 * reads cookies while rendering, so it cannot be prerendered.
 *
 * It was previously prerendered from a list of the sections that existed at
 * build time. Any section added afterwards was therefore not in that list,
 * and the first request for it would try to render statically, hit
 * `cookies()`, and return 500 — the same failure that took out every product
 * page, waiting on the next section you add.
 */
export const dynamic = "force-dynamic";

async function getCollection(slug: string) {
  return db.collection.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: { position: "asc" },
        include: {
          ...productCardInclude,
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: "Not found" };

  return {
    title: collection.name,
    description: collection.description ?? collection.tagline ?? undefined,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  return (
    <>
      <header className="relative isolate flex min-h-[62vh] items-end overflow-hidden">
        {collection.heroImage && (
          <Image
            src={collection.heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover opacity-45"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/40"
        />
        <div aria-hidden className="grain-layer" />

        <div className="shell pb-16 pt-44">
          <p className="eyebrow text-brass-lit">{collection.tagline}</p>
          <h1 className="display mt-4 text-[clamp(3rem,9vw,8rem)] text-alabaster">
            <SplitText text={collection.name} />
          </h1>
          {collection.description && (
            <p className="mt-7 max-w-xl text-[0.95rem] leading-relaxed text-stone">
              {collection.description}
            </p>
          )}
        </div>
      </header>

      <div className="shell mt-20">
        <p className="eyebrow border-b border-bone/10 pb-5">
          {collection.products.length}{" "}
          {collection.products.length === 1 ? "garment" : "garments"}
        </p>

        {collection.products.length === 0 ? (
          <p className="display py-24 text-center text-3xl text-stone">
            Nothing in this collection yet.
          </p>
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {collection.products.map((product, i) => (
              <Reveal key={product.id} delay={(i % 3) * 110}>
                <ProductCard product={product} index={i} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
