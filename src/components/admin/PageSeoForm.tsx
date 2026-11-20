"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { savePageSeo } from "@/app/admin/actions/content";
import { MediaCacheProvider } from "./MediaCache";
import { MediaField } from "./MediaField";
import { useToast } from "./Toast";
import { btn, input, label } from "./ui";

type Seo = { seo_title: string | null; seo_description: string | null; og_image_asset_id: string | null; noindex: boolean };

export function PageSeoForm({ pageKey, initial }: { pageKey: string; initial: Seo }) {
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <MediaCacheProvider ids={v.og_image_asset_id ? [v.og_image_asset_id] : []}>
      <div className="mb-6 rounded-xl border border-canopy/12 bg-white">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-3 text-left font-semibold">
          Search & sharing (SEO)
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && (
          <div className="grid gap-4 border-t border-canopy/10 p-5 md:grid-cols-2">
            <div>
              <label htmlFor="seo-title" className={label}>Page title in Google ({(v.seo_title ?? "").length}/60)</label>
              <input id="seo-title" maxLength={70} className={`${input} mt-1.5`} value={v.seo_title ?? ""} onChange={(e) => setV({ ...v, seo_title: e.target.value || null })} />
              <label htmlFor="seo-desc" className={`${label} mt-4`}>Description ({(v.seo_description ?? "").length}/160)</label>
              <textarea id="seo-desc" maxLength={170} rows={3} className={`${input} mt-1.5 py-2`} value={v.seo_description ?? ""} onChange={(e) => setV({ ...v, seo_description: e.target.value || null })} />
              <label className="mt-4 flex items-center gap-2 text-small"><input type="checkbox" className="size-4 accent-[#2D3E2C]" checked={v.noindex} onChange={(e) => setV({ ...v, noindex: e.target.checked })} /> Hide this page from search engines</label>
            </div>
            <div>
              <MediaField id="og" kind="image" label="Sharing image (1200×630)" help="Shown when the page is shared on social media." value={v.og_image_asset_id} onChange={(id) => setV({ ...v, og_image_asset_id: id })} />
              <button className={`${btn.primary} mt-6`} disabled={busy} onClick={async () => { setBusy(true); const r = await savePageSeo(pageKey, v); setBusy(false); toast(r.ok ? "success" : "error", r.ok ? "SEO saved and published." : r.error); }}>{busy ? "Saving…" : "Save SEO"}</button>
            </div>
          </div>
        )}
      </div>
    </MediaCacheProvider>
  );
}
