import type { Metadata } from "next";
import { getChrome, getPageData } from "@/lib/content/queries";
import type { Media } from "@/lib/content/media-types";
import { siteUrl } from "@/lib/utils";

export async function buildMetadata(opts: { title?: string | null; description?: string | null; path: string; image?: Media | null; type?: "website" | "article"; noindex?: boolean; publishedTime?: string; modifiedTime?: string }): Promise<Metadata> {
  const chrome = await getChrome();
  const title = opts.title || chrome.defaultSeoTitle;
  const description = opts.description || chrome.defaultSeoDescription;
  const image = opts.image ?? chrome.ogImage;
  return {
    title: opts.path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: siteUrl(opts.path) },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: opts.type ?? "website",
      url: siteUrl(opts.path),
      siteName: chrome.siteName,
      title,
      description,
      locale: "en_GB",
      ...(image ? { images: [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] } : {}),
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime, modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function pageMetadata(key: string): Promise<Metadata> {
  const page = await getPageData(key);
  return buildMetadata({ title: page?.seoTitle ?? page?.title, description: page?.seoDescription, path: page?.route ?? "/", image: page?.ogImage, noindex: page?.noindex });
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}
