"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2, Plus } from "lucide-react";
import { getEntity } from "@/lib/admin/entities";
import { saveEntity, deleteEntity, addJourneyUpdate, listJourneyUpdates, deleteJourneyUpdate, approveOffice } from "@/app/admin/actions/entities";
import { Fields, RefOptions, referencedIds } from "./SchemaForm";
import { MediaCacheProvider } from "./MediaCache";
import { useToast } from "./Toast";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { Panel, btn, input, label, Badge } from "./ui";
import { cn, formatDate } from "@/lib/utils";

export function EntityEditor({ entityKey, id, initial, refs, isCentral, meta }: { entityKey: string; id: string | null; initial: Record<string, unknown>; refs: Record<string, { value: string; label: string }[]>; isCentral: boolean; meta?: Record<string, unknown> }) {
  const def = getEntity(entityKey)!;
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useUnsavedGuard(dirty);
  const ids = useMemo(() => referencedIds(initial), [initial]);
  const publicPath = id && def.publicPath ? def.publicPath({ ...initial, ...meta }) : null;

  const save = async () => {
    setBusy(true);
    const r = await saveEntity(entityKey, id, v);
    setBusy(false);
    if (!r.ok) return toast("error", r.error);
    setDirty(false);
    toast("success", r.data.message ?? (id ? "Saved." : `${def.label} created.`));
    if (!id) router.replace(`/admin/${entityKey}/${r.data.id}`);
    else router.refresh();
  };

  return (
    <RefOptions.Provider value={refs}>
      <MediaCacheProvider ids={ids}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="space-y-5"
            >
              <Fields schema={def.schema} value={v} onChange={(x) => { setV(x); setDirty(true); }} />
              <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-canopy/10 bg-white px-5 py-3 md:-mx-6 md:px-6">
                <button className={btn.primary} disabled={busy}>{busy ? "Saving…" : id ? "Save changes" : `Create ${def.label.toLowerCase()}`}</button>
                {dirty && <span className="text-caption text-[#6b4a00]">Unsaved changes</span>}
              </div>
            </form>
          </Panel>
          <aside className="space-y-4">
            {publicPath && (
              <Panel>
                <a href={publicPath} target="_blank" rel="noopener" className={cn(btn.secondary, "w-full")}>View live <ExternalLink className="size-4" aria-hidden /></a>
              </Panel>
            )}
            {entityKey === "articles" && id && (
              <Panel title="Preview">
                <p className="text-small text-canopy/75">See the article as readers will, even before it&rsquo;s published. Save first.</p>
                <Link href={`/admin/articles/${id}/preview`} target="_blank" className={cn(btn.secondary, "mt-3 w-full")}>Open preview</Link>
              </Panel>
            )}
            {entityKey === "articles" && (
              <Panel title="Workflow">
                <ol className="space-y-1 text-small text-canopy/80">
                  <li>Idea → Draft → In review</li>
                  <li>→ <strong>Claims review</strong> (check every fact and claim; no income or health promises)</li>
                  <li>→ Approved → Scheduled or Published <span className="text-caption">(central admins)</span></li>
                </ol>
                {!isCentral && <p className="mt-2 text-caption text-[#6b4a00]">You can move posts up to Claims review. A central admin approves and publishes.</p>}
              </Panel>
            )}
            {entityKey === "journeys" && id && <JourneyUpdates journeyId={id} />}
            {entityKey === "offices" && id && meta && <OfficeTrust officeId={id} meta={meta} isCentral={isCentral} />}
            {(entityKey === "courses" || entityKey === "modules") && id && (
              <Panel title={entityKey === "courses" ? "Modules" : "Lessons"}>
                <Link href={`/admin/${entityKey === "courses" ? "modules" : "lessons"}?parent=${id}`} className={cn(btn.secondary, "w-full")}>Manage {entityKey === "courses" ? "modules" : "lessons"}</Link>
              </Panel>
            )}
            {id && (
              <Panel title="Danger zone">
                <button
                  className={cn(btn.danger, "w-full")}
                  onClick={async () => {
                    if (!confirm(`Delete this ${def.label.toLowerCase()} permanently? This can't be undone.`)) return;
                    const r = await deleteEntity(entityKey, id);
                    if (!r.ok) return toast("error", r.error);
                    toast("success", "Deleted.");
                    setDirty(false);
                    router.push(`/admin/${entityKey}`);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden /> Delete {def.label.toLowerCase()}
                </button>
              </Panel>
            )}
          </aside>
        </div>
      </MediaCacheProvider>
    </RefOptions.Provider>
  );
}

function JourneyUpdates({ journeyId }: { journeyId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<{ id: string; occurred_on: string; title: string; body: string | null }[] | null>(null);
  const [form, setForm] = useState({ occurred_on: "", title: "", body: "" });
  const reload = () => void listJourneyUpdates(journeyId).then(setItems);
  useEffect(reload, [journeyId]);
  return (
    <Panel title="Timeline (dated updates)">
      {items === null ? <p className="text-small">Loading…</p> : items.length === 0 ? <p className="text-small text-canopy/75">No milestones yet.</p> : (
        <ol className="space-y-2">
          {items.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-2 text-small">
              <span><strong>{formatDate(u.occurred_on)}</strong> · {u.title}</span>
              <button className="p-1 text-canopy/60 hover:text-[#7a1c1c]" aria-label={`Delete milestone ${u.title}`} onClick={async () => { if (!confirm("Delete this milestone?")) return; const r = await deleteJourneyUpdate(u.id); if (r.ok) reload(); else toast("error", r.error); }}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 space-y-2 border-t border-canopy/10 pt-4">
        <label className={label} htmlFor="ju-date">Date</label>
        <input id="ju-date" type="date" className={input} value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
        <label className={label} htmlFor="ju-title">Milestone</label>
        <input id="ju-title" className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className={label} htmlFor="ju-body">Details (optional)</label>
        <textarea id="ju-body" rows={2} className={cn(input, "py-2")} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <button className={cn(btn.secondary, "w-full")} onClick={async () => { const r = await addJourneyUpdate(journeyId, form); if (r.ok) { setForm({ occurred_on: "", title: "", body: "" }); reload(); toast("success", "Milestone added."); } else toast("error", r.error); }}>
          <Plus className="size-4" aria-hidden /> Add dated update
        </button>
      </div>
    </Panel>
  );
}

function OfficeTrust({ officeId, meta, isCentral }: { officeId: string; meta: Record<string, unknown>; isCentral: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const pending = meta.pending_changes as Record<string, unknown> | null;
  return (
    <Panel title="Verification">
      <p className="text-small">
        <Badge tone={meta.verification_status === "verified" ? "good" : "bad"}>{String(meta.verification_status)}</Badge>
        {meta.last_verified_at ? <span className="ml-2 text-canopy/75">Last verified {formatDate(String(meta.last_verified_at))}</span> : null}
      </p>
      {pending && Object.keys(pending).length > 0 && (
        <div className="mt-3 rounded-lg bg-[#fbecc8] p-3 text-small text-[#6b4a00]">
          <p className="font-semibold">Changes waiting for approval</p>
          <ul className="mt-1 space-y-0.5">{Object.entries(pending).map(([k, val]) => <li key={k}>{k.replace(/_/g, " ")}: <strong>{String(val ?? "—")}</strong></li>)}</ul>
        </div>
      )}
      {isCentral && (
        <div className="mt-3 flex flex-col gap-2">
          {pending && Object.keys(pending).length > 0 && <button className={btn.primary} onClick={async () => { const r = await approveOffice(officeId, true); toast(r.ok ? "success" : "error", r.ok ? "Changes approved and office verified." : r.error); router.refresh(); }}>Approve changes &amp; verify</button>}
          <button className={btn.secondary} onClick={async () => { const r = await approveOffice(officeId, true); toast(r.ok ? "success" : "error", r.ok ? "Marked as verified today." : r.error); router.refresh(); }}>Mark details verified today</button>
          <Link href="/admin/users" className={btn.ghost}>Assign office admins</Link>
        </div>
      )}
    </Panel>
  );
}
