import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentUser } from "./auth";
import { db } from "./db";
import { totalsFor } from "./money";

const CART_COOKIE = "vq_cart";

export type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  unitPriceCents: number;
  lineTotalCents: number;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

export const EMPTY_CART: CartView = {
  id: null,
  lines: [],
  itemCount: 0,
  subtotalCents: 0,
  shippingCents: 0,
  taxCents: 0,
  totalCents: 0,
  currency: "INR",
};

/** Reads the cart token without creating one. Safe to call while rendering. */
async function readCartToken() {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

/**
 * Returns the cart for this visitor, creating one if needed.
 *
 * Only call from a Server Action or route handler — it writes a cookie, which
 * React forbids during render.
 */
export async function getOrCreateCart() {
  const jar = await cookies();
  const user = await getCurrentUser();
  let token = jar.get(CART_COOKIE)?.value;

  // A signed-in visitor's cart follows the account, not the browser. This also
  // adopts whatever they had built anonymously before signing in.
  if (user) {
    const existing = await db.cart.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) {
      if (token && token !== existing.token) {
        await mergeAnonymousCart(token, existing.id);
      }
      if (token !== existing.token) {
        jar.set(CART_COOKIE, existing.token, cartCookieOptions());
      }
      return existing;
    }
  }

  if (token) {
    const found = await db.cart.findUnique({ where: { token } });
    if (found) {
      // Claim an anonymous cart the moment its owner signs in.
      if (user && !found.userId) {
        return db.cart.update({
          where: { id: found.id },
          data: { userId: user.id },
        });
      }
      return found;
    }
  }

  token = crypto.randomUUID();
  const created = await db.cart.create({
    data: { token, userId: user?.id ?? null },
  });
  jar.set(CART_COOKIE, token, cartCookieOptions());
  return created;
}

function cartCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  };
}

/** Folds an anonymous cart's lines into the account cart, then discards it. */
async function mergeAnonymousCart(anonToken: string, targetCartId: string) {
  const anon = await db.cart.findUnique({
    where: { token: anonToken },
    include: { items: true },
  });
  if (!anon || anon.id === targetCartId) return;

  for (const item of anon.items) {
    const existing = await db.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: targetCartId, variantId: item.variantId },
      },
    });
    const variant = await db.variant.findUnique({
      where: { id: item.variantId },
      select: { stock: true },
    });
    if (!variant) continue;

    const wanted = (existing?.quantity ?? 0) + item.quantity;
    const quantity = Math.min(wanted, variant.stock);
    if (quantity <= 0) continue;

    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      await db.cartItem.create({
        data: { cartId: targetCartId, variantId: item.variantId, quantity },
      });
    }
  }

  await db.cart.delete({ where: { id: anon.id } });
}

/**
 * Builds the cart as the UI needs it: prices resolved, totals computed.
 *
 * Read-only, so it is safe during render. Prices come from the live catalogue
 * rather than anything the client sent — a stale or forged price in a request
 * body can never influence what is charged.
 */
export const getCart = cache(async (): Promise<CartView> => {
  const token = await readCartToken();
  const user = await getCurrentUser();

  const cart = user
    ? await db.cart.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: cartInclude,
      })
    : token
      ? await db.cart.findUnique({ where: { token }, include: cartInclude })
      : null;

  if (!cart) return EMPTY_CART;
  return buildCartView(cart);
});

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            include: { images: { orderBy: { position: "asc" as const }, take: 1 } },
          },
        },
      },
    },
  },
};

type CartWithItems = NonNullable<
  Awaited<ReturnType<typeof db.cart.findFirst<{ include: typeof cartInclude }>>>
>;

function buildCartView(cart: CartWithItems): CartView {
  const lines: CartLine[] = cart.items.map((item) => {
    const variant = item.variant;
    const product = variant.product;
    const unitPriceCents = variant.priceCents ?? product.priceCents;
    return {
      id: item.id,
      variantId: variant.id,
      quantity: item.quantity,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex,
      stock: variant.stock,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.quantity,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const totals = totalsFor(subtotalCents);

  return {
    id: cart.id,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    currency: "INR",
    ...totals,
  };
}

export async function getCartViewById(cartId: string): Promise<CartView> {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
  if (!cart) return EMPTY_CART;
  return buildCartView(cart);
}
