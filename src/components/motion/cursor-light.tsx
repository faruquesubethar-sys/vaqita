"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A soft highlight that follows the cursor across whatever it wraps.
 *
 * The point is not the glow itself but that it moves: a still image under a
 * light that tracks your hand reads as an object under glass rather than a
 * picture on a page, and it costs one CSS gradient.
 *
 * The listener sits on the wrapper and the glow is painted by a child with
 * pointer-events off, so the link underneath still takes every click. Putting
 * the handler on the glow itself would have made it swallow them.
 *
 * Coordinates are written straight to CSS custom properties rather than held
 * in state. Pointer moves fire far faster than React can usefully re-render,
 * and a state update per event would re-render the whole card on every pixel.
 */
export function CursorLight({
  children,
  className,
  /** 0–1. Higher is brighter; cards want less than a hero does. */
  strength = 0.1,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const host = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={host}
      className={cn("vq-lit", className)}
      onPointerMove={(event) => {
        const el = host.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--lx", `${((event.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--ly", `${((event.clientY - r.top) / r.height) * 100}%`);
      }}
      style={{ ["--lit" as string]: strength }}
    >
      {children}
      <span aria-hidden className="vq-lit__glow" />
    </div>
  );
}

export default CursorLight;
