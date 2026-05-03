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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
    ],
  },

  // ✅ Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/omni-api/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;