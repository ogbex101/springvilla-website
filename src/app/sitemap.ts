import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/content/collections";
import { DEFAULT_PAGES } from "@/content/defaults";
import { siteUrl } from "@/lib/utils";

/** Segmented sitemaps (blueprint §19): pages, articles, stories, offices, events, news. Published content only. */
export const SITEMAP_SEGMENTS = ["pages", "articles", "journeys", "offices", "events", "news"] as const;
const PREFIX: Record<string, string> = { articles: "/ideas/", journeys: "/journeys/", offices: "/offices/", events: "/events/", news: "/news/" };

export async function generateSitemaps() {
  return SITEMAP_SEGMENTS.map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  if (id === "pages") {
    return DEFAULT_PAGES.map((p) => ({ url: siteUrl(p.route), changeFrequency: "weekly" as const, priority: p.route === "/" ? 1 : 0.7 }));
  }
  const prefix = PREFIX[id];
  if (!prefix) return [];
  const entries = await getSitemapEntries();
  return entries.filter((e) => e.path.startsWith(prefix)).map((e) => ({ url: siteUrl(e.path), lastModified: e.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 }));
}
