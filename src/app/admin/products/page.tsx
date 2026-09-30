import { ProductEditor } from "@/components/admin/product-editor";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, collections] = await Promise.all([
    db.product.findMany({
      orderBy: [{ status: "asc" }, { position: "asc" }],
      include: {
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        variants: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            colorHex: true,
            stock: true,
          },
        },
        collection: { select: { id: true, name: true } },
      },
    }),
    db.collection.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true, _count: { select: { products: true } } },
    }),
  ]);

  return (
    <>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-stone">
        Everything about a piece is editable here — price, status, which 3D
        garment it uses, and stock per size. Changes go live immediately.
      </p>

      <ProductEditor
        products={products}
        collections={collections.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c._count.products,
        }))}
      />
    </>
  );
}
