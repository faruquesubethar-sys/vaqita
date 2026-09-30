import type { Metadata } from "next";

import {
  ProductCard,
  productCardInclude,
} from "@/components/catalogue/product-card";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { db } from "@/lib/db";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Everything in stock",
  description:
    "Every piece in stock — imported tees, polos, trousers and surplus.",
};

export default async function CollectionsPage() {
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { position: "asc" },
    include: {
      ...productCardInclude,
      collection: { select: { name: true } },
    },
  });

  return (
    <div className="shell pt-40">
      <header className="border-b border-bone/10 pb-14">
        <p className="eyebrow">Everything on the rail</p>
        <h1 className="display mt-5 text-[clamp(3rem,8vw,7rem)] text-alabaster">
          <SplitText text="In stock" />
        </h1>
        <p className="mt-7 max-w-xl text-[0.95rem] leading-relaxed text-stone">
          Surplus, vintage, tees, polo tees and trousers. New imported stock,
          photographed piece by piece, with a 3D fitting room on every one.
        </p>
      </header>

      {products.length > 0 ? (
        <div className="mt-16 grid gap-x-8 gap-y-16 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={(i % 3) * 110}>
              <ProductCard product={product} index={i} priority={i < 3} />
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal>
          <div className="mt-16 border border-bone/10 bg-graphite/40 p-16 text-center">
            <p className="eyebrow text-brass-lit">Catalogue In Progress</p>
            <h2 className="display mt-3 text-3xl text-alabaster">New pieces arriving shortly</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone">
              All stock is being catalogued piece-by-piece with photographs and measurements. Add pieces via the admin panel, or contact us directly on WhatsApp or Instagram.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <a href="https://wa.me/message/WUY6N5B57CEAJ1" target="_blank" rel="noopener noreferrer" className="group text-xs uppercase tracking-[0.22em] text-brass-lit transition-colors hover:text-alabaster">
                <span className="link-underline">
                  Message on WhatsApp
                  <span className="link-underline-bar" />
                </span>
              </a>
              <a href="https://www.instagram.com/your_vaqita_menswear?stkn=bzk1cHQ4MW40ZjNn" target="_blank" rel="noopener noreferrer" className="group text-xs uppercase tracking-[0.22em] text-stone transition-colors hover:text-alabaster">
                <span className="link-underline">
                  Follow on Instagram
                  <span className="link-underline-bar" />
                </span>
              </a>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
