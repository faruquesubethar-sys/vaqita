import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CONTACT } from "@/lib/contact";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { paymentsEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Order received" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  if (!number) notFound();

  const order = await db.order.findUnique({
    where: { number },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="shell flex min-h-[85vh] flex-col justify-center py-40">
      <div className="mx-auto w-full max-w-2xl">
        <p className="eyebrow text-brass-lit">Order {order.number}</p>

        <h1 className="display mt-5 text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] text-alabaster">
          Thank you. It&rsquo;s ours to handle now.
        </h1>

        {/* Says only what actually happens. There is no transactional email
            yet, and with no payment gateway nothing has been charged — telling
            the customer otherwise is how a shop loses trust on its first
            order. */}
        {paymentsEnabled ? (
          <p className="mt-8 text-[0.95rem] leading-relaxed text-stone">
            Your payment went through and the order is with us. Each piece is
            checked by hand before it leaves, so allow two working days before
            dispatch.
          </p>
        ) : (
          <p className="mt-8 text-[0.95rem] leading-relaxed text-stone">
            Your piece is held under order{" "}
            <span className="text-alabaster">{order.number}</span>. Nothing has
            been charged yet — message us on{" "}
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass-lit underline decoration-brass/40 underline-offset-2 hover:text-alabaster"
            >
              WhatsApp
            </a>{" "}
            with your order number and we&rsquo;ll confirm payment and
            dispatch. Quote{" "}
            <span className="text-alabaster">{order.email}</span> if we ask to
            match the order.
          </p>
        )}

        {!paymentsEnabled && (
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block border border-brass bg-brass px-8 py-4 text-xs uppercase tracking-[0.22em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit"
          >
            Confirm on WhatsApp
          </a>
        )}

        <div className="mt-14 border-t border-bone/10 pt-8">
          <h2 className="eyebrow">What you ordered</h2>

          <ul className="mt-6 divide-y divide-bone/8">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-4">
                <div>
                  <p className="text-sm text-alabaster">
                    {item.productName}
                    {item.quantity > 1 && (
                      <span className="text-smoke"> × {item.quantity}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-smoke">
                    {item.color} · Size {item.size}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-stone">
                  {formatMoney(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 border-t border-bone/10 pt-5 text-sm">
            <div className="flex justify-between text-stone">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between text-stone">
              <dt>Shipping</dt>
              <dd className="tabular-nums">
                formatMoney(order.shippingCents)
              </dd>
            </div>
            {/* Hidden when nothing is charged, rather than shown as a
                confident "Tax ₹0" on every order. */}
            {order.taxCents > 0 && (
              <div className="flex justify-between text-stone">
                <dt>Tax</dt>
                <dd className="tabular-nums">{formatMoney(order.taxCents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-bone/10 pt-3 text-base text-alabaster">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-12 border-t border-bone/10 pt-8">
          <h2 className="eyebrow">Shipping to</h2>
          <address className="mt-4 text-sm not-italic leading-relaxed text-stone">
            {order.shipFirstName} {order.shipLastName}
            <br />
            {order.shipLine1}
            {order.shipLine2 && (
              <>
                <br />
                {order.shipLine2}
              </>
            )}
            <br />
            {order.shipCity}, {order.shipRegion} {order.shipPostalCode}
            <br />
            {order.shipCountry}
          </address>
        </div>

        <div className="mt-14 flex flex-wrap gap-6">
          <Link
            href="/account"
            className="border border-bone/25 px-8 py-4 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors hover:border-brass hover:text-brass-lit"
          >
            View your orders
          </Link>
          <Link
            href="/collections"
            className="px-2 py-4 text-xs uppercase tracking-[0.22em] text-smoke transition-colors hover:text-alabaster"
          >
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
