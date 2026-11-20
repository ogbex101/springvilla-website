"use server";

import { requireCapability } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { expire } from "@/lib/admin/revalidate";
import { settingsSchema } from "@/lib/admin/settings-schema";

export async function loadSettings() {
  await requireCapability("settings");
  const db = await getServerClient();
  const [{ data: s }, { data: nav }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("navigation_items").select("label,href,location,group_label,sort_order").order("sort_order"),
  ]);
  const c = (s?.contact ?? {}) as Record<string, string>;
  const ft = (s?.footer ?? {}) as Record<string, unknown>;
  const pick = (loc: string) => (nav ?? []).filter((n) => n.location === loc);
  return {
    site_name: s?.site_name ?? "Springvilla",
    tagline: s?.tagline ?? "",
    logo_asset_id: s?.logo_asset_id ?? null,
    logo_alt_asset_id: s?.logo_alt_asset_id ?? null,
    contact_email: c.email ?? "",
    contact_phone: c.phone ?? "",
    contact_whatsapp: c.whatsapp ?? "",
    contact_address: c.address ?? "",
    social: (s?.social ?? []) as { platform: string; url: string }[],
    default_seo_title: s?.default_seo_title ?? "",
    default_seo_description: s?.default_seo_description ?? "",
    og_image_asset_id: s?.og_image_asset_id ?? null,
    default_timezone: s?.default_timezone ?? "UTC",
    analytics_enabled: s?.analytics_enabled ?? true,
    vercel_analytics_enabled: s?.vercel_analytics_enabled ?? false,
    cookie_banner_enabled: s?.cookie_banner_enabled ?? true,
    cookie_banner_text: s?.cookie_banner_text ?? "",
    newsletter_enabled: s?.newsletter_enabled ?? false,
    newsletter_action_url: s?.newsletter_action_url ?? "",
    footer_closing: (ft.closing_statement as string) ?? "",
    footer_highlight: (ft.highlight as string) ?? "",
    footer_disclaimers: (ft.disclaimers as string[]) ?? [],
    legal_name: (ft.legal_name as string) ?? "",
    nav_header: pick("header").map((n) => ({ label: n.label, href: n.href })),
    nav_footer: pick("footer").map((n) => ({ group: n.group_label ?? "", label: n.label, href: n.href })),
    nav_legal: pick("legal").map((n) => ({ label: n.label, href: n.href })),
  };
}

export async function saveSettings(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCapability("settings");
    const r = settingsSchema.safeParse(input);
    if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join(" · ") };
    const d = r.data;
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: d.default_timezone || "UTC" });
    } catch {
      return { ok: false, error: "That timezone isn't recognised. Use a name like Africa/Lagos or Europe/London." };
    }
    const db = await getServerClient();
    const { error } = await db.from("site_settings").update({
      site_name: d.site_name,
      tagline: d.tagline || null,
      logo_asset_id: d.logo_asset_id,
      logo_alt_asset_id: d.logo_alt_asset_id,
      contact: { email: d.contact_email || undefined, phone: d.contact_phone || undefined, whatsapp: d.contact_whatsapp || undefined, address: d.contact_address || undefined },
      social: d.social.filter((x) => x.url && /^https:\/\//.test(x.url)),
      default_seo_title: d.default_seo_title || null,
      default_seo_description: d.default_seo_description || null,
      og_image_asset_id: d.og_image_asset_id,
      default_timezone: d.default_timezone || "UTC",
      analytics_enabled: d.analytics_enabled,
      vercel_analytics_enabled: d.vercel_analytics_enabled,
      cookie_banner_enabled: d.cookie_banner_enabled,
      cookie_banner_text: d.cookie_banner_text || null,
      newsletter_enabled: d.newsletter_enabled,
      newsletter_action_url: d.newsletter_action_url || null,
      footer: { closing_statement: d.footer_closing, highlight: d.footer_highlight, disclaimers: d.footer_disclaimers.filter(Boolean), legal_name: d.legal_name },
    }).eq("id", 1);
    if (error) throw error;

    const items = [
      ...d.nav_header.map((n, i) => ({ label: n.label, href: n.href, location: "header", sort_order: i })),
      ...d.nav_footer.map((n, i) => ({ label: n.label, href: n.href, group_label: n.group || null, location: "footer", sort_order: i })),
      ...d.nav_legal.map((n, i) => ({ label: n.label, href: n.href, location: "legal", sort_order: i })),
    ].filter((n) => n.label && n.href);
    const { error: delErr } = await db.from("navigation_items").delete().in("location", ["header", "footer", "legal"]);
    if (delErr) throw delErr;
    if (items.length) {
      const { error: insErr } = await db.from("navigation_items").insert(items);
      if (insErr) throw insErr;
    }
    expire("settings", "nav");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
