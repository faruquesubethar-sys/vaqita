import { OrderStatusForm } from "@/components/admin/order-status-form";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  PENDING: "text-stone",
  PAID: "text-brass-lit",
  FULFILLED: "text-success",
  CANCELLED: "text-danger",
  REFUNDED: "text-danger",
};

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <p className="py-32 text-center text-sm text-smoke">No orders yet.</p>
    );
  }

  return (
    <div className="mt-12 space-y-5">
      {orders.map((order) => (
        <article key={order.id} className="border border-bone/10 p-7">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-bone/8 pb-5">
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-sm text-alabaster">{order.number}</h2>
                <span
                  className={cn(
                    "text-[0.625rem] uppercase tracking-[0.2em]",
                    TONE[order.status] ?? "text-stone",
                  )}
                >
                  {order.status}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-smoke">
                {order.email} ·{" "}
                {order.createdAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <span className="text-sm tabular-nums text-alabaster">
                {formatMoney(order.totalCents)}
              </span>

              <OrderStatusForm orderId={order.id} currentStatus={order.status} />
            </div>
          </header>

          <div className="mt-5 grid gap-7 md:grid-cols-[1.4fr_1fr]">
            <ul className="space-y-2.5">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4 text-xs"
                >
                  <span className="text-stone">
                    {item.productName}
                    <span className="text-smoke">
                      {" "}
                      — {item.color} · {item.size} · ×{item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-smoke">
                    {formatMoney(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <address className="text-xs not-italic leading-relaxed text-smoke">
              <span className="eyebrow block pb-2">Ship to</span>
              {order.shipFirstName} {order.shipLastName}
              <br />
              {order.shipLine1}
              {order.shipLine2 && (
                <>
                  <br />
                  {order.shipLine2}
                </>
              )}
              <br />
              {order.shipCity}, {order.shipRegion} {order.shipPostalCode}
              <br />
              {order.shipCountry}
              {order.shipPhone && (
                <>
                  <br />
                  {order.shipPhone}
                </>
              )}
            </address>
          </div>
        </article>
      ))}
    </div>
  );
}
