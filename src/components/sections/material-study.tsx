"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const MATERIALS = [
  {
    id: "jersey",
    name: "Vintage jersey",
    origin: "Sorted in Gujarat",
    detail:
      "Cotton jersey improves for about five years and then plateaus. Everything in the thrift rail is past the plateau: the yarn has relaxed, the surface has gone slightly uneven, and it drapes the way a new tee will not until you have put fifty wears into it.",
    image: "/products/tee-faded-black.svg",
  },
  {
    id: "deadstock",
    name: "Deadstock cotton",
    origin: "Unmarked warehouses",
    detail:
      "Made, warehoused, never issued. Thirty years old and never worn. The cloth is a heavyweight most mills stopped running because it costs more and nobody asks for it. Stiff for three wears, then the best thing you own.",
    image: "/products/ls-olive.svg",
  },
  {
    id: "chambray",
    name: "Chambray",
    origin: "Tamil Nadu",
    detail:
      "A plain weave with a coloured warp and a white weft, which is why it lightens at every crease as it wears. Triple stitching at the load-bearing seams means the shirt fails at the cloth long before it fails at the seam.",
    image: "/products/shirt-chambray.svg",
  },
  {
    id: "overdye",
    name: "Reactive dye",
    origin: "Tiruppur",
    detail:
      "We dye in lots of about forty. The garments going in are all different ages, so they come out sharing a family resemblance rather than a colour match — and the seams almost always take it darker, because the thread is polyester and refuses the dye.",
    image: "/products/hoodie-ash.svg",
  },
];

/**
 * An index of materials where hovering (or focusing) a row swaps the image.
 *
 * Touch devices get no hover, so the active row also advances on scroll into
 * view — the section still tells its story without a pointer.
 */
export function MaterialStudy() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    if (!coarse.matches) return;

    // On touch, cycle slowly while the section is on screen.
    let timer: ReturnType<typeof setInterval> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) {
          timer = setInterval(() => setActive((i) => (i + 1) % MATERIALS.length), 3200);
        } else if (!entry.isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { threshold: 0.35 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="materials"
      className="border-y border-bone/10 bg-obsidian py-[clamp(5rem,12vh,9rem)]"
    >
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Fabrics</p>
          <h2 className="display mt-4 max-w-2xl text-[clamp(2.5rem,6vw,5rem)] text-alabaster">
            The cloth decides everything else.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          {/* Image column — all four stacked, cross-faded. Swapping `src` on a
              single element would flash while the new file decodes. */}
          <Reveal className="relative order-2 aspect-[4/5] overflow-hidden bg-graphite lg:order-1">
            {MATERIALS.map((m, i) => (
              <Image
                key={m.id}
                src={m.image}
                alt={m.name}
                fill
                sizes="(max-width: 1024px) 90vw, 45vw"
                className={cn(
                  "object-cover transition-all duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  i === active ? "scale-100 opacity-100" : "scale-105 opacity-0",
                )}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
          </Reveal>

          <div className="order-1 lg:order-2">
            <ul>
              {MATERIALS.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-expanded={i === active}
                    className={cn(
                      "group w-full border-b border-bone/10 py-7 text-left transition-colors duration-500",
                      i === active ? "border-brass/40" : "hover:border-bone/25",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <h3
                        className={cn(
                          "display text-3xl transition-colors duration-500 md:text-4xl",
                          i === active ? "text-brass-lit" : "text-stone",
                        )}
                      >
                        {m.name}
                      </h3>
                      <span className="shrink-0 text-[0.625rem] uppercase tracking-[0.2em] text-smoke">
                        {m.origin}
                      </span>
                    </div>

                    {/* Grid-rows trick: animates height to auto, which max-height
                        cannot do without hard-coding a value. */}
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        i === active
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className="overflow-hidden text-sm leading-relaxed text-stone">
                        <span className="block pt-4">{m.detail}</span>
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
