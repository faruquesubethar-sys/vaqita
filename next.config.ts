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
  },
};

export default nextConfig;
