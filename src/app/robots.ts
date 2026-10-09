import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/stripe";

/**
 * Keeps the private half of the shop out of search results.
 *
 * This is not a security measure — a crawler that ignores the file reads
 * everything, and so does anyone typing a URL. It is housekeeping: an admin
 * login or a stranger's order confirmation indexed on Google is a leak of
 * attention, and sometimes of more than that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/cart", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
