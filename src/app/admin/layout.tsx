import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Inventory" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every admin route is guarded here rather than per page — one gate, no way
  // to add a page later that forgets to check.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect("/account");

  return (
    <div className="shell pt-36 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-bone/10 pb-7">
        <div>
          <p className="eyebrow text-brass-lit">Atelier</p>
          <h1 className="display mt-3 text-4xl text-alabaster">Administration</h1>
        </div>

        <nav className="flex gap-7">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="group text-xs uppercase tracking-[0.2em] text-stone transition-colors hover:text-alabaster"
            >
              <span className="link-underline">
                {tab.label}
                <span className="link-underline-bar" />
              </span>
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
