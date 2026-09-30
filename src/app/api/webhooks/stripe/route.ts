import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { paymentsEnabled, stripe } from "@/lib/stripe";

/**
 * Stripe webhook.
 *
 * This — not the browser returning to /checkout/success — is what marks an
 * order paid. The customer can close the tab before redirecting back, and the
 * success URL is a plain GET anyone could visit, so treating it as proof of
 * payment would let anyone mark their own order paid.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  if (!paymentsEnabled || !stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The raw body is required: signature verification runs over the exact bytes
  // Stripe sent, so parsing it first would invalidate the check.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId ?? session.client_reference_id;
      if (!orderId) break;

      const order = await db.order.findUnique({ where: { id: orderId } });
      // Stripe retries on any non-2xx, so the same event can arrive twice.
      // Skipping an already-paid order keeps that harmless.
      if (!order || order.paymentStatus === "PAID") break;

      await db.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        },
      });

      // The bag has become an order; empty it so it is not bought twice.
      const cart = order.userId
        ? await db.cart.findFirst({ where: { userId: order.userId } })
        : null;
      if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } });

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId) break;

      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order || order.status !== "PENDING") break;

      // Payment was abandoned — cancel and return the stock we had held.
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      });

      break;
    }

    default:
      // Unhandled types are acknowledged so Stripe stops retrying them.
      break;
  }

  return NextResponse.json({ received: true });
}
