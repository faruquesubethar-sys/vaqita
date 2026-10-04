import Link from "next/link";

import { SwanMark } from "@/components/brand/swan-mark";
import { CONTACT } from "@/lib/contact";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/collections/surplus", label: "Surplus" },
      { href: "/collections/vintage", label: "Vintage" },
      { href: "/collections/tees", label: "Tees" },
      { href: "/collections/polo-tees", label: "Polo Tees" },
      { href: "/collections/trouser", label: "Trouser" },
      { href: "/collections/shirts", label: "Shirts" },
      { href: "/collections/footwear", label: "Footwear" },
    ],
  },
  {
    title: "Client care",
    links: [
      // Support goes straight to WhatsApp. A contact page that asks someone
      // to wait for a reply is a worse answer than the channel the shop
      // actually watches.
      { href: CONTACT.whatsapp, label: "Customer support", external: true },
      { href: "/contact", label: "Contact us" },
      { href: "/account", label: "Your orders" },
      { href: "/cart", label: "Your bag" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "The Hub",
    links: [
      { href: "/collections", label: "Everything in stock" },
      { href: "/#sorting", label: "How we buy" },
      { href: "/#materials", label: "Fabrics" },
      { href: "/about", label: "About us" },
    ],
  },
];

/** External channels open in a new tab; internal links must not. */
const SOCIAL = [
  { href: CONTACT.whatsapp, label: "WhatsApp" },
  { href: CONTACT.instagram, label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-bone/10">
      <div className="shell grid gap-14 py-20 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-4">
            <SwanMark id="ftr" className="h-10 w-auto" />
            <div>
              <p className="display text-2xl tracking-[0.38em] text-alabaster">VAQITA</p>
              <p className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.32em] text-stone">
                Mens Fashion Hub
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-smoke">
            Surplus, vintage, tees, polos and trousers. Real stock in one shop,
            photographed piece by piece — and every one turns in 3D before you
            commit.
          </p>

          <div className="mt-7 flex flex-wrap gap-5">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group text-[0.6875rem] uppercase tracking-[0.2em] text-stone transition-colors hover:text-brass-lit"
              >
                <span className="link-underline">
                  {s.label}
                  <span className="link-underline-bar" />
                </span>
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title}>
            <h3 className="eyebrow">{col.title}</h3>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  {/* An off-site link is a plain anchor with rel set. Routing
                      WhatsApp through next/link would have it try to treat the
                      address as an internal route. */}
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group text-sm text-stone transition-colors hover:text-alabaster"
                    >
                      <span className="link-underline">
                        {link.label}
                        <span className="link-underline-bar" />
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="group text-sm text-stone transition-colors hover:text-alabaster"
                    >
                      <span className="link-underline">
                        {link.label}
                        <span className="link-underline-bar" />
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="shell flex flex-col gap-3 border-t border-bone/8 py-7 text-[0.6875rem] uppercase tracking-[0.18em] text-smoke md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} VAQITA Mens Fashion Hub. All rights reserved.</p>
        <p>Sorted &amp; shipped from India.</p>
      </div>
    </footer>
  );
}
