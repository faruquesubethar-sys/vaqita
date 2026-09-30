"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCartViewById, getOrCreateCart, type CartView } from "@/lib/cart";
import { db } from "@/lib/db";

export type CartActionResult =
  | { ok: true; cart: CartView; message?: string }
  | { ok: false; error: string };

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

/**
 * Adds a variant to the cart.
 *
 * Quantity is always validated against live stock, and the resulting quantity
 * is clamped rather than rejected outright — a visitor asking for three of
 * something with two left should end up with two and be told, not bounced.
 */
export async function addToCart(
  variantId: string,
  quantity = 1,
): Promise<CartActionResult> {
  const parsed = addSchema.safeParse({ variantId, quantity });
  if (!parsed.success) return { ok: false, error: "That selection isn't valid." };

  const variant = await db.variant.findUnique({
    where: { id: parsed.data.variantId },
    include: { product: { select: { status: true, name: true } } },
  });

  if (!variant || variant.product.status !== "ACTIVE") {
    return { ok: false, error: "This piece is no longer available." };
  }
  if (variant.stock <= 0) {
    return { ok: false, error: "That size is out of stock." };
  }

  const cart = await getOrCreateCart();

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });

  const requested = (existing?.quantity ?? 0) + parsed.data.quantity;
  const finalQuantity = Math.min(requested, variant.stock);

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: finalQuantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, variantId: variant.id, quantity: finalQuantity },
    });
  }

  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  const view = await getCartViewById(cart.id);
  revalidatePath("/cart");

  return {
    ok: true,
    cart: view,
    message:
      finalQuantity < requested
        ? `Only ${variant.stock} left in ${variant.size} — we've added what remains.`
        : undefined,
  };
}

export async function updateCartLine(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) {
    return { ok: false, error: "That quantity isn't valid." };
  }

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { variant: { select: { stock: true, size: true } } },
  });
  if (!item) return { ok: false, error: "That item is no longer in your bag." };

  if (quantity === 0) return removeCartLine(itemId);

  const capped = Math.min(quantity, item.variant.stock);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: capped } });

  const view = await getCartViewById(item.cartId);
  revalidatePath("/cart");

  return {
    ok: true,
    cart: view,
    message:
      capped < quantity ? `Only ${item.variant.stock} left in that size.` : undefined,
  };
}

export async function removeCartLine(itemId: string): Promise<CartActionResult> {
  const item = await db.cartItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false, error: "That item is no longer in your bag." };

  await db.cartItem.delete({ where: { id: itemId } });

  const view = await getCartViewById(item.cartId);
  revalidatePath("/cart");
  return { ok: true, cart: view };
}
