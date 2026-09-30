"use client";

import gsap from "gsap";
import {
  useEffect,
  useRef,
  type ComponentType,
  type ElementType,
  type HTMLAttributes,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/** See the note in reveal.tsx — narrows the polymorphic `as` prop. */
type PolymorphicTag = ComponentType<
  HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }
>;

/**
 * Animates a heading in character by character.
 *
 * Splitting text into per-character spans destroys it for screen readers —
 * each letter becomes its own node and is announced separately. So the visible
 * spans are `aria-hidden` and the original string is carried on `aria-label`,
 * leaving assistive technology with one clean phrase.
 */
export function SplitText({
  text,
  as: Tag = "span",
  className,
  delay = 0,
  stagger = 0.022,
  trigger = "mount",
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  /** "mount" animates immediately; "view" waits until scrolled into view. */
  trigger?: "mount" | "view";
}) {
  const ref = useRef<HTMLElement>(null);
  const Component = Tag as PolymorphicTag;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chars = el.querySelectorAll<HTMLElement>(".char");
    if (!chars.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(chars, { y: 0, rotate: 0, scale: 1, opacity: 1, filter: "none" });
      return;
    }

    const play = () =>
      gsap.to(chars, {
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.35,
        ease: "expo.out",
        stagger,
        delay,
      });

    if (trigger === "mount") {
      const ctx = gsap.context(play, el);
      return () => ctx.revert();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, delay, stagger, trigger]);

  // Split on words first so that line wrapping never breaks mid-word.
  const words = text.split(" ");

  return (
    <Component ref={ref} className={cn(className)} aria-label={text}>
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} aria-hidden className="inline-block whitespace-nowrap">
          {Array.from(word).map((char, ci) => (
            <span key={ci} className="char">
              {char}
            </span>
          ))}
          {wi < words.length - 1 && <span className="char">&nbsp;</span>}
        </span>
      ))}
    </Component>
  );
}
