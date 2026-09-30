import Link from "next/link";

import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [paidOrders, pendingCount, lowStock, recentOrders, productCount] =
    await Promise.all([
      db.order.findMany({
        where: { paymentStatus: "PAID" },
        select: { totalCents: true },
      }),
      db.order.count({ where: { status: "PENDING" } }),
      db.variant.findMany({
        where: { stock: { lte: 3 } },
        orderBy: { stock: "asc" },
        include: { product: { select: { name: true, slug: true } } },
        take: 8,
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { items: { select: { id: true } } },
      }),
      db.product.count({ where: { status: "ACTIVE" } }),
    ]);

  const revenue = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);

  const stats = [
    { label: "Revenue", value: formatMoney(revenue), hint: `${paidOrders.length} paid` },
    { label: "Awaiting payment", value: String(pendingCount), hint: "orders" },
    { label: "Live garments", value: String(productCount), hint: "active" },
    { label: "Low stock", value: String(lowStock.length), hint: "3 or fewer" },
  ];

  return (
    <>
      <section className="mt-12 grid gap-px border border-bone/10 bg-bone/10 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-ink p-7">
            <p className="eyebrow">{stat.label}</p>
            {/* Sans, not the display serif: Cormorant sets old-style figures,
                which are lovely in prose and wrong for numbers being read. */}
            <p className="mt-4 text-3xl font-light tabular-nums text-alabaster">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-smoke">{stat.hint}</p>
          </div>
        ))}
      </section>

      <div className="mt-14 grid gap-14 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between border-b border-bone/10 pb-4">
            <h2 className="eyebrow">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="text-[0.6875rem] uppercase tracking-[0.18em] text-smoke transition-colors hover:text-alabaster"
            >
              All orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="py-14 text-center text-sm text-smoke">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-bone/8">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm text-alabaster">{order.number}</p>
                    <p className="mt-0.5 truncate text-xs text-smoke">{order.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums text-alabaster">
                      {formatMoney(order.totalCents)}
                    </p>
                    <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.18em] text-smoke">
                      {order.status} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between border-b border-bone/10 pb-4">
            <h2 className="eyebrow">Low stock</h2>
            <Link
              href="/admin/products"
              className="text-[0.6875rem] uppercase tracking-[0.18em] text-smoke transition-colors hover:text-alabaster"
            >
              Inventory
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="py-14 text-center text-sm text-smoke">
              Everything is well stocked.
            </p>
          ) : (
            <ul className="divide-y divide-bone/8">
              {lowStock.map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-alabaster">
                      {variant.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-smoke">
                      {variant.color} · {variant.size} · {variant.sku}
                    </p>
                  </div>
                  <span
                    className={
                      variant.stock === 0
                        ? "shrink-0 text-sm tabular-nums text-danger"
                        : "shrink-0 text-sm tabular-nums text-brass-lit"
                    }
                  >
                    {variant.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
