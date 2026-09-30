"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { SwanMark } from "./swan-mark";

/**
 * A seal that presses into the page as you scroll to it.
 *
 * The one piece of theatre on the site that is about what the shop actually
 * is: stock that comes in once, gets stamped, and is not ordered again. It
 * sits with the sourcing section for that reason and nowhere else — a seal on
 * every section would be decoration, and a seal on the one paragraph about
 * buying is a point.
 *
 * Not 3D. A seal is a flat object seen straight on, and its weight comes from
 * the press — the drop, the overshoot, the shadow spreading as it lands — not
 * from being a mesh. Another WebGL context on a page that already has one
 * would cost a phone far more than this effect is worth.
 */
export function WaxSeal({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPressed(true);
      return;
    }

    // Fires once. A seal that re-stamps every time it scrolls back into view
    // stops reading as a seal and starts reading as a loop.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPressed(true);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      className={cn("vq-seal", pressed && "vq-seal--pressed", className)}
    >
      <span className="vq-seal__disc">
        <SwanMark id="seal" className="vq-seal__mark" />
      </span>
      <span className="vq-seal__legend">Imported once</span>
    </div>
  );
}

export default WaxSeal;
