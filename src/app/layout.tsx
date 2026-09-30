import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";

import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/chrome/footer";
import { Header } from "@/components/chrome/header";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

// High-contrast serif for display, geometric sans for everything functional.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "VAQITA Mens Fashion Hub — Thrifted tees, surplus & overdye",
    template: "%s · VAQITA Mens Fashion Hub",
  },
  description:
    "Thrifted tees, deadstock surplus shirting and small-lot overdye. Graded by hand, priced by condition, and every piece viewable in 3D before you buy.",
  openGraph: {
    title: "VAQITA Mens Fashion Hub",
    description: "Thrifted tees, surplus and overdye — every piece in 3D.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetched once at the shell so the header badge and drawer render with real
  // data on first paint rather than flashing an empty cart.
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);

  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="antialiased">
        <SmoothScroll>
          <CartProvider initialCart={cart}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-100 focus:bg-brass focus:px-4 focus:py-2 focus:text-ink"
            >
              Skip to content
            </a>
            <Header user={user} />
            <main id="main">{children}</main>
            <Footer />
          </CartProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
