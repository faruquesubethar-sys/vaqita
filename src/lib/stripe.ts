import "server-only";

import Stripe from "stripe";

/**
 * Online payment is optional.
 *
 * With no secret key there is no payment gateway: an order is recorded and left
 * UNPAID, and the shop settles it with the customer directly (WhatsApp, UPI,
 * on delivery). It must never be marked paid — a "paid" confirmation for money
 * that was never taken is the one bug here that costs real stock.
 *
 * Set STRIPE_SECRET_KEY to turn on card payment.
 */
export const paymentsEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = paymentsEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia" })
  : null;

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
