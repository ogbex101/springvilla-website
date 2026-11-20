"use client";

import { useMemo, useState } from "react";
import { settingsSchema } from "@/lib/admin/settings-schema";
import { saveSettings } from "@/app/admin/actions/settings";
import { Fields, referencedIds } from "./SchemaForm";
import { MediaCacheProvider } from "./MediaCache";
import { useToast } from "./Toast";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { Panel, btn } from "./ui";

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Brand", keys: ["site_name", "tagline", "logo_asset_id", "logo_alt_asset_id"] },
  { title: "Contact & social", keys: ["contact_email", "contact_phone", "contact_whatsapp", "contact_address", "social"] },
  { title: "Navigation", keys: ["nav_header", "nav_footer", "nav_legal"] },
  { title: "Footer", keys: ["footer_closing", "footer_highlight", "footer_disclaimers", "legal_name", "newsletter_enabled", "newsletter_action_url"] },
  { title: "Search & sharing defaults", keys: ["default_seo_title", "default_seo_description", "og_image_asset_id", "default_timezone"] },
  { title: "Privacy & analytics", keys: ["analytics_enabled", "cookie_banner_enabled", "cookie_banner_text", "vercel_analytics_enabled"] },
];

export function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useUnsavedGuard(dirty);
  const ids = useMemo(() => referencedIds(initial), [initial]);
  return (
    <MediaCacheProvider ids={ids}>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await saveSettings(v); setBusy(false); if (r.ok) { setDirty(false); toast("success", "Settings saved. The site has been updated."); } else toast("error", r.error); }} className="space-y-6">
        {GROUPS.map((g) => (
          <Panel key={g.title} title={g.title}>
            <div className="space-y-5"><Fields schema={settingsSchema} only={g.keys} value={v} onChange={(x) => { setV(x); setDirty(true); }} /></div>
          </Panel>
        ))}
        <div className="sticky bottom-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-lift ring-1 ring-canopy/10">
          <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : "Save all settings"}</button>
          {dirty && <span className="text-caption text-[#6b4a00]">Unsaved changes</span>}
        </div>
      </form>
    </MediaCacheProvider>
  );
}
