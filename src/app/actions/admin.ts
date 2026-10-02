"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeProductImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "CANCELLED",
  "REFUNDED",
] as const;

const GARMENT_TYPES = ["TEE", "LONG_SLEEVE", "SHIRT", "TANK", "HOODIE", "POLO", "TRACK_TOP", "TRACK_PANT", "TROUSER", "CAP"] as const;
const PRINT_STYLES = ["NONE", "BLOCK", "ARCH", "STAMP", "SWAN"] as const;
const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

/** Every admin action re-checks authorisation itself. */
async function guard(): Promise<string | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return "You do not have permission to do that.";
  }
}

// ------------------------------------------------------------------ orders

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
});

/**
 * Runs a database write and reports a failure instead of throwing.
 *
 * Server actions that throw take the whole page to the error boundary — the
 * admin panel showed "A loose thread" with nothing said about what failed or
 * what to do. A shop owner adding stock needs the form to stay where it is
 * and tell them, not to lose the page.
 *
 * The real error is logged rather than shown. Database messages name tables
 * and constraints, which is of no use to the person reading and of some use
 * to anyone else.
 */
async function attempt<T>(
  what: string,
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    console.error(`[admin] ${what} failed:`, error);
    return {
      ok: false,
      error: `Could not ${what}. Nothing was changed — try again, and if it keeps happening send us this: ${new Date().toISOString().slice(0, 16)}.`,
    };
  }
}

export async function updateOrderStatus(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: "That status isn't valid." };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const nextStatus = parsed.data.status;
  const releasingStock =
    (nextStatus === "CANCELLED" || nextStatus === "REFUNDED") &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED";

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paymentStatus:
          nextStatus === "REFUNDED"
            ? "REFUNDED"
            : nextStatus === "PAID" || nextStatus === "FULFILLED"
              ? "PAID"
              : order.paymentStatus,
      },
    });

    // Cancelling or refunding returns the pieces to sellable stock, and only
    // once — re-cancelling an already-cancelled order must not inflate it.
    if (releasingStock) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, message: `${order.number} set to ${nextStatus}.` };
}

// ---------------------------------------------------------------- products

/**
 * Prices are entered in rupees and stored in paise.
 *
 * `coerce` on a string like "1,650" would yield NaN, so the comma is stripped
 * before parsing — shop staff type prices the way they read them.
 */
const MAX_PAISE = 1_000_000_00;

const rupees = z.string().transform((raw, ctx) => {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  const n = Number(cleaned);
  if (cleaned === "" || !Number.isFinite(n) || n < 0) {
    ctx.addIssue({ code: "custom", message: "Enter a price in rupees." });
    return z.NEVER;
  }
  const paise = Math.round(n * 100);
  if (paise > MAX_PAISE) {
    ctx.addIssue({ code: "custom", message: "That price is too large." });
    return z.NEVER;
  }
  return paise;
});

/** Same, but an empty string means "no compare-at price". */
const optionalRupees = z.string().transform((raw, ctx) => {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    ctx.addIssue({ code: "custom", message: "Enter a price in rupees, or leave it empty." });
    return z.NEVER;
  }
  const paise = Math.round(n * 100);
  if (paise > MAX_PAISE) {
    ctx.addIssue({ code: "custom", message: "That price is too large." });
    return z.NEVER;
  }
  return paise;
});

const productSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required.").max(120),
  subtitle: z.string().trim().max(160).optional(),
  priceCents: rupees,
  compareAtCents: optionalRupees,
  status: z.enum(PRODUCT_STATUSES),
  garmentType: z.enum(GARMENT_TYPES),
  graphicStyle: z.enum(PRINT_STYLES),
  featured: z.enum(["on", "off"]).transform((v) => v === "on"),
});

export async function updateProduct(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = productSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    subtitle: formData.get("subtitle") || undefined,
    priceCents: formData.get("price") ?? "",
    compareAtCents: formData.get("compareAt") ?? "",
    status: formData.get("status"),
    garmentType: formData.get("garmentType"),
    graphicStyle: formData.get("graphicStyle"),
    featured: formData.get("featured") ? "on" : "off",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const { productId, ...data } = parsed.data;

  // A "sale" price below the real price is the wrong way round and would
  // render as a nonsense strike-through.
  if (data.compareAtCents !== null && data.compareAtCents <= data.priceCents) {
    return {
      ok: false,
      error: "Compare-at price must be higher than the price, or left empty.",
    };
  }

  await db.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      subtitle: data.subtitle ?? null,
      priceCents: data.priceCents,
      compareAtCents: data.compareAtCents,
      status: data.status,
      garmentType: data.garmentType,
      graphicStyle: data.graphicStyle,
      featured: data.featured,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/collections");
  revalidatePath("/");
  return { ok: true, message: `${data.name} saved.` };
}

const newProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  collectionId: z.string().min(1, "Pick a section."),
  priceCents: rupees,
  garmentType: z.enum(GARMENT_TYPES),
  graphicStyle: z.enum(PRINT_STYLES),
  colorName: z.string().trim().min(1, "Give the colourway a name.").max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value like #2b2b2e."),
  stock: z.coerce.number().int().min(0).max(9999),
});

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

export async function createProduct(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = newProductSchema.safeParse({
    name: formData.get("name"),
    collectionId: formData.get("collectionId"),
    priceCents: formData.get("price") ?? "",
    garmentType: formData.get("garmentType"),
    graphicStyle: formData.get("graphicStyle"),
    colorName: formData.get("colorName"),
    colorHex: formData.get("colorHex"),
    stock: formData.get("stock") ?? "0",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;

  // Slugs must stay unique; suffix until one is free rather than failing.
  const base = slugify(d.name) || "piece";
  let slug = base;

  const prepared = await attempt("add that piece", async () => {
    for (let n = 2; await db.product.findUnique({ where: { slug } }); n++) {
      slug = `${base}-${n}`;
    }
    return db.product.aggregate({ _max: { position: true } });
  });
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const maxPosition = prepared.value;

  const created = await attempt("add that piece", () =>
    db.product.create({
    data: {
      slug,
      name: d.name,
      description: `${d.name} — ${d.colorName}.`,
      priceCents: d.priceCents,
      collectionId: d.collectionId,
      garmentType: d.garmentType,
      graphicStyle: d.graphicStyle,
      status: "DRAFT",
      position: (maxPosition._max.position ?? 0) + 1,
      },
    }),
  );
  if (!created.ok) return { ok: false, error: created.error };
  const product = created.value;

  // A product with no variants cannot be bought or tried on, so give it a full
  // size run in the colourway straight away.
  //
  // The SKU is built from the product's own id, not from its name. It used to
  // be the first six letters of the slug plus three of the colour, and `sku`
  // is unique across the whole table — so a second product whose name began
  // with the same six letters in the same colourway collided, the database
  // refused the write, and the admin panel fell over to the error page with
  // nothing explaining why. "Mustang tee" and "Mustang acid wash" is all it
  // took.
  const sized = await attempt("add sizes to that piece", () =>
    db.variant.createMany({
      data: DEFAULT_SIZES.map((size, i) => ({
        productId: product.id,
        sku: `VQ-${product.id.slice(-8).toUpperCase()}-${size}`,
        size,
        color: d.colorName,
        colorHex: d.colorHex,
        stock: d.stock,
        position: i,
      })),
    }),
  );
  if (!sized.ok) return { ok: false, error: sized.error };

  revalidatePath("/admin/products");
  return {
    ok: true,
    message: `${d.name} created as a draft with ${DEFAULT_SIZES.length} sizes. Add imagery, then set it Active.`,
  };
}

const stockSchema = z.object({
  variantId: z.string().min(1),
  stock: z.coerce.number().int().min(0).max(9999),
});

export async function updateVariantStock(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = stockSchema.safeParse({
    variantId: formData.get("variantId"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) return { ok: false, error: "Stock must be a whole number." };

  await db.variant.update({
    where: { id: parsed.data.variantId },
    data: { stock: parsed.data.stock },
  });

  revalidatePath("/admin/products");
  return { ok: true, message: "Stock updated." };
}

/** Applies one stock number to every size of a product at once. */
const bulkStockSchema = z.object({
  productId: z.string().min(1),
  stock: z.coerce.number().int().min(0).max(9999),
});

export async function setAllStock(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = bulkStockSchema.safeParse({
    productId: formData.get("productId"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) return { ok: false, error: "Stock must be a whole number." };

  const { count } = await db.variant.updateMany({
    where: { productId: parsed.data.productId },
    data: { stock: parsed.data.stock },
  });

  revalidatePath("/admin/products");
  return { ok: true, message: `Set ${count} sizes to ${parsed.data.stock}.` };
}

/** Raises or lowers every price in a section by a percentage. */
const repriceSchema = z.object({
  collectionId: z.string().min(1),
  percent: z.coerce.number().min(-90).max(500),
});

export async function repriceCollection(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = repriceSchema.safeParse({
    collectionId: formData.get("collectionId"),
    percent: formData.get("percent"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a percentage between -90 and 500." };
  }

  const products = await db.product.findMany({
    where: { collectionId: parsed.data.collectionId },
    select: { id: true, priceCents: true },
  });
  if (products.length === 0) return { ok: false, error: "No products in that section." };

  const factor = 1 + parsed.data.percent / 100;

  // Rounded to the nearest rupee, and floored at ₹1 so a large negative
  // percentage can never produce a free or negative price.
  await db.$transaction(
    products.map((p) =>
      db.product.update({
        where: { id: p.id },
        data: {
          priceCents: Math.max(100, Math.round((p.priceCents * factor) / 100) * 100),
        },
      }),
    ),
  );

  revalidatePath("/admin/products");
  revalidatePath("/collections");
  return {
    ok: true,
    message: `Repriced ${products.length} product(s) by ${parsed.data.percent}%.`,
  };
}


// ----------------------------------------------------------------- imagery

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Stores an uploaded product photo and points the 3D preview at it.
 *
 * Where the bytes actually go is `lib/storage`'s problem: Cloudinary when it is
 * configured, the local `public/uploads` folder otherwise.
 */
export async function uploadProductImage(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const productId = formData.get("productId");
  const file = formData.get("file");
  const setAsTexture = formData.get("setAsTexture") === "on";
  const setAsBackTexture = formData.get("setAsBackTexture") === "on";
  const alt = (formData.get("alt") as string | null)?.trim() || null;

  if (typeof productId !== "string" || !productId) {
    return { ok: false, error: "Missing product." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image first." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG or WebP image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That image is over 6MB. Try a smaller one." };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, error: "Product not found." };

  let url: string;
  try {
    ({ url } = await storeProductImage(file, product.slug));
  } catch {
    // A storage outage must not leave a ProductImage row pointing at a file
    // that was never written.
    return { ok: false, error: "Could not store that image. Try again." };
  }

  await db.productImage.create({
    data: {
      productId: product.id,
      url,
      alt,
      position: product._count.images,
    },
  });

  if (setAsTexture || setAsBackTexture) {
    await db.product.update({
      where: { id: product.id },
      data: setAsBackTexture ? { textureBackUrl: url } : { textureUrl: url },
    });
  }

  revalidatePath("/admin/products");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/collections");

  return {
    ok: true,
    message: setAsBackTexture
      ? "Image saved as the back of the 3D model."
      : setAsTexture
        ? "Image saved and wired into the 3D preview."
        : "Image saved to the gallery.",
  };
}

const colourwaySchema = z.object({
  productId: z.string().min(1),
  colorName: z.string().trim().min(1, "Name the colourway.").max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value like #2b2b2e."),
});

/** Repaints every variant of a product — used after a photo suggests a colour. */
export async function applyColourway(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const parsed = colourwaySchema.safeParse({
    productId: formData.get("productId"),
    colorName: formData.get("colorName"),
    colorHex: formData.get("colorHex"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const { productId, colorName, colorHex } = parsed.data;

  // `color` is half of a unique key with `size`, so renaming one colourway into
  // the name of another would collide. Only the first colourway is repainted.
  const first = await db.variant.findFirst({
    where: { productId },
    orderBy: { position: "asc" },
    select: { color: true },
  });
  if (!first) return { ok: false, error: "That product has no variants yet." };

  const clash = await db.variant.findFirst({
    where: { productId, color: colorName, NOT: { color: first.color } },
  });
  if (clash) {
    return { ok: false, error: `This product already has a "${colorName}" colourway.` };
  }

  const { count } = await db.variant.updateMany({
    where: { productId, color: first.color },
    data: { color: colorName, colorHex },
  });

  revalidatePath("/admin/products");
  revalidatePath("/collections");
  return { ok: true, message: `Repainted ${count} variants to ${colorName}.` };
}

/** Detaches the photo from the 3D preview, returning it to a flat colourway. */
export async function clearTexture(formData: FormData): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) {
    return { ok: false, error: "Missing product." };
  }

  await db.product.update({
    where: { id: productId },
    data: { textureUrl: null, textureBackUrl: null },
  });
  revalidatePath("/admin/products");
  return { ok: true, message: "3D preview returned to a flat colourway." };
}
