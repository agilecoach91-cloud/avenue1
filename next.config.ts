import type { NextConfig } from "next";

// Every page here is per-business and per-user, so the app renders dynamically.
// Cache Components / Partial Prefetching are left off on purpose to keep data
// fetching simple; turn them on later for the marketing pages if useful.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Public booking pages may be framed by the embed widget on any website.
      // Signed-in areas must never be framed (clickjacking).
      ...["/dashboard/:path*", "/onboarding/:path*", "/login/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      })),
      {
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
