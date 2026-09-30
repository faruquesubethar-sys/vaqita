import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-stone/40 text-stone",
  PAID: "border-brass/50 text-brass-lit",
  FULFILLED: "border-success/50 text-success",
  CANCELLED: "border-danger/50 text-danger",
  REFUNDED: "border-danger/50 text-danger",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="shell pt-40 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-bone/10 pb-10">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.5rem)] text-alabaster">
            {user.name ?? user.email}
          </h1>
          <p className="mt-3 text-sm text-smoke">{user.email}</p>
        </div>

        <div className="flex items-center gap-6">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="border border-brass/50 px-6 py-3 text-xs uppercase tracking-[0.2em] text-brass-lit transition-colors hover:border-brass hover:bg-brass hover:text-ink"
            >
              Atelier admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs uppercase tracking-[0.2em] text-smoke transition-colors hover:text-danger"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mt-14">
        <h2 className="eyebrow">Order history</h2>

        {orders.length === 0 ? (
          <div className="mt-10 border border-bone/10 px-8 py-20 text-center">
            <p className="display text-3xl text-stone">No orders yet.</p>
            <Link
              href="/collections"
              className="mt-8 inline-block border border-bone/25 px-8 py-3.5 text-xs uppercase tracking-[0.22em] text-alabaster transition-colors hover:border-brass hover:text-brass-lit"
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-6">
            {orders.map((order) => (
              <li key={order.id} className="border border-bone/10 p-7">
                <div className="flex flex-wrap items-start justify-between gap-5 border-b border-bone/8 pb-5">
                  <div>
                    <p className="text-sm text-alabaster">{order.number}</p>
                    <p className="mt-1 text-xs text-smoke">
                      {order.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <span
                      className={cn(
                        "border px-3 py-1 text-[0.5625rem] uppercase tracking-[0.2em]",
                        STATUS_TONE[order.status] ?? "border-stone/40 text-stone",
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="text-sm tabular-nums text-alabaster">
                      {formatMoney(order.totalCents)}
                    </span>
                  </div>
                </div>

                <ul className="mt-5 flex flex-wrap gap-5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="relative h-20 w-15 shrink-0 overflow-hidden bg-graphite"
                      >
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            sizes="60px"
                            className="object-cover"
                          />
                        )}
                      </Link>
                      <div className="text-xs">
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="text-stone transition-colors hover:text-brass-lit"
                        >
                          {item.productName}
                        </Link>
                        <p className="mt-1 text-smoke">
                          {item.color} · {item.size} · ×{item.quantity}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
