"use client";

import {
  useEffect,
  useRef,
  type ComponentType,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/**
 * A polymorphic `as` prop widens to a union whose props TypeScript resolves to
 * `never`. This narrows it back to "something that accepts HTML attributes and
 * a ref", which is all these wrappers ever pass.
 */
type PolymorphicTag = ComponentType<
  HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
>;

/**
 * Reveals its children once, when they first enter the viewport.
 *
 * Uses a single IntersectionObserver per instance and disconnects after firing
 * — reveal animations that re-run on scroll-back read as a glitch, not a
 * flourish. The initial hidden state lives in CSS (`[data-reveal]`), so content
 * is still present and selectable for crawlers and for anyone with JS disabled
 * once the observer never fires.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  y = 28,
  threshold = 0.15,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger in milliseconds. */
  delay?: number;
  /** Starting vertical offset in pixels. */
  y?: number;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const Component = Tag as PolymorphicTag;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fail open: without observer support the content simply shows.
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.revealed = "true";
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Component
      ref={ref}
      data-reveal=""
      className={cn(className)}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-y": `${y}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </Component>
  );
}
