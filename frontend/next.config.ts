import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // dev me extra render hataega

  // ✅ Small but useful optimizations
  compress: true,
  poweredByHeader: false,

  // ✅ Tree-shaking improvements
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@tanstack/react-query",
      "axios",
      "zod",
      "zustand",
    ],
  },

  // ✅ Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
