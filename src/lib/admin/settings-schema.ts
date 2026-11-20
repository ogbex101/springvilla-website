import { z } from "zod";
import { f } from "@/lib/content/fields";

export const settingsSchema = z.object({
  site_name: f.required("Site name", undefined, 60),
  tagline: f.text("Tagline", undefined, 120),
  logo_asset_id: f.image("Logo (for dark backgrounds)", "Upload the official file unchanged. Shown on Fresh Canopy."),
  logo_alt_asset_id: f.image("Logo variant (optional)", "e.g. version for Cyprus backgrounds."),
  contact_email: f.text("Contact email", "Shown in the footer only when filled.", 200),
  contact_phone: f.text("Contact phone", undefined, 40),
  contact_whatsapp: f.text("WhatsApp", undefined, 40),
  contact_address: f.textarea("Head office address", undefined, 300),
  social: f.list("Social links", { platform: f.text("Platform", "e.g. Instagram", 30), url: f.link("Full URL") }, "Link", "A link only appears on the site when its URL is filled.", 10),
  default_seo_title: f.text("Default SEO title", undefined, 70),
  default_seo_description: f.textarea("Default SEO description", undefined, 170),
  og_image_asset_id: f.image("Default sharing image (1200×630)"),
  default_timezone: f.text("Default timezone", "IANA name, e.g. Africa/Lagos. Used for events and scheduling.", 60),
  analytics_enabled: f.boolean("Collect first-party analytics", "Privacy-respecting; full detail only after visitor consent.", true),
  vercel_analytics_enabled: f.boolean("Enable Vercel Web Analytics & Speed Insights (Core Web Vitals)"),
  cookie_banner_enabled: f.boolean("Show the analytics consent banner", undefined, true),
  cookie_banner_text: f.textarea("Consent banner text", undefined, 400),
  newsletter_enabled: f.boolean("Show newsletter signup in the footer"),
  newsletter_action_url: f.link("Newsletter form action URL", "From your email provider (e.g. Mailchimp embed form action)."),
  footer_closing: f.textarea("Footer closing statement", "Use a new line for a controlled break.", 160),
  footer_highlight: f.text("Footer highlighted word", undefined, 40),
  footer_disclaimers: f.stringList("Footer disclaimers", undefined, 8),
  legal_name: f.text("Legal entity name (for ©)", "Leave blank until verified.", 120),
  nav_header: f.list("Header menu (five destinations)", { label: f.text("Label", undefined, 40), href: f.link("Link") }, "Link", undefined, 7),
  nav_footer: f.list("Footer site map", { group: f.text("Column heading", undefined, 30), label: f.text("Label", undefined, 40), href: f.link("Link") }, "Link", undefined, 30),
  nav_legal: f.list("Legal links", { label: f.text("Label", undefined, 40), href: f.link("Link") }, "Link", undefined, 6),
});
export type SettingsInput = z.input<typeof settingsSchema>;
