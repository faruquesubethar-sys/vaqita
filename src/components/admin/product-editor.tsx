"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createProduct,
  repriceCollection,
  setAllStock,
  updateProduct,
  updateVariantStock,
  type AdminResult,
} from "@/app/actions/admin";
import { ImageUpload } from "@/components/admin/image-upload";
import { cn } from "@/lib/utils";

const GARMENT_TYPES = ["TEE", "LONG_SLEEVE", "SHIRT", "TANK", "HOODIE", "POLO", "TRACK_TOP", "TRACK_PANT", "TROUSER", "CAP"];
const PRINT_STYLES = ["NONE", "BLOCK", "ARCH", "STAMP", "SWAN"];

export type AdminVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  priceCents: number;
  compareAtCents: number | null;
  status: string;
  featured: boolean;
  garmentType: string;
  graphicStyle: string;
  textureUrl: string | null;
  collection: { id: string; name: string } | null;
  images: { url: string }[];
  variants: AdminVariant[];
};

export type AdminCollection = { id: string; name: string; productCount: number };

/** Paise → a plain rupee string for a text input. */
function toRupees(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

const field =
  "w-full border border-bone/15 bg-transparent px-3 py-2 text-sm text-alabaster outline-none transition-colors placeholder:text-smoke focus:border-brass";
const selectField = `${field} [&>option]:bg-obsidian`;
const label = "eyebrow mb-2 block";

function SaveButton({ children = "Save" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-brass/60 px-5 py-2 text-[0.625rem] uppercase tracking-[0.18em] text-brass-lit transition-colors hover:bg-brass hover:text-ink disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Inline result line. Server actions return a typed result rather than throwing. */
function Feedback({ state }: { state: AdminResult | undefined }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cn(
        "mt-3 border-l-2 px-3 py-2 text-xs leading-relaxed",
        state.ok
          ? "border-success bg-success/10 text-bone"
          : "border-danger bg-danger/10 text-bone",
      )}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

/* ------------------------------------------------------------------ panel */

export function ProductEditor({
  products,
  collections,
}: {
  products: AdminProduct[];
  collections: AdminCollection[];
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.includes(q) ||
      (p.collection?.name.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="mt-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or section…"
              aria-label="Filter products"
              className={`${field} max-w-xs`}
            />
            <p className="text-xs text-smoke">
              {filtered.length} of {products.length}
            </p>
          </div>

          <div className="space-y-3">
            {filtered.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                open={openId === product.id}
                onToggle={() =>
                  setOpenId((id) => (id === product.id ? null : product.id))
                }
              />
            ))}
            {filtered.length === 0 && (
              <p className="border border-bone/10 px-6 py-14 text-center text-sm text-smoke">
                Nothing matches “{query}”.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <NewProductForm collections={collections} />
          <RepriceForm collections={collections} />
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- row */

function ProductRow({
  product,
  open,
  onToggle,
}: {
  product: AdminProduct;
  open: boolean;
  onToggle: () => void;
}) {
  const [detailState, detailAction] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => updateProduct(fd),
    undefined,
  );
  const [stockState, stockAction] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => setAllStock(fd),
    undefined,
  );

  const totalStock = product.variants.reduce((n, v) => n + v.stock, 0);

  return (
    <article className="border border-bone/10">
      {/* Summary row — always visible, click to expand. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-5 p-4 text-left transition-colors hover:bg-bone/3"
      >
        <div className="relative h-16 w-13 shrink-0 overflow-hidden bg-graphite">
          {product.images[0] && (
            <Image
              src={product.images[0].url}
              alt=""
              fill
              sizes="52px"
              className="object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-alabaster">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-smoke">
            {product.collection?.name ?? "No section"} · {product.garmentType} ·{" "}
            {product.variants.length} sizes
            {product.textureUrl && (
              <span className="text-brass-lit"> · photo in 3D</span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm tabular-nums text-alabaster">
            ₹{toRupees(product.priceCents)}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[0.625rem] uppercase tracking-[0.18em]",
              totalStock === 0 ? "text-danger" : "text-smoke",
            )}
          >
            {totalStock} in stock
          </p>
        </div>

        <StatusPill status={product.status} featured={product.featured} />

        <span
          aria-hidden
          className={cn(
            "shrink-0 text-stone transition-transform duration-300",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-bone/10 p-5">
          {/* Details */}
          <form action={detailAction}>
            <input type="hidden" name="productId" value={product.id} />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={label} htmlFor={`name-${product.id}`}>
                  Name
                </label>
                <input
                  id={`name-${product.id}`}
                  name="name"
                  defaultValue={product.name}
                  className={field}
                />
              </div>

              <div>
                <label className={label} htmlFor={`price-${product.id}`}>
                  Price (₹)
                </label>
                <input
                  id={`price-${product.id}`}
                  name="price"
                  inputMode="decimal"
                  defaultValue={toRupees(product.priceCents)}
                  className={field}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={label} htmlFor={`subtitle-${product.id}`}>
                  Subtitle
                </label>
                <input
                  id={`subtitle-${product.id}`}
                  name="subtitle"
                  defaultValue={product.subtitle ?? ""}
                  className={field}
                />
              </div>

              <div>
                <label className={label} htmlFor={`compare-${product.id}`}>
                  Was (₹, optional)
                </label>
                <input
                  id={`compare-${product.id}`}
                  name="compareAt"
                  inputMode="decimal"
                  defaultValue={toRupees(product.compareAtCents)}
                  placeholder="—"
                  className={field}
                />
              </div>

              <div>
                <label className={label} htmlFor={`status-${product.id}`}>
                  Status
                </label>
                <select
                  id={`status-${product.id}`}
                  name="status"
                  defaultValue={product.status}
                  className={selectField}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className={label} htmlFor={`garment-${product.id}`}>
                  3D garment
                </label>
                <select
                  id={`garment-${product.id}`}
                  name="garmentType"
                  defaultValue={product.garmentType}
                  className={selectField}
                >
                  {GARMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor={`print-${product.id}`}>
                  Print
                </label>
                <select
                  id={`print-${product.id}`}
                  name="graphicStyle"
                  defaultValue={product.graphicStyle}
                  className={selectField}
                >
                  {PRINT_STYLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2.5 text-xs text-stone">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={product.featured}
                  className="h-3.5 w-3.5 accent-[#b08d57]"
                />
                Show on the homepage
              </label>

              <SaveButton>Save details</SaveButton>

              <Link
                href={`/products/${product.slug}`}
                className="text-[0.625rem] uppercase tracking-[0.18em] text-smoke transition-colors hover:text-alabaster"
              >
                View on site →
              </Link>
            </div>

            <Feedback state={detailState} />
          </form>

          <ImageUpload
            productId={product.id}
            productName={product.name}
            textureUrl={product.textureUrl}
          />

          {/* Stock */}
          <div className="mt-8 border-t border-bone/10 pt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <h4 className="eyebrow">Stock by size</h4>

              <form action={stockAction} className="flex items-end gap-2">
                <input type="hidden" name="productId" value={product.id} />
                <div>
                  <label
                    className="eyebrow mb-1.5 block"
                    htmlFor={`bulk-${product.id}`}
                  >
                    Set all to
                  </label>
                  <input
                    id={`bulk-${product.id}`}
                    name="stock"
                    type="number"
                    min={0}
                    max={9999}
                    defaultValue={0}
                    className={`${field} w-24`}
                  />
                </div>
                <SaveButton>Apply</SaveButton>
              </form>
            </div>

            <Feedback state={stockState} />

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {product.variants.map((variant) => (
                <VariantStock key={variant.id} variant={variant} />
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function StatusPill({ status, featured }: { status: string; featured: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {featured && (
        <span
          title="On the homepage"
          className="h-1.5 w-1.5 rounded-full bg-brass"
          aria-label="Featured"
        />
      )}
      <span
        className={cn(
          "border px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.18em]",
          status === "ACTIVE" && "border-success/50 text-success",
          status === "DRAFT" && "border-stone/40 text-stone",
          status === "ARCHIVED" && "border-danger/40 text-danger",
        )}
      >
        {status}
      </span>
    </span>
  );
}

function VariantStock({ variant }: { variant: AdminVariant }) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => updateVariantStock(fd),
    undefined,
  );

  return (
    <form
      action={action}
      className={cn(
        "flex items-center gap-3 border px-3 py-2 transition-colors",
        state && !state.ok ? "border-danger/50" : "border-bone/8",
      )}
    >
      <input type="hidden" name="variantId" value={variant.id} />
      <span
        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-bone/20"
        style={{ backgroundColor: variant.colorHex }}
        title={variant.color}
      />
      <span className="min-w-0 flex-1 truncate text-xs text-stone">
        {variant.size}
        <span className="text-smoke"> · {variant.color}</span>
      </span>
      <input
        name="stock"
        type="number"
        min={0}
        max={9999}
        defaultValue={variant.stock}
        aria-label={`Stock for ${variant.color} size ${variant.size}`}
        className={cn(
          "w-16 border border-bone/15 bg-transparent px-2 py-1.5 text-center text-xs tabular-nums outline-none transition-colors focus:border-brass",
          variant.stock === 0 ? "text-danger" : "text-alabaster",
        )}
      />
      <button
        type="submit"
        className="text-[0.625rem] uppercase tracking-[0.15em] text-smoke transition-colors hover:text-brass-lit"
      >
        Set
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- new product */

function NewProductForm({ collections }: { collections: AdminCollection[] }) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => createProduct(fd),
    undefined,
  );

  return (
    <section className="border border-bone/10 p-5">
      <h3 className="eyebrow text-brass-lit">Add a piece</h3>
      <p className="mt-2 text-xs leading-relaxed text-smoke">
        Creates a draft with a full size run in one colourway. Add imagery, then
        switch it to Active.
      </p>

      <form action={action} className="mt-5 space-y-4">
        <div>
          <label className={label} htmlFor="new-name">
            Name
          </label>
          <input id="new-name" name="name" required className={field} />
        </div>

        <div>
          <label className={label} htmlFor="new-collection">
            Section
          </label>
          <select id="new-collection" name="collectionId" className={selectField}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="new-price">
              Price (₹)
            </label>
            <input
              id="new-price"
              name="price"
              inputMode="decimal"
              defaultValue="1500"
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="new-stock">
              Stock each
            </label>
            <input
              id="new-stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={5}
              className={field}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="new-garment">
              3D garment
            </label>
            <select id="new-garment" name="garmentType" className={selectField}>
              {GARMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="new-print">
              Print
            </label>
            <select id="new-print" name="graphicStyle" className={selectField}>
              {PRINT_STYLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={label} htmlFor="new-colour">
              Colourway
            </label>
            <input
              id="new-colour"
              name="colorName"
              required
              defaultValue="Washed Black"
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="new-hex">
              Hex
            </label>
            {/* A colour input and a text input bound to the same name would
                submit twice, so this is the text one plus a live swatch. */}
            <input
              id="new-hex"
              name="colorHex"
              required
              defaultValue="#2b2b2e"
              pattern="#[0-9a-fA-F]{6}"
              className={`${field} w-28 font-mono`}
            />
          </div>
        </div>

        <SaveButton>Create draft</SaveButton>
        <Feedback state={state} />
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- reprice */

function RepriceForm({ collections }: { collections: AdminCollection[] }) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(
    async (_prev, fd) => repriceCollection(fd),
    undefined,
  );

  return (
    <section className="border border-bone/10 p-5">
      <h3 className="eyebrow text-brass-lit">Reprice a section</h3>
      <p className="mt-2 text-xs leading-relaxed text-smoke">
        Moves every price in a section by a percentage. Rounded to the rupee and
        floored at ₹1. There is no undo — note the old figures first.
      </p>

      <form action={action} className="mt-5 space-y-4">
        <div>
          <label className={label} htmlFor="reprice-collection">
            Section
          </label>
          <select
            id="reprice-collection"
            name="collectionId"
            className={selectField}
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="reprice-percent">
            Change (%)
          </label>
          <input
            id="reprice-percent"
            name="percent"
            type="number"
            step="1"
            min={-90}
            max={500}
            defaultValue={-10}
            className={field}
          />
        </div>

        <SaveButton>Apply</SaveButton>
        <Feedback state={state} />
      </form>
    </section>
  );
}
