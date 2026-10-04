"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SwanLogo } from "@/components/brand/swan-mark";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useCart } from "@/components/cart/cart-provider";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/collections/surplus", label: "Surplus" },
  { href: "/collections/vintage", label: "Vintage" },
  { href: "/collections/tees", label: "Tees" },
  { href: "/collections/polo-tees", label: "Polo Tees" },
  { href: "/collections/trouser", label: "Trouser" },
  { href: "/collections/shirts", label: "Shirts" },
  { href: "/collections/footwear", label: "Footwear" },
];

export function Header({ user }: { user: SessionUser | null }) {
  const { cart, open } = useCart();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * Whether the 3D mark in the hero has finished climbing into this spot.
   *
   * On the home page the hero's mark rises into the header as you scroll, and
   * the flat one here takes over from it. Showing both at once during the
   * climb would put two swans on screen, so this one waits.
   *
   * It is only ever false on a page that has the hero; everywhere else the
   * header owns the mark from the first frame.
   */
  const [markReady, setMarkReady] = useState(true);

  // The bar condenses once you leave the hero, and retreats when you scroll
  // down so the page is never framed by chrome while reading.
  // The hero renders the 3D mark; only that page needs the handoff.
  const hasHero = useRef(false);

  useEffect(() => {
    hasHero.current = Boolean(document.querySelector("[data-hero-mark]"));
    if (!hasHero.current) setMarkReady(true);
    else setMarkReady(window.scrollY > window.innerHeight * 0.8);
  }, [pathname]);

  useEffect(() => {
    let last = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // The hero's mark lands at about 0.92 of a viewport. Handing over a
      // little before it arrives lets the two cross-fade rather than blink.
      setMarkReady(!hasHero.current || y > window.innerHeight * 0.8);
      setHidden(y > 320 && y > last && !menuOpen);
      last = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  // Close the mobile menu on navigation — otherwise it survives the route
  // change and covers the page you just asked for.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,backdrop-filter,border-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? "border-b border-bone/10 bg-ink/78 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
          hidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        {/* Three explicit columns rather than an absolutely-centred wordmark:
            the centre is reserved, so the logo can never collide with a long
            navigation label. */}
        <div
          className={cn(
            "shell grid grid-cols-[1fr_auto_1fr] items-center transition-[padding] duration-700",
            scrolled ? "py-4" : "py-7",
          )}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-fit items-center gap-3 text-xs uppercase tracking-[0.22em] text-stone transition-colors hover:text-alabaster lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            <span className="flex h-3 w-5 flex-col justify-between">
              <span
                className={cn(
                  "block h-px w-full bg-current transition-transform duration-500",
                  menuOpen && "translate-y-[5.5px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-full bg-current transition-opacity duration-300",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block h-px w-full bg-current transition-transform duration-500",
                  menuOpen && "-translate-y-[5.5px] -rotate-45",
                )}
              />
            </span>
          </button>

          <nav className="hidden items-center gap-5 lg:flex lg:justify-self-start xl:gap-7">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group whitespace-nowrap text-[0.6875rem] font-medium uppercase tracking-[0.14em] transition-colors duration-300",
                  pathname === item.href ? "text-alabaster" : "text-stone hover:text-alabaster",
                )}
              >
                <span className="link-underline">
                  {item.label}
                  <span className="link-underline-bar" />
                </span>
              </Link>
            ))}
          </nav>

          {/* House mark and wordmark. The descriptor line collapses once the
              bar condenses, so the header loses height without losing identity. */}
          <Link href="/" className="justify-self-center" aria-label="VAQITA Mens Fashion Hub — home">
            <SwanLogo
              id="hdr"
              compact={scrolled}
              markClassName={cn(
                scrolled ? "h-6" : "h-8",
                "transition-opacity duration-500",
                markReady ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>

          <div className="flex items-center gap-7 justify-self-end">
            <Link
              href="/contact"
              className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-stone transition-colors hover:text-alabaster md:block"
            >
              Contact
            </Link>

            <Link
              href={user ? "/account" : "/sign-in"}
              className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-stone transition-colors hover:text-alabaster sm:block"
            >
              {user ? (user.name?.split(" ")[0] ?? "Account") : "Sign in"}
            </Link>

            <button
              type="button"
              onClick={open}
              className="group flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone transition-colors hover:text-alabaster"
              aria-label={`Open bag, ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
            >
              Bag
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.625rem] tabular-nums transition-all duration-500",
                  cart.itemCount > 0
                    ? "bg-brass text-ink"
                    : "border border-bone/20 text-smoke",
                )}
              >
                {cart.itemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <div
        id="mobile-nav"
        className={cn(
          "fixed inset-0 z-40 bg-ink transition-opacity duration-500 lg:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav className="shell flex h-full flex-col justify-center gap-2">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="display border-b border-bone/8 py-5 text-5xl text-alabaster transition-colors hover:text-brass-lit"
              style={{
                transitionDelay: menuOpen ? `${i * 60}ms` : "0ms",
                transform: menuOpen ? "none" : "translateY(1rem)",
                opacity: menuOpen ? 1 : 0,
                transitionProperty: "opacity, transform, color",
                transitionDuration: "700ms",
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="eyebrow mt-10 hover:text-alabaster">
            Contact us
          </Link>
          <Link
            href={user ? "/account" : "/sign-in"}
            className="eyebrow mt-4 hover:text-alabaster"
          >
            {user ? "Account" : "Sign in"}
          </Link>
        </nav>
      </div>

      <CartDrawer />
    </>
  );
}
