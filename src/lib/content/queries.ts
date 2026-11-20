import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicStorageUrl } from "@/lib/supabase/env";
import { getPublicClient } from "@/lib/supabase/public";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { DEFAULT_NAV, DEFAULT_PAGES, DEFAULT_SETTINGS } from "@/content/defaults";
import { collectMediaIds, isSectionKey, type SectionKey } from "./schemas";
import type { Media } from "./media-types";
import type { PaletteLayer } from "@/components/ui/Section";

/* ------------------------------------------------------------------ types */
export type SectionRow = { id: string; key: SectionKey; layer: PaletteLayer; content: Record<string, unknown> };
export type PageData = {
  key: string;
  route: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: Media | null;
  noindex: boolean;
  sections: SectionRow[];
  media: Record<string, Media>;
  preview: boolean;
};

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  type: "image" | "video" | "document";
  mime: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
  location: string | null;
  date_taken: string | null;
  blur_data_url: string | null;
  consent_confirmed: boolean;
  variants: { width: number; path: string; format: string }[] | null;
};

export const MEDIA_COLUMNS =
  "id,bucket,path,type,mime,width,height,alt_text,caption,credit,location,date_taken,blur_data_url,consent_confirmed,variants";

export function toMedia(r: MediaRow): Media {
  // Prefer the largest optimised WebP variant over the original upload.
  const best = (r.variants ?? []).filter((v) => v.format === "webp").sort((a, b) => b.width - a.width)[0];
  return {
    id: r.id,
    type: r.type,
    url: publicStorageUrl(r.bucket, best?.path ?? r.path),
    mime: best ? "image/webp" : r.mime,
    width: r.width,
    height: r.height,
    alt: r.alt_text ?? "",
    caption: r.caption,
    credit: r.credit,
    location: r.location,
    dateTaken: r.date_taken,
    blurDataUrl: r.blur_data_url,
    consentConfirmed: r.consent_confirmed,
  };
}

/** Images without alt text are never rendered publicly (they show the abstract fallback). */
function usable(m: Media) {
  return m.type !== "image" || m.alt.trim().length > 0;
}

export async function fetchMedia(db: SupabaseClient, ids: Iterable<string>): Promise<Record<string, Media>> {
  const list = Array.from(new Set(ids));
  if (!list.length) return {};
  const { data } = await db.from("media_assets").select(MEDIA_COLUMNS).in("id", list);
  const out: Record<string, Media> = {};
  for (const r of (data ?? []) as MediaRow[]) {
    const m = toMedia(r);
    if (usable(m)) out[m.id] = m;
  }
  return out;
}

/* ------------------------------------------------------------------ pages */
function defaultPage(key: string): PageData | null {
  const p = DEFAULT_PAGES.find((d) => d.key === key);
  if (!p) return null;
  return {
    key: p.key,
    route: p.route,
    title: p.title,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImage: null,
    noindex: false,
    sections: p.sections.filter((s) => s.visible !== false).map((s, i) => ({ id: `${key}-${i}`, key: s.key, layer: s.layer, content: s.content })),
    media: {},
    preview: false,
  };
}

export async function getPageData(key: string): Promise<PageData | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`page:${key}`, "pages", "media");
  if (!isSupabaseConfigured) return defaultPage(key);
  return loadPageData(getPublicClient(), key, false);
}

/**
 * Draft-inclusive page data for the admin preview (/preview/[key]). Uncached;
 * server-only (service role). Public routes never read drafts: Next's Draft Mode
 * re-runs every cached scope per request, which fails under Cache Components and
 * took public pages down (500) for admins who had the draft cookie set.
 */
export async function getPreviewPageData(key: string): Promise<PageData | null> {
  if (!isSupabaseConfigured || !hasServiceRole()) return defaultPage(key);
  return loadPageData(getServiceClient(), key, true);
}

async function loadPageData(db: SupabaseClient, key: string, preview: boolean): Promise<PageData | null> {
  const { data: page } = await db.from("pages").select("id,key,route,title,seo_title,seo_description,og_image_asset_id,noindex,status").eq("key", key).maybeSingle();
  if (!page) return defaultPage(key);

  const cols = preview
    ? "id,section_key,palette_layer,content,draft_content,visible,sort_order"
    : "id,section_key,palette_layer,content,visible,sort_order";
  const { data: rows } = await db.from("page_sections").select(cols).eq("page_id", page.id).eq("visible", true).order("sort_order");

  const sections: SectionRow[] = [];
  for (const r of (rows ?? []) as unknown as { id: string; section_key: string; palette_layer: PaletteLayer; content: Record<string, unknown>; draft_content?: Record<string, unknown> | null }[]) {
    if (!isSectionKey(r.section_key)) continue;
    sections.push({ id: r.id, key: r.section_key, layer: r.palette_layer, content: (preview && r.draft_content) || r.content });
  }
  const ids = collectMediaIds(sections.map((s) => s.content));
  if (page.og_image_asset_id) ids.add(page.og_image_asset_id);
  const media = await fetchMedia(db, ids);

  return {
    key: page.key,
    route: page.route,
    title: page.title,
    seoTitle: page.seo_title,
    seoDescription: page.seo_description,
    ogImage: page.og_image_asset_id ? media[page.og_image_asset_id] ?? null : null,
    noindex: page.noindex,
    sections,
    media,
    preview,
  };
}

/* ------------------------------------------------------------------ chrome */
export type NavLink = { label: string; href: string; group?: string | null };
export type Chrome = {
  siteName: string;
  tagline: string;
  logo: Media | null;
  logoAlt: Media | null;
  contact: { email?: string; phone?: string; whatsapp?: string; address?: string };
  social: { platform: string; url: string }[];
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  ogImage: Media | null;
  analyticsEnabled: boolean;
  vercelAnalyticsEnabled: boolean;
  cookieBannerEnabled: boolean;
  cookieBannerText: string;
  newsletterEnabled: boolean;
  newsletterActionUrl: string | null;
  footer: { closingStatement: string; highlight: string; disclaimers: string[]; legalName: string };
  defaultTimezone: string;
  year: number;
  nav: { header: NavLink[]; footer: NavLink[]; mobile: NavLink[]; legal: NavLink[] };
};

function defaultChrome(): Chrome {
  return {
    siteName: DEFAULT_SETTINGS.site_name,
    tagline: DEFAULT_SETTINGS.tagline,
    logo: null,
    logoAlt: null,
    contact: {},
    social: [],
    defaultSeoTitle: DEFAULT_SETTINGS.default_seo_title,
    defaultSeoDescription: DEFAULT_SETTINGS.default_seo_description,
    ogImage: null,
    analyticsEnabled: true,
    vercelAnalyticsEnabled: false,
    cookieBannerEnabled: true,
    cookieBannerText: DEFAULT_SETTINGS.cookie_banner_text,
    newsletterEnabled: false,
    newsletterActionUrl: null,
    footer: {
      closingStatement: DEFAULT_SETTINGS.footer.closing_statement,
      highlight: DEFAULT_SETTINGS.footer.highlight,
      disclaimers: DEFAULT_SETTINGS.footer.disclaimers,
      legalName: DEFAULT_SETTINGS.footer.legal_name,
    },
    defaultTimezone: "UTC",
    year: new Date().getFullYear(),
    nav: { header: DEFAULT_NAV.header, footer: DEFAULT_NAV.footer.map((n) => ({ ...n, group: n.group })), mobile: DEFAULT_NAV.header, legal: DEFAULT_NAV.legal },
  };
}

export async function getChrome(): Promise<Chrome> {
  "use cache";
  cacheLife("days");
  cacheTag("settings", "nav", "media");
  if (!isSupabaseConfigured) return defaultChrome();
  const db = getPublicClient();
  const [{ data: s }, { data: nav }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("navigation_items").select("label,href,location,group_label,sort_order").eq("visible", true).order("sort_order"),
  ]);
  if (!s) return defaultChrome();
  const media = await fetchMedia(db, [s.logo_asset_id, s.logo_alt_asset_id, s.og_image_asset_id].filter(Boolean));
  const fallback = defaultChrome();
  const pick = (loc: string) => (nav ?? []).filter((n) => n.location === loc).map((n) => ({ label: n.label, href: n.href, group: n.group_label }));
  const header = pick("header");
  const footer = (s.footer ?? {}) as Record<string, unknown>;
  return {
    siteName: s.site_name,
    tagline: s.tagline ?? "",
    logo: media[s.logo_asset_id] ?? null,
    logoAlt: media[s.logo_alt_asset_id] ?? null,
    contact: s.contact ?? {},
    social: ((s.social ?? []) as { platform: string; url: string }[]).filter((x) => x.url),
    defaultSeoTitle: s.default_seo_title ?? s.site_name,
    defaultSeoDescription: s.default_seo_description ?? "",
    ogImage: media[s.og_image_asset_id] ?? null,
    analyticsEnabled: s.analytics_enabled,
    vercelAnalyticsEnabled: s.vercel_analytics_enabled,
    cookieBannerEnabled: s.cookie_banner_enabled,
    cookieBannerText: s.cookie_banner_text ?? fallback.cookieBannerText,
    newsletterEnabled: s.newsletter_enabled,
    newsletterActionUrl: s.newsletter_action_url,
    footer: {
      closingStatement: (footer.closing_statement as string) ?? fallback.footer.closingStatement,
      highlight: (footer.highlight as string) ?? "",
      disclaimers: (footer.disclaimers as string[]) ?? fallback.footer.disclaimers,
      legalName: (footer.legal_name as string) ?? "",
    },
    defaultTimezone: s.default_timezone ?? "UTC",
    year: new Date().getFullYear(),
    nav: {
      header: header.length ? header : fallback.nav.header,
      footer: pick("footer").length ? pick("footer") : fallback.nav.footer,
      mobile: pick("mobile").length ? pick("mobile") : header.length ? header : fallback.nav.mobile,
      legal: pick("legal").length ? pick("legal") : fallback.nav.legal,
    },
  };
}
