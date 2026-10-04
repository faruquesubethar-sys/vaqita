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

export default nextConfig;
