"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { totalsFor } from "@/lib/money";
import { paymentsEnabled, siteUrl, stripe } from "@/lib/stripe";

export type CheckoutState = { error?: string } | undefined;

const shippingSchema = z.object({
  email: z.email("Enter a valid email address."),
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  line1: z.string().trim().min(1, "Address is required.").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, "City is required.").max(80),
  region: z.string().trim().min(1, "State is required.").max(80),
  postalCode: z.string().trim().min(4, "Enter a valid postcode.").max(16),
  country: z.string().trim().min(2).max(2).default("IN"),
  phone: z.string().trim().max(24).optional(),
});

/** VQ-2026-0001. Sequential within the year, with a collision retry. */
async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.order.count({
    where: { number: { startsWith: `VQ-${year}-` } },
  });
  return `VQ-${year}-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Creates the order and starts payment.
 *
 * Everything that determines what is charged — prices, shipping, tax — is read
 * from the database inside this action. Nothing from the form contributes to
 * the total, so a tampered request can change the delivery address but never
 * the amount.
 */
export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = shippingSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country") || "IN",
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const cart = await getCart();
  if (cart.lines.length === 0 || !cart.id) {
    return { error: "Your bag is empty." };
  }

  const user = await getCurrentUser();
  const ship = parsed.data;

  // Re-verify stock immediately before committing. The cart may have sat open
  // for an hour while the last piece sold.
  const variants = await db.variant.findMany({
    where: { id: { in: cart.lines.map((l) => l.variantId) } },
    include: { product: { select: { slug: true, name: true, priceCents: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  for (const line of cart.lines) {
    const variant = byId.get(line.variantId);
    if (!variant) {
      return { error: `${line.productName} is no longer available.` };
    }
    if (variant.stock < line.quantity) {
      return {
        error: `Only ${variant.stock} left of ${line.productName} in ${line.size}. Please adjust your bag.`,
      };
    }
  }

  // Recompute from live prices rather than trusting the rendered cart.
  const subtotal = cart.lines.reduce((sum, line) => {
    const variant = byId.get(line.variantId)!;
    const unit = variant.priceCents ?? variant.product.priceCents;
    return sum + unit * line.quantity;
  }, 0);
  const totals = totalsFor(subtotal);

  const number = await nextOrderNumber();

  // One transaction: the order, its lines, and the stock decrement either all
  // land or none do. A partial write here would sell stock that was never
  // reserved, or reserve stock for an order that does not exist.
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        userId: user?.id ?? null,
        email: ship.email.toLowerCase(),
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        shipFirstName: ship.firstName,
        shipLastName: ship.lastName,
        shipLine1: ship.line1,
        shipLine2: ship.line2 ?? null,
        shipCity: ship.city,
        shipRegion: ship.region,
        shipPostalCode: ship.postalCode,
        shipCountry: ship.country,
        shipPhone: ship.phone ?? null,
        items: {
          create: cart.lines.map((line) => {
            const variant = byId.get(line.variantId)!;
            return {
              variantId: variant.id,
              productSlug: variant.product.slug,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              imageUrl: line.imageUrl,
              unitPriceCents: variant.priceCents ?? variant.product.priceCents,
              quantity: line.quantity,
            };
          }),
        },
      },
    });

    for (const line of cart.lines) {
      await tx.variant.update({
        where: { id: line.variantId },
        data: { stock: { decrement: line.quantity } },
      });
    }

    return created;
  });

  // --- payment -------------------------------------------------------------

  if (paymentsEnabled && stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      line_items: [
        ...cart.lines.map((line) => {
          const variant = byId.get(line.variantId)!;
          return {
            quantity: line.quantity,
            price_data: {
              currency: "inr",
              unit_amount: variant.priceCents ?? variant.product.priceCents,
              product_data: {
                name: variant.product.name,
                description: `${variant.color} · Size ${variant.size}`,
              },
            },
          };
        }),
        // Shipping and tax as their own lines, so the Stripe total matches the
        // total the customer was shown to the paise.
        ...(totals.shippingCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "inr",
                  unit_amount: totals.shippingCents,
                  product_data: { name: "Shipping" },
                },
              },
            ]
          : []),
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: totals.taxCents,
            product_data: { name: "Tax" },
          },
        },
      ],
      success_url: `${siteUrl()}/checkout/success?order=${order.number}`,
      cancel_url: `${siteUrl()}/cart`,
      metadata: { orderId: order.id, orderNumber: order.number },
    });

    await db.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) return { error: "Could not start payment. Please try again." };
    redirect(session.url);
  }

  // No payment gateway configured. The order stands as PENDING / UNPAID and
  // is settled with the customer directly. Deliberately no status write here:
  // the record must not claim money arrived when none did.
  await clearCart(cart.id);
  redirect(`/checkout/success?order=${order.number}`);
}

async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
  const jar = await cookies();
  jar.delete("vq_cart");
}
