import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Product photographs, once uploads are stored off the local disk.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // three.js ships ESM that benefits from transpilation alongside the R3F stack.
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["@react-three/drei", "gsap"],
    serverActions: {
      /**
       * Product photographs are sent through a server action, and the default
       * ceiling on that body is 1MB.
       *
       * A trimmed 1024px cut-out with an alpha channel is routinely 1.5–3MB,
       * so uploading worked for a plain tee and threw for a busy one — the
       * admin panel fell to the error page, apparently at random, with
       * nothing to connect it to the size of the picture. The upload route
       * already refuses anything over 6MB with a message; this is the headroom
       * that lets that check be the one doing the refusing.
       */
      bodySizeLimit: "8mb",
    },
  },
};

/**
 * Sent on every response.
 *
 * None of these stop a determined attacker; each closes off a cheap, common
 * one. A shop that takes addresses and runs an admin panel on the same origin
 * should not be leaving them off.
 */
nextConfig.headers = async () => [
  {
    source: "/:path*",
    headers: [
      // The admin panel must not be loadable inside someone else's page,
      // where a transparent overlay turns a visitor's click into a click on
      // a control they cannot see.
      { key: "X-Frame-Options", value: "DENY" },
      // Stop the browser second-guessing a declared content type — an upload
      // served as an image should never be executed as a script.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Send the origin to other sites, never the full path. A product URL
      // is harmless; an order confirmation URL is not.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Nothing here needs a camera, a microphone or a location.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      // HTTPS only, once the browser has been here. Harmless locally, where
      // browsers ignore it on plain HTTP.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ],
  },
];

export default nextConfig;
