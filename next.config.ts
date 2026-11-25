import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // One high quality for every photo (Next snaps any requested quality to the nearest entry).
    qualities: [88],
    minimumCacheTTL: 2678400,
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
  },
  async redirects() {
    return [
      { source: "/about", destination: "/discover", permanent: true },
      { source: "/growth-system", destination: "/our-system", permanent: true },
      { source: "/locations", destination: "/offices", permanent: true },
      { source: "/locations/:slug", destination: "/offices/:slug", permanent: true },
      { source: "/blog", destination: "/ideas", permanent: true },
      { source: "/blog/:slug", destination: "/ideas/:slug", permanent: true },
      { source: "/stories", destination: "/journeys", permanent: true },
      { source: "/stories/:slug", destination: "/journeys/:slug", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: process.env.SITE_NOINDEX === "true" ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : securityHeaders },
      {
        source: "/(admin|member|login|api|dev)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
