"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { cart, update, remove, isPending } = useCart();

  if (cart.lines.length === 0) {
    return (
      <div className="shell flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center">
        <p className="eyebrow">Your bag</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)] text-alabaster">
          Nothing here yet.
        </h1>
        <Link
          href="/collections"
          className="border border-bone/25 px-9 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors hover:border-brass hover:text-brass-lit"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="shell pt-40">
      <header className="border-b border-bone/10 pb-10">
        <p className="eyebrow">Your bag</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,7vw,5rem)] text-alabaster">
          {cart.itemCount} {cart.itemCount === 1 ? "piece" : "pieces"}
        </h1>
      </header>

      <div className="mt-12 grid gap-16 pb-10 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
        <ul className="divide-y divide-bone/10 border-b border-bone/10">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex gap-6 py-8">
              <Link
                href={`/products/${line.productSlug}`}
                className="relative h-44 w-32 shrink-0 overflow-hidden bg-graphite sm:h-52 sm:w-40"
              >
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt={line.productName}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-1000 hover:scale-105"
                  />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap justify-between gap-3">
                  <Link
                    href={`/products/${line.productSlug}`}
                    className="text-base text-alabaster transition-colors hover:text-brass-lit"
                  >
                    {line.productName}
                  </Link>
                  <span className="tabular-nums text-alabaster">
                    {formatMoney(line.lineTotalCents)}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-2 text-sm text-smoke">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-bone/20"
                    style={{ backgroundColor: line.colorHex }}
                  />
                  {line.color} · Size {line.size}
                </p>

                <p className="mt-1 text-xs text-smoke">
                  {formatMoney(line.unitPriceCents)} each
                </p>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <div className="flex items-center border border-bone/15">
                    <button
                      type="button"
                      onClick={() => update(line.id, line.quantity - 1)}
                      disabled={isPending}
                      className="px-4 py-2 text-stone transition-colors hover:text-alabaster disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-10 text-center text-sm tabular-nums text-alabaster">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => update(line.id, line.quantity + 1)}
                      disabled={isPending || line.quantity >= line.stock}
                      className="px-4 py-2 text-stone transition-colors hover:text-alabaster disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    className="text-[0.6875rem] uppercase tracking-[0.2em] text-smoke transition-colors hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="eyebrow border-b border-bone/10 pb-5">Summary</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between text-stone">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(cart.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between text-stone">
              <dt>Shipping</dt>
              <dd className="tabular-nums">
                formatMoney(cart.shippingCents)
              </dd>
            </div>
            {/* Hidden when nothing is charged. The label also claimed a rate
                of 12% outright, which was neither chosen nor necessarily
                one this shop is registered to collect. */}
            {cart.taxCents > 0 && (
              <div className="flex justify-between text-stone">
                <dt>Tax</dt>
                <dd className="tabular-nums">{formatMoney(cart.taxCents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-bone/10 pt-4 text-base text-alabaster">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(cart.totalCents)}</dd>
            </div>
          </dl>


          <Link
            href="/checkout"
            className="mt-8 block border border-brass bg-brass px-8 py-4 text-center text-xs uppercase tracking-[0.24em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit"
          >
            Proceed to checkout
          </Link>

          <Link
            href="/collections"
            className="mt-4 block text-center text-[0.6875rem] uppercase tracking-[0.2em] text-smoke transition-colors hover:text-alabaster"
          >
            Continue browsing
          </Link>
        </aside>
      </div>
    </div>
  );
}
