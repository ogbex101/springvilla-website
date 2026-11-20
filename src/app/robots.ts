import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";
import { SITEMAP_SEGMENTS } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/member", "/login", "/api", "/dev", "/auth"] }],
    sitemap: SITEMAP_SEGMENTS.map((s) => siteUrl(`/sitemap/${s}.xml`)),
  };
}
