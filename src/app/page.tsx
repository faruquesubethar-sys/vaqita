import Image from "next/image";
import Link from "next/link";

import {
  ProductCard,
  productCardInclude,
} from "@/components/catalogue/product-card";
import { Hero } from "@/components/hero/hero";
import { Marquee } from "@/components/sections/marquee";
import { MaterialStudy } from "@/components/sections/material-study";
import { WaxSeal } from "@/components/brand/wax-seal";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { db } from "@/lib/db";

// The catalogue changes rarely; regenerate hourly rather than per request.
export const revalidate = 3600;

export default async function HomePage() {
  const [featured, collections] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", featured: true },
      orderBy: { position: "asc" },
      include: {
        ...productCardInclude,
      },
      take: 3,
    }),
    db.collection.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <>
      <Hero />

      <Marquee />

      {/* ------------------------------------------------------ featured */}
      <section className="shell py-[clamp(5rem,12vh,9rem)]">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Selected</p>
            <h2 className="display mt-4 text-[clamp(2.5rem,6vw,5rem)] text-alabaster">
              <SplitText text="In stock now." trigger="view" />
            </h2>
          </div>
          <Link
            href="/collections"
            className="group text-xs uppercase tracking-[0.22em] text-stone transition-colors hover:text-alabaster"
          >
            <span className="link-underline">
              Everything in stock
              <span className="link-underline-bar" />
            </span>
          </Link>
        </Reveal>

        {featured.length > 0 ? (
          <div className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product, i) => (
              <Reveal key={product.id} delay={i * 110}>
                <ProductCard product={product} index={i} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-16 border border-bone/10 bg-graphite/40 p-12 text-center">
              <p className="eyebrow text-brass-lit">Catalogue In Progress</p>
              <h3 className="display mt-3 text-2xl text-alabaster">Pieces being catalogued</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone">
                Stock is being added piece-by-piece with photographs and 3D preview. Add items from the admin page, or browse our 5 collections below.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-5">
                <Link href="/admin/products" className="group text-xs uppercase tracking-[0.22em] text-brass-lit transition-colors hover:text-alabaster">
                  <span className="link-underline">
                    Open Admin Page
                    <span className="link-underline-bar" />
                  </span>
                </Link>
                <a href="https://wa.me/message/WUY6N5B57CEAJ1" target="_blank" rel="noopener noreferrer" className="group text-xs uppercase tracking-[0.22em] text-stone transition-colors hover:text-alabaster">
                  <span className="link-underline">
                    WhatsApp Inquiries
                    <span className="link-underline-bar" />
                  </span>
                </a>
              </div>
            </div>
          </Reveal>
        )}
      </section>

      <MaterialStudy />

      {/* ------------------------------------------------------ collections */}
      <section className="shell py-[clamp(5rem,12vh,9rem)]">
        <Reveal>
          <p className="eyebrow">Five Rails</p>
          <h2 className="display mt-4 max-w-2xl text-[clamp(2.5rem,6vw,5rem)] text-alabaster">
            <SplitText text="Five rails." trigger="view" />
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-stone">
            Surplus, vintage, tees, polos and trousers. Hand-picked stock sorted
            by origin and condition, viewable in 3D before you commit.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {collections.map((collection, i) => (
            <Reveal key={collection.id} delay={i * 110}>
              <Link
                href={`/collections/${collection.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden bg-graphite"
              >
                {collection.heroImage && (
                  <Image
                    src={collection.heroImage}
                    alt={collection.name}
                    fill
                    sizes="(max-width: 768px) 90vw, 30vw"
                    className="object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-8">
                  <p className="eyebrow text-brass-lit">{collection.tagline}</p>
                  <h3 className="display mt-2 text-4xl text-alabaster">
                    {collection.name}
                  </h3>
                  {/* Revealed on hover — keeps the card quiet at rest. */}
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone opacity-0 transition-all duration-700 group-hover:opacity-100">
                    {collection.description}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ atelier */}
      <section id="sorting" className="relative overflow-hidden py-[clamp(5rem,14vh,11rem)]">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src="/products/editorial-sorting.svg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" />
        </div>

        <div className="shell max-w-3xl">
          {/* Sits with the buying section and nowhere else. A seal on every
              section is decoration; a seal on the paragraph about stock that
              comes in once and is not reordered is the point. */}
          <WaxSeal className="mb-10" />

          <Reveal>
            <p className="eyebrow">How we buy</p>
            <h2 className="display mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.02] text-alabaster">
              We buy small, and we do not buy the same thing twice.
            </h2>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-8 text-base leading-relaxed text-stone">
              Everything here is new and imported, bought in lots small enough
              to carry. A style arrives in one of each size, goes up, sells,
              and is not ordered again. That is the point: you are not buying
              something a hundred other people in the city are also wearing.
            </p>
            <p className="mt-5 text-base leading-relaxed text-stone">
              Most shops photograph a sample and ship you whatever arrives.
              Every piece here is photographed front and back as itself, and
              the 3D model is built from those photographs — so what turns on
              screen is the garment going in the box, not a stand-in for it.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
