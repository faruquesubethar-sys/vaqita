/**
 * Money is stored and computed exclusively in integer minor units (paise for
 * INR, cents for USD). Floating point never touches a price — `0.1 + 0.2` is
 * not 0.3, and that error compounds across a cart.
 */

export const CURRENCY = "INR";

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, withDecimals: boolean) {
  const key = `${currency}:${withDecimals}`;
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: withDecimals ? 2 : 0,
    });
    FORMATTERS.set(key, f);
  }
  return f;
}

/**
 * Renders minor units as a display string. Whole amounts drop the decimals —
 * "₹48,000" reads as luxury, "₹48,000.00" reads as a receipt.
 */
export function formatMoney(cents: number, currency: string = CURRENCY): string {
  const hasFraction = cents % 100 !== 0;
  return formatter(currency, hasFraction).format(cents / 100);
}

/** Compact form for dense UI such as the cart drawer line items. */
export function formatMoneyShort(cents: number, currency: string = CURRENCY): string {
  return formatter(currency, false).format(Math.round(cents / 100));
}

export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

// --- shipping & tax ---------------------------------------------------------
// Deliberately simple and centralised: one place to change when real rates and
// jurisdictions arrive. Checkout, cart and order creation all call these, so
// the totals shown can never drift from the totals charged.

export const FREE_SHIPPING_THRESHOLD_CENTS = 250_000; // ₹2,500
export const STANDARD_SHIPPING_CENTS = 9_900; // ₹99
/**
 * Sales tax, as a fraction. Zero unless you set one.
 *
 * This was 0.12, a "GST placeholder" put in while scaffolding — which meant
 * the shop quietly added 12% to every order from the first day. A seller who
 * is not registered to collect GST must not be charging it, and one who is
 * will know their own rate; neither is served by a number nobody chose.
 *
 * Set TAX_RATE in the environment if you are registered. 0.12 is 12%.
 */
export const TAX_RATE = (() => {
  const raw = Number(process.env.TAX_RATE ?? process.env.NEXT_PUBLIC_TAX_RATE ?? 0);
  return Number.isFinite(raw) && raw >= 0 && raw < 1 ? raw : 0;
})();

export function shippingFor(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}

export function taxFor(subtotalCents: number): number {
  return Math.round(subtotalCents * TAX_RATE);
}

export function totalsFor(subtotalCents: number) {
  const shipping = shippingFor(subtotalCents);
  const tax = taxFor(subtotalCents);
  return {
    subtotalCents,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: subtotalCents + shipping + tax,
  };
}
