import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/content/collections";
import { DEFAULT_PAGES } from "@/content/defaults";
import { siteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const statics = DEFAULT_PAGES.map((p) => ({ url: siteUrl(p.route), changeFrequency: "weekly" as const, priority: p.route === "/" ? 1 : 0.7 }));
  return [...statics, ...entries.map((e) => ({ url: siteUrl(e.path), lastModified: e.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 }))];
}
