import type { Metadata } from "next";
import Link from "next/link";

import { WaxSeal } from "@/components/brand/wax-seal";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "About us",
  description:
    "VAQITA Mens Fashion Hub — new imported menswear in small lots, one of each size, with a 3D fitting room on every piece.",
};

/**
 * Deliberately short, and specific.
 *
 * An about page earns nothing by being long. What a customer wants to know
 * before spending money with a shop they have not heard of is who has their
 * money, what they are actually buying, and what happens if it is wrong —
 * so it answers those three and stops.
 */
export default function AboutPage() {
  return (
    <div className="shell pt-40">
      <header className="border-b border-bone/10 pb-14">
        <p className="eyebrow">Who we are</p>
        <h1 className="display shimmer mt-5 text-[clamp(2.5rem,8vw,6rem)] leading-[1.02] text-alabaster [--shimmer-delay:1.2s]">
          <SplitText text="A small shop," />
          <span className="block italic text-brass-lit">
            <SplitText text="bought by hand." delay={0.3} />
          </span>
        </h1>
      </header>

      <div className="grid gap-16 py-16 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
        <div className="max-w-2xl space-y-7 text-[0.95rem] leading-relaxed text-stone">
          <Reveal>
            <p>
              VAQITA Mens Fashion Hub is a menswear shop run out of India. We
              import new stock in small lots — tees, polos, trousers, surplus
              cuts — and we buy it a piece at a time rather than by the
              container.
            </p>
          </Reveal>

          <Reveal delay={90}>
            <p>
              That decision sets everything else. A lot arrives as one of each
              size, goes up, sells, and is not ordered again. It means we run
              out, often quickly, and it means you are not going to pass
              someone wearing the same thing on the same street. If a size is
              gone, it is gone — we would rather tell you that than keep a
              listing up.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <h2 className="display pt-6 text-2xl text-alabaster">
              Why everything turns in 3D
            </h2>
            <p className="mt-4">
              Buying clothes from a photograph is guesswork. So every piece
              here is photographed front and back as itself, and the 3D model
              in the fitting room is built from those photographs — not from a
              stock template with your colour dropped on it. What turns on
              screen is the garment that goes in the box.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <h2 className="display pt-6 text-2xl text-alabaster">
              If something is wrong
            </h2>
            <p className="mt-4">
              Seven days, tags on and unworn. Because stock comes in one of
              each size we cannot swap a piece for another of the same thing —
              there is no second one — so a return is refunded rather than
              exchanged. Message us before you send anything back and we will
              sort it out between us.
            </p>
          </Reveal>

          <Reveal delay={280}>
            <p>
              The fastest way to reach a person is{" "}
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brass-lit underline decoration-brass/40 underline-offset-4 transition-colors hover:text-alabaster"
              >
                WhatsApp
              </a>
              . Ask about sizing, condition, or whether something suits what
              you already own — we would rather answer first than process a
              return later.
            </p>
          </Reveal>
        </div>

        <aside className="lg:pt-4">
          <Reveal delay={120}>
            <WaxSeal className="mb-12 lg:mb-14" />
          </Reveal>

          <Reveal delay={200}>
            <dl className="space-y-7 border-t border-bone/10 pt-8">
              {[
                ["Stock", "New, imported in small lots"],
                ["Sizing", "One of each — never restocked"],
                ["Shipping", "From India. Free over ₹2,500"],
                ["Returns", "Seven days, refunded not exchanged"],
                ["Support", "WhatsApp, usually within hours"],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="eyebrow">{term}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-stone">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-12 flex flex-wrap gap-6">
              <Link
                href="/collections"
                className="group relative overflow-hidden border border-bone/25 px-8 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors duration-500 hover:border-brass"
              >
                <span className="absolute inset-0 -z-10 translate-y-full bg-brass transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                <span className="transition-colors duration-500 group-hover:text-ink">
                  See what is in stock
                </span>
              </Link>
            </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
