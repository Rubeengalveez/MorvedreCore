import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ["192.168.68.67", "192.168.68.67:3001"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {},
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hzplkjtfejqfulhhnlya.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  register: false,
  disable: process.env.NODE_ENV !== "production",
  globPublicPatterns: [],
});

export default withSerwist(nextConfig);
