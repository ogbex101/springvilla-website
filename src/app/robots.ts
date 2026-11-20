import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";
import { SITEMAP_SEGMENTS } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  // Staging / pre-launch: SITE_NOINDEX=true blocks all crawling.
  if (process.env.SITE_NOINDEX === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/member", "/login", "/api", "/dev", "/auth", "/preview"] }],
    sitemap: SITEMAP_SEGMENTS.map((s) => siteUrl(`/sitemap/${s}.xml`)),
  };
}
