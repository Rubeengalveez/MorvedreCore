import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import os from "node:os";

const detectedIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((i): i is os.NetworkInterfaceInfo => Boolean(i && i.family === "IPv4" && !i.internal))
  .flatMap((i) => [i.address, `${i.address}:3000`, `${i.address}:3001`]);

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    ...detectedIps,
    "192.168.68.71",
    "192.168.68.71:3000",
    "192.168.68.50",
    "192.168.68.50:3000",
    "192.168.68.67",
    "192.168.68.67:3001",
    "192.168.68.64",
    "192.168.68.64:3000",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
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
