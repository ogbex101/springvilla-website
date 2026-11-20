"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, Search, Film, AlertCircle, X } from "lucide-react";
import { listMedia, updateMedia, deleteMedia, mediaUsage, type AdminMedia } from "@/app/admin/actions/media";
import { Dropzone } from "./Dropzone";
import { formatBytes } from "./upload";
import { useToast } from "./Toast";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { Badge, btn, input, label } from "./ui";
import { cn, formatDate } from "@/lib/utils";

export function MediaLibrary({ canDelete }: { canDelete: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<AdminMedia[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState({ q: "", type: "", consent: "", from: "", to: "" });
  const [selected, setSelected] = useState<AdminMedia | null>(null);

  const load = useCallback(async () => {
    const r = await listMedia(filters);
    if (r.ok) {
      setItems(r.data);
      setError("");
    } else setError(r.error);
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const missingAlt = items?.filter((m) => m.type === "image" && !m.alt.trim()).length ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Dropzone onUploaded={(m) => { setItems((x) => [m, ...(x ?? [])]); setSelected(m); }} label="Drag photos or videos here" />
        {missingAlt > 0 && <p className="flex items-center gap-2 rounded-lg bg-[#fbecc8] p-3 text-small text-[#6b4a00]"><AlertCircle className="size-4" aria-hidden />{missingAlt} image{missingAlt > 1 ? "s need" : " needs"} alt text before {missingAlt > 1 ? "they" : "it"} can be used on the site.</p>}
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" aria-hidden />
            <input aria-label="Search media" placeholder="Search alt text, caption, location, file name…" className={cn(input, "pl-9")} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <select aria-label="Type" className={cn(input, "w-auto")} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option><option value="image">Images</option><option value="video">Videos</option>
          </select>
          <select aria-label="Consent" className={cn(input, "w-auto")} value={filters.consent} onChange={(e) => setFilters({ ...filters, consent: e.target.value })}>
            <option value="">Any consent</option><option value="yes">Consent confirmed</option><option value="no">Consent not confirmed</option>
          </select>
          <input aria-label="Uploaded from" type="date" className={cn(input, "w-auto")} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input aria-label="Uploaded to" type="date" className={cn(input, "w-auto")} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <div className="flex" role="group" aria-label="View">
            <button className={cn(btn.ghost, view === "grid" && "bg-canopy/10")} aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="size-4" /><span className="sr-only">Grid</span></button>
            <button className={cn(btn.ghost, view === "list" && "bg-canopy/10")} aria-pressed={view === "list"} onClick={() => setView("list")}><List className="size-4" /><span className="sr-only">List</span></button>
          </div>
        </div>
        {error && <p role="alert" className="text-[#7a1c1c]">{error}</p>}
        {items === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-canopy/8" />)}</div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-canopy/25 bg-white/60 p-8 text-center text-small text-canopy/75">No files match. Upload above.</p>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {items.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSelected(m)} className={cn("block w-full overflow-hidden rounded-lg bg-white text-left ring-1 ring-canopy/10 hover:ring-canopy", selected?.id === m.id && "ring-2 ring-canopy")}>
                  <div className="relative aspect-[4/3] bg-canopy/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {m.type === "image" ? <img src={m.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />}
                    {m.type === "video" && <Film className="absolute left-2 top-2 size-4 text-white drop-shadow" aria-hidden />}
                    {m.type === "image" && !m.alt && <span className="absolute inset-x-0 bottom-0 bg-[#7a1c1c] px-2 py-0.5 text-caption text-white">Needs alt text</span>}
                  </div>
                  <p className="truncate p-2 text-caption">{m.alt || m.caption || m.path.split("/").pop()}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-canopy/10">
            <table className="w-full text-small">
              <thead className="bg-sand/60 text-left"><tr><th className="p-3">File</th><th className="p-3">Type</th><th className="p-3">Size</th><th className="p-3">Consent</th><th className="p-3">Uploaded</th></tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-t border-canopy/10 hover:bg-sand/40">
                    <td className="p-3"><button onClick={() => setSelected(m)} className="text-left font-medium underline-offset-4 hover:underline">{m.alt || m.path.split("/").pop()}</button></td>
                    <td className="p-3">{m.type}</td>
                    <td className="p-3">{formatBytes(m.sizeBytes)}</td>
                    <td className="p-3">{m.consentConfirmed ? <Badge tone="good">Confirmed</Badge> : <Badge>Not confirmed</Badge>}</td>
                    <td className="p-3">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="xl:sticky xl:top-6 xl:self-start">
        {selected ? (
          <EditPanel key={selected.id} m={selected} canDelete={canDelete} onClose={() => setSelected(null)} onSaved={(m) => { setItems((x) => x?.map((y) => (y.id === m.id ? m : y)) ?? null); setSelected(m); }} onDeleted={(id) => { setItems((x) => x?.filter((y) => y.id !== id) ?? null); setSelected(null); toast("success", "File deleted."); }} />
        ) : (
          <p className="rounded-xl bg-white p-6 text-small text-canopy/75 ring-1 ring-canopy/10">Select a file to edit its alt text, caption, credit and consent.</p>
        )}
      </aside>
    </div>
  );
}

function EditPanel({ m, canDelete, onClose, onSaved, onDeleted }: { m: AdminMedia; canDelete: boolean; onClose: () => void; onSaved: (m: AdminMedia) => void; onDeleted: (id: string) => void }) {
  const toast = useToast();
  const [v, setV] = useState({ alt_text: m.alt, caption: m.caption ?? "", credit: m.credit ?? "", location: m.location ?? "", date_taken: m.dateTaken ?? "", consent_confirmed: m.consentConfirmed, usage_restrictions: m.usageRestrictions ?? "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<{ entity: string; label: string }[] | null>(null);
  useUnsavedGuard(dirty);
  const set = (patch: Partial<typeof v>) => { setV({ ...v, ...patch }); setDirty(true); };
  const altMissing = m.type === "image" && !v.alt_text.trim();

  useEffect(() => {
    void mediaUsage(m.id).then(setUsage);
  }, [m.id]);

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-canopy/10">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Edit file</h2>
        <button onClick={onClose} className={btn.ghost} aria-label="Close panel"><X className="size-4" /></button>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg bg-canopy/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {m.type === "image" ? <img src={m.thumbUrl} alt={v.alt_text} className="w-full" /> : <video src={m.url} controls muted className="w-full" />}
      </div>
      <p className="mt-2 text-caption text-canopy/75">{m.width && m.height ? `${m.width}×${m.height} · ` : ""}{formatBytes(m.sizeBytes)}{m.durationSeconds ? ` · ${m.durationSeconds}s` : ""} · {m.mime}</p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="alt" className={label}>Alt text {m.type === "image" && <span className="text-[#7a1c1c]">(required)</span>}</label>
          <textarea id="alt" rows={2} className={cn(input, "mt-1 py-2")} value={v.alt_text} onChange={(e) => set({ alt_text: e.target.value })} aria-invalid={altMissing} placeholder="Describe what the image shows for people who can't see it" />
        </div>
        <div>
          <label htmlFor="caption" className={label}>Caption: what actually happened</label>
          <textarea id="caption" rows={2} className={cn(input, "mt-1 py-2")} value={v.caption} onChange={(e) => set({ caption: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="credit" className={label}>Credit</label><input id="credit" className={cn(input, "mt-1")} value={v.credit} onChange={(e) => set({ credit: e.target.value })} /></div>
          <div><label htmlFor="date" className={label}>Date taken</label><input id="date" type="date" className={cn(input, "mt-1")} value={v.date_taken} onChange={(e) => set({ date_taken: e.target.value })} /></div>
        </div>
        <div><label htmlFor="loc" className={label}>Location</label><input id="loc" className={cn(input, "mt-1")} value={v.location} onChange={(e) => set({ location: e.target.value })} /></div>
        <label className="flex items-start gap-2 text-small"><input type="checkbox" className="mt-0.5 size-4 accent-[#2D3E2C]" checked={v.consent_confirmed} onChange={(e) => set({ consent_confirmed: e.target.checked })} /> Everyone identifiable in this file has given consent for it to be used publicly.</label>
        <div><label htmlFor="restr" className={label}>Usage restrictions</label><input id="restr" className={cn(input, "mt-1")} value={v.usage_restrictions} onChange={(e) => set({ usage_restrictions: e.target.value })} placeholder="e.g. Not for social media" /></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn.primary} disabled={busy || !dirty} onClick={async () => { setBusy(true); const r = await updateMedia(m.id, v); setBusy(false); if (r.ok) { setDirty(false); onSaved(r.data); toast("success", "Saved."); } else toast("error", r.error); }}>{busy ? "Saving…" : "Save"}</button>
        <a href={m.url} target="_blank" rel="noopener" className={btn.ghost}>Open original</a>
      </div>
      <div className="mt-6 border-t border-canopy/10 pt-4">
        <p className="text-small font-semibold">Replace file</p>
        <p className="text-caption text-canopy/75">Every page using this file updates automatically.</p>
        <div className="mt-2"><Dropzone compact multiple={false} replaceId={m.id} accept={m.type === "image" ? "image/*" : "video/mp4,video/webm"} onUploaded={(x) => { onSaved({ ...x, alt: v.alt_text }); toast("success", "File replaced everywhere it is used."); }} label="Drop a replacement" /></div>
      </div>
      <div className="mt-6 border-t border-canopy/10 pt-4">
        <p className="text-small font-semibold">Where this file is used</p>
        {usage === null ? <p className="text-caption">Checking…</p> : usage.length === 0 ? <p className="text-caption text-canopy/75">Not used anywhere.</p> : (
          <ul className="mt-1 list-disc pl-5 text-caption">{usage.map((u, i) => <li key={i}>{u.label}</li>)}</ul>
        )}
        {canDelete && (
          <button className={cn(btn.danger, "mt-3")} disabled={!usage || usage.length > 0} title={usage?.length ? "Remove it from those places first" : undefined} onClick={async () => { if (!confirm("Delete this file permanently?")) return; const r = await deleteMedia(m.id); if (r.ok) onDeleted(m.id); else toast("error", r.error); }}>
            Delete file
          </button>
        )}
      </div>
    </div>
  );
}
