import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { paymentsEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Checkout" };

// Checkout must never be served from cache — it reflects one visitor's bag.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);

  if (cart.lines.length === 0) redirect("/cart");

  return (
    <div className="shell pt-40 pb-20">
      <header className="border-b border-bone/10 pb-10">
        <p className="eyebrow">Checkout</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,7vw,5rem)] text-alabaster">
          Where should it go?
        </h1>
      </header>

      <CheckoutForm
        cart={cart}
        defaultEmail={user?.email ?? ""}
        defaultName={user?.name ?? ""}
        paymentsEnabled={paymentsEnabled}
      />
    </div>
  );
}
