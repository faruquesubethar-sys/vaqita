"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { cart, isOpen, close, update, remove, notice, dismissNotice, isPending } =
    useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; body scroll locks while open.
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // Move focus into the panel so keyboard and screen-reader users land
    // inside the drawer rather than continuing behind it.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, 5000);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  return (
    <>
      <div
        onClick={close}
        aria-hidden
        className={cn(
          "fixed inset-0 z-60 bg-ink/70 backdrop-blur-sm transition-opacity duration-700",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Shopping bag"
        className={cn(
          "fixed right-0 top-0 z-70 flex h-[100dvh] w-full max-w-[29rem] flex-col border-l border-bone/10 bg-obsidian transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-bone/10 px-7 py-6">
          <h2 className="eyebrow text-alabaster">
            Your bag {cart.itemCount > 0 && `(${cart.itemCount})`}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-xs uppercase tracking-[0.2em] text-stone transition-colors hover:text-alabaster"
          >
            Close
          </button>
        </header>

        {notice && (
          <p className="border-b border-brass/25 bg-brass/10 px-7 py-3 text-xs leading-relaxed text-brass-lit">
            {notice}
          </p>
        )}

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-7 text-center">
            <p className="display text-3xl text-stone">Nothing here yet.</p>
            <Link
              href="/collections"
              onClick={close}
              className="border border-bone/25 px-8 py-3.5 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors hover:border-brass hover:text-brass-lit"
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-7">
              <ul className="divide-y divide-bone/8">
                {cart.lines.map((line) => (
                  <li key={line.id} className="flex gap-5 py-6">
                    <Link
                      href={`/products/${line.productSlug}`}
                      onClick={close}
                      className="relative h-32 w-24 shrink-0 overflow-hidden bg-graphite"
                    >
                      {line.imageUrl && (
                        <Image
                          src={line.imageUrl}
                          alt={line.productName}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <Link
                          href={`/products/${line.productSlug}`}
                          onClick={close}
                          className="truncate text-sm text-alabaster transition-colors hover:text-brass-lit"
                        >
                          {line.productName}
                        </Link>
                        <span className="shrink-0 text-sm tabular-nums text-alabaster">
                          {formatMoney(line.lineTotalCents)}
                        </span>
                      </div>

                      <p className="mt-1.5 flex items-center gap-2 text-xs text-smoke">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-bone/20"
                          style={{ backgroundColor: line.colorHex }}
                        />
                        {line.color} · Size {line.size}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex items-center border border-bone/15">
                          <button
                            type="button"
                            onClick={() => update(line.id, line.quantity - 1)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-sm text-stone transition-colors hover:text-alabaster disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="min-w-8 text-center text-xs tabular-nums text-alabaster">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => update(line.id, line.quantity + 1)}
                            disabled={isPending || line.quantity >= line.stock}
                            className="px-3 py-1.5 text-sm text-stone transition-colors hover:text-alabaster disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(line.id)}
                          className="text-[0.625rem] uppercase tracking-[0.2em] text-smoke transition-colors hover:text-danger"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-bone/10 px-7 py-6">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between text-stone">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(cart.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between text-stone">
                  <dt>Shipping</dt>
                  <dd className="tabular-nums">
                    {cart.shippingCents === 0 ? "—" : formatMoney(cart.shippingCents)}
                  </dd>
                </div>
                {/* Hidden when nothing is charged, rather than shown as a
                    confident "Tax ₹0" on every order. */}
                {cart.taxCents > 0 && (
                  <div className="flex justify-between text-stone">
                    <dt>Tax</dt>
                    <dd className="tabular-nums">{formatMoney(cart.taxCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-bone/10 pt-3 text-sm text-alabaster">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(cart.totalCents)}</dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                onClick={close}
                className="group relative mt-6 block overflow-hidden border border-brass bg-brass px-8 py-4 text-center text-xs uppercase tracking-[0.22em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit"
              >
                Checkout
              </Link>

              <Link
                href="/cart"
                onClick={close}
                className="mt-3 block text-center text-[0.6875rem] uppercase tracking-[0.2em] text-smoke transition-colors hover:text-alabaster"
              >
                View full bag
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
