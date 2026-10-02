"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { placeOrder, type CheckoutState } from "@/app/actions/checkout";
import type { CartView } from "@/lib/cart";
import { CONTACT } from "@/lib/contact";
import { formatMoney } from "@/lib/money";

const field =
  "w-full border-b border-bone/20 bg-transparent px-0 py-3 text-sm text-alabaster outline-none transition-colors placeholder:text-smoke focus:border-brass";

function Field({
  name,
  label,
  type = "text",
  required = true,
  autoComplete,
  defaultValue,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`mt-3 ${field}`}
      />
    </label>
  );
}

function Submit({
  total,
  paymentsEnabled,
}: {
  total: number;
  paymentsEnabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="mt-8 w-full border border-brass bg-brass px-8 py-5 text-xs uppercase tracking-[0.24em] text-ink transition-colors duration-500 hover:bg-transparent hover:text-brass-lit disabled:opacity-60"
      >
        {pending
          ? "Placing your order…"
          : `${paymentsEnabled ? "Continue to payment" : "Reserve this piece"} — ${formatMoney(total)}`}
      </button>

      {!paymentsEnabled && (
        <p className="mt-4 text-center text-[0.6875rem] leading-relaxed text-smoke">
          No payment is taken here. Your piece is held and we confirm the order
          and payment with you on{" "}
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brass-lit underline decoration-brass/40 underline-offset-2 hover:text-alabaster"
          >
            WhatsApp
          </a>
          .
        </p>
      )}
    </>
  );
}

export function CheckoutForm({
  cart,
  defaultEmail,
  defaultName,
  paymentsEnabled,
}: {
  cart: CartView;
  defaultEmail: string;
  defaultName: string;
  paymentsEnabled: boolean;
}) {
  const [state, formAction] = useActionState<CheckoutState, FormData>(
    placeOrder,
    undefined,
  );

  const [firstName = "", lastName = ""] = defaultName.split(" ");

  return (
    <div className="mt-12 grid gap-16 lg:grid-cols-[1.3fr_1fr] lg:gap-24">
      <form action={formAction}>
        <section>
          <h2 className="eyebrow border-b border-bone/10 pb-4 text-bone">Contact</h2>
          <div className="mt-7 grid gap-7">
            <Field
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              defaultValue={defaultEmail}
              placeholder="you@example.com"
            />
            <Field
              name="phone"
              label="Phone (optional)"
              type="tel"
              required={false}
              autoComplete="tel"
              placeholder="For delivery updates"
            />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="eyebrow border-b border-bone/10 pb-4 text-bone">
            Shipping address
          </h2>

          <div className="mt-7 grid gap-7 sm:grid-cols-2">
            <Field
              name="firstName"
              label="First name"
              autoComplete="given-name"
              defaultValue={firstName}
            />
            <Field
              name="lastName"
              label="Last name"
              autoComplete="family-name"
              defaultValue={lastName}
            />
            <Field
              name="line1"
              label="Address"
              autoComplete="address-line1"
              placeholder="Street and number"
              className="sm:col-span-2"
            />
            <Field
              name="line2"
              label="Apartment, suite (optional)"
              required={false}
              autoComplete="address-line2"
              className="sm:col-span-2"
            />
            <Field name="city" label="City" autoComplete="address-level2" />
            <Field name="region" label="State" autoComplete="address-level1" />
            <Field
              name="postalCode"
              label="Postcode"
              autoComplete="postal-code"
            />

            <label className="block">
              <span className="eyebrow">Country</span>
              <select
                name="country"
                defaultValue="IN"
                autoComplete="country"
                className={`mt-3 ${field} [&>option]:bg-obsidian`}
              >
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="AE">United Arab Emirates</option>
                <option value="SG">Singapore</option>
              </select>
            </label>
          </div>
        </section>

        {state?.error && (
          <p
            role="alert"
            className="mt-8 border-l-2 border-danger bg-danger/10 px-4 py-3 text-xs leading-relaxed text-bone"
          >
            {state.error}
          </p>
        )}

        <Submit total={cart.totalCents} paymentsEnabled={paymentsEnabled} />
      </form>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="eyebrow border-b border-bone/10 pb-4 text-bone">Your order</h2>

        <ul className="divide-y divide-bone/8">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex gap-4 py-5">
              <div className="relative h-24 w-18 shrink-0 overflow-hidden bg-graphite">
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt={line.productName}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                )}
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brass text-[0.625rem] text-ink">
                  {line.quantity}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-alabaster">{line.productName}</p>
                <p className="mt-1 text-xs text-smoke">
                  {line.color} · Size {line.size}
                </p>
              </div>

              <span className="shrink-0 text-sm tabular-nums text-alabaster">
                {formatMoney(line.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-3 border-t border-bone/10 pt-6 text-sm">
          <div className="flex justify-between text-stone">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-stone">
            <dt>Shipping</dt>
            <dd className="tabular-nums">
              {cart.shippingCents === 0 ? "Complimentary" : formatMoney(cart.shippingCents)}
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
          <div className="flex justify-between border-t border-bone/10 pt-4 text-base text-alabaster">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(cart.totalCents)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
