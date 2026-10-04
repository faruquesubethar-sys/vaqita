"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SplitText } from "@/components/motion/split-text";

// The 3D scene is ~600KB of WebGL that nothing above it depends on. It is
// loaded only after the page is interactive, and never rendered on the server.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

export function Hero() {
  const [show3D, setShow3D] = useState(true);
  /** Fades the fixed 3D layer out once the mark has finished its climb. */
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setPastHero(window.scrollY > window.innerHeight * 1.05);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      {/* Poster background */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_15%,#24262c_0%,#131316_45%,#0b0b0c_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_38%,rgba(176,141,87,0.09)_50%,transparent_62%)]" />
      </div>

      {/*
        Fixed, not absolute. The mark has to climb into the header as the hero
        scrolls away, and a layer that scrolls away with its section cannot do
        that — it would leave the frame before it arrived. Behind everything
        and inert, so nothing above it is affected.
      */}
      {show3D && (
        <div
          aria-hidden
          data-hero-mark
          className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500 ${
            pastHero ? "opacity-0" : "opacity-100"
          }`}
        >
          <HeroScene />
        </div>
      )}

      {/* Floor gradient: subtle at the bottom edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-ink via-ink/60 to-transparent"
      />

      {/* Left scrim: protects headline contrast while leaving the right clear for the 3D swan */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[55%] bg-[linear-gradient(to_right,var(--color-ink)_10%,rgba(11,11,12,0.85)_40%,transparent_100%)]"
      />
      <div aria-hidden className="grain-layer" />

      <div className="shell relative z-10 pb-[clamp(3rem,9vh,7rem)] pt-40">
        <p className="eyebrow animate-fade-up" style={{ animationDelay: "120ms" }}>
          Surplus · Vintage · Tees · Polos · Trouser · Shirts · Footwear
        </p>

        {/* The shimmer runs once the letters have landed, not with them —
            a band of light crossing a headline that is still assembling
            reads as a glitch rather than as gloss. */}
        <h1 className="display shimmer mt-7 text-[clamp(3rem,10.5vw,10.5rem)] text-alabaster [--shimmer-delay:1.5s]">
          <SplitText text="Imported once." delay={0.15} />
          <span className="block italic text-brass-lit">
            <SplitText text="Never again." delay={0.38} />
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 border-t border-bone/10 pt-8 md:flex-row md:items-end md:justify-between">
          <p
            className="animate-fade-up max-w-md text-[0.95rem] leading-relaxed text-stone"
            style={{ animationDelay: "900ms" }}
          >
            Brought in from abroad in small lots, one of each size. Every piece
            photographed itself and turns in 3D, so you see the real cloth
            before you spend anything.
          </p>

          <div
            className="animate-fade-up flex flex-wrap items-center gap-8"
            style={{ animationDelay: "1050ms" }}
          >
            <Link
              href="/collections"
              className="group relative overflow-hidden border border-bone/25 px-9 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors duration-500 hover:border-brass"
            >
              {/* Brass wipes upward from the bottom edge on hover. */}
              <span className="absolute inset-0 -z-10 translate-y-full bg-brass transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
              <span className="transition-colors duration-500 group-hover:text-ink">
                Shop everything
              </span>
            </Link>

            <Link
              href="/collections/tees"
              className="group text-xs uppercase tracking-[0.22em] text-stone transition-colors hover:text-alabaster"
            >
              <span className="link-underline">
                Tees
                <span className="link-underline-bar" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  return (
    <div
      aria-hidden
      className="animate-fade-up pointer-events-none absolute bottom-7 right-[var(--shell-x)] z-10 hidden items-center gap-3 md:flex"
      style={{ animationDelay: "1300ms" }}
    >
      <span className="text-[0.625rem] uppercase tracking-[0.3em] text-smoke">Scroll</span>
      <span className="relative block h-12 w-px overflow-hidden bg-bone/15">
        <span className="absolute inset-x-0 top-0 h-4 animate-[vq-cue_2.4s_ease-in-out_infinite] bg-brass" />
      </span>
      <style>{`@keyframes vq-cue{0%{transform:translateY(-100%)}60%,100%{transform:translateY(300%)}}`}</style>
    </div>
  );
}
