"use client";

import { useCallback, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Monitor, Smartphone, RotateCcw, History, Plus, Trash2, RefreshCw } from "lucide-react";
import { SECTION_SCHEMAS, SECTION_LABELS, isSectionKey, type SectionKey } from "@/lib/content/schemas";
import { PALETTE_LAYERS } from "@/components/ui/Section";
import { loadSections, saveDraft, publishSection, discardDraft, setVisible, reorder, listRevisions, restoreRevision, addSection, removeSection, type AdminSection, type Revision } from "@/app/admin/actions/content";
import { Fields, referencedIds } from "./SchemaForm";
import { MediaCacheProvider } from "./MediaCache";
import { useToast } from "./Toast";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { Badge, Panel, btn, input, label as labelCls, EmptyState } from "./ui";
import { cn, formatDate } from "@/lib/utils";

const LAYER_LABEL: Record<string, string> = { canopy: "Fresh Canopy (dark)", sand: "Sand (authority)", cyprus: "Cyprus (dark)", milky: "Milky (light)", signal: "Signal (tech, dark)", energy: "High energy (rare)" };

function Row({ s, active, onSelect, onToggle }: { s: AdminSection; active: boolean; onSelect: () => void; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const label = isSectionKey(s.section_key) ? SECTION_LABELS[s.section_key] : s.section_key;
  const heading = (s.draft_content ?? s.content)?.heading ?? (s.draft_content ?? s.content)?.headline;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-1 rounded-lg border bg-white", active ? "border-canopy ring-2 ring-canopy/20" : "border-canopy/12", isDragging && "z-10 shadow-lift")}>
      <button type="button" {...attributes} {...listeners} className="cursor-grab p-2 text-canopy/60 active:cursor-grabbing" aria-label={`Reorder ${label}. Use space then arrow keys.`}>
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 py-2 text-left" aria-current={active}>
        <span className={cn("block truncate text-small font-semibold", !s.visible && "text-canopy/50 line-through")}>{label}</span>
        {typeof heading === "string" && heading && <span className="block truncate text-caption text-canopy/70">{heading.replace(/\n/g, " ")}</span>}
        {s.draft_content && <span className="mt-1 inline-block"><Badge tone="warn">Unpublished changes</Badge></span>}
      </button>
      <button type="button" onClick={onToggle} className="p-2 text-canopy/70 hover:text-canopy" aria-label={s.visible ? `Hide ${label}` : `Show ${label}`} title={s.visible ? "Visible: click to hide" : "Hidden: click to show"}>
        {s.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
    </li>
  );
}

export function PageBuilder({ pageKey, initial, only, title }: { pageKey: string; route: string; initial: AdminSection[]; only?: SectionKey; title?: string }) {
  const toast = useToast();
  const [sections, setSections] = useState(initial);
  const filtered = only ? sections.filter((s) => s.section_key === only) : sections;
  const [selected, setSelected] = useState<string | null>(filtered[0]?.id ?? null);
  const current = sections.find((s) => s.id === selected) ?? null;
  const [draft, setDraft] = useState<Record<string, unknown>>(() => (current ? { ...(current.draft_content ?? current.content) } : {}));
  const [layer, setLayer] = useState(current?.palette_layer ?? "milky");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [revs, setRevs] = useState<Revision[] | null>(null);
  useUnsavedGuard(dirty);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const select = (id: string) => {
    if (dirty && !confirm("You have unsaved changes in this section. Discard them?")) return;
    const s = sections.find((x) => x.id === id)!;
    setSelected(id);
    setDraft({ ...(s.draft_content ?? s.content) });
    setLayer(s.palette_layer);
    setDirty(false);
    setRevs(null);
  };

  const refresh = useCallback(async () => {
    const r = await loadSections(pageKey);
    if (r.ok) setSections(r.data);
    setPreviewKey((k) => k + 1);
  }, [pageKey]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = sections.map((s) => s.id);
    const next = arrayMove(sections, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    setSections(next);
    const r = await reorder(pageKey, next.map((s) => s.id));
    if (r.ok) {
      toast("success", "Order saved and published.");
      setPreviewKey((k) => k + 1);
    } else toast("error", r.error);
  };

  const run = async (name: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(name);
    const r = await fn();
    setBusy(null);
    if (r.ok) {
      toast("success", success);
      setDirty(false);
      await refresh();
    } else toast("error", r.error ?? "Something went wrong");
  };

  const schema = current && isSectionKey(current.section_key) ? SECTION_SCHEMAS[current.section_key] : null;
  const ids = useMemo(() => referencedIds(sections.map((s) => s.draft_content ?? s.content)), [sections]);

  return (
    <MediaCacheProvider ids={ids}>
      <div className={cn("grid gap-6", only ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]")}>
        {!only && (
          <div>
            <p className="mb-2 text-small font-semibold">Sections <span className="font-normal text-canopy/70">(drag to reorder)</span></p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {sections.map((s) => (
                    <Row key={s.id} s={s} active={s.id === selected} onSelect={() => select(s.id)} onToggle={() => run("vis", () => setVisible(s.id, !s.visible), s.visible ? "Section hidden on the live site." : "Section shown on the live site.")} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            {pageKey !== "home" && <AddSection pageKey={pageKey} onAdded={refresh} />}
          </div>
        )}

        <div className="min-w-0">
          {!current || !schema ? (
            <EmptyState title="Choose a section to edit" />
          ) : (
            <Panel title={title ?? (isSectionKey(current.section_key) ? SECTION_LABELS[current.section_key] : current.section_key)}>
              <div className="space-y-5">
                {!only && (
                  <div>
                    <label htmlFor="layer" className={labelCls}>Colour layer</label>
                    <select id="layer" className={cn(input, "mt-1.5")} value={layer} onChange={(e) => { setLayer(e.target.value); setDirty(true); }}>
                      {PALETTE_LAYERS.map((l) => <option key={l} value={l}>{LAYER_LABEL[l]}</option>)}
                    </select>
                  </div>
                )}
                <Fields schema={schema} value={draft} onChange={(v) => { setDraft(v); setDirty(true); }} />
              </div>
              <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-2 border-t border-canopy/10 bg-white px-5 py-3 md:-mx-6 md:px-6">
                <button className={btn.secondary} disabled={!!busy} onClick={() => run("save", () => saveDraft(current.id, draft, layer), "Draft saved. Check the preview.")}>{busy === "save" ? "Saving…" : "Save draft"}</button>
                <button className={btn.primary} disabled={!!busy} onClick={() => run("publish", () => publishSection(current.id, draft, layer), "Published. The live page has been updated.")}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
                {current.draft_content && <button className={btn.ghost} disabled={!!busy} onClick={() => confirm("Discard unpublished changes?") && run("discard", () => discardDraft(current.id), "Draft discarded.")}><RotateCcw className="size-4" aria-hidden />Discard draft</button>}
                <button className={btn.ghost} onClick={async () => { const r = await listRevisions(current.id); if (r.ok) setRevs(r.data); }}><History className="size-4" aria-hidden />History</button>
                {!only && !current.section_key.startsWith("home.") && <button className={btn.danger} onClick={() => confirm("Delete this section? This can't be undone.") && run("del", () => removeSection(current.id), "Section deleted.")}><Trash2 className="size-4" aria-hidden />Delete</button>}
                {dirty && <span className="self-center text-caption text-[#6b4a00]">Unsaved changes</span>}
              </div>
              {revs && (
                <div className="mt-4 rounded-lg bg-sand/60 p-4">
                  <p className="text-small font-semibold">Revision history</p>
                  {revs.length === 0 ? <p className="mt-1 text-small text-canopy/75">No published versions yet.</p> : (
                    <ul className="mt-2 divide-y divide-canopy/10">
                      {revs.map((r, i) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-small">
                          <span>{formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })} · {r.action}{i === 0 ? " (current)" : ""}</span>
                          {i > 0 && <button className={btn.ghost} onClick={() => confirm("Restore this version? It will be published immediately.") && run("restore", () => restoreRevision(r.id), "Version restored and published.").then(() => setRevs(null))}>Restore</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Panel>
          )}
        </div>

        <div className="min-w-0">
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-small font-semibold">Preview <span className="font-normal text-canopy/70">(shows saved drafts)</span></p>
              <div className="flex gap-1" role="group" aria-label="Preview size">
                <button className={cn(btn.ghost, device === "desktop" && "bg-canopy/10")} onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"}><Monitor className="size-4" /><span className="sr-only">Desktop</span></button>
                <button className={cn(btn.ghost, device === "mobile" && "bg-canopy/10")} onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"}><Smartphone className="size-4" /><span className="sr-only">Mobile</span></button>
                <button className={btn.ghost} onClick={() => setPreviewKey((k) => k + 1)}><RefreshCw className="size-4" /><span className="sr-only">Reload preview</span></button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-canopy/15 bg-white">
              <div className={cn("mx-auto origin-top-left", device === "mobile" ? "h-[720px] w-[390px] max-w-full" : "h-[720px] w-full")}>
                {device === "desktop" ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <iframe key={previewKey} title="Page preview" src={`/preview/${encodeURIComponent(pageKey)}`} className="absolute left-0 top-0 h-[180%] w-[180%] origin-top-left scale-[0.5556] border-0" />
                  </div>
                ) : (
                  <iframe key={previewKey} title="Mobile preview" src={`/preview/${encodeURIComponent(pageKey)}`} className="h-full w-full border-0" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MediaCacheProvider>
  );
}

function AddSection({ pageKey, onAdded }: { pageKey: string; onAdded: () => void }) {
  const [key, setKey] = useState("");
  const toast = useToast();
  const options = (Object.keys(SECTION_SCHEMAS) as SectionKey[]).filter((k) => !k.startsWith("home.") && k !== "join_form" && k !== "contact_form");
  return (
    <div className="mt-4 flex gap-2">
      <label htmlFor="add-section" className="sr-only">Section type to add</label>
      <select id="add-section" className={input} value={key} onChange={(e) => setKey(e.target.value)}>
        <option value="">Add a section…</option>
        {options.map((k) => <option key={k} value={k}>{SECTION_LABELS[k]}</option>)}
      </select>
      <button className={btn.secondary} disabled={!key} onClick={async () => { const r = await addSection(pageKey, key); if (r.ok) { toast("success", "Section added (hidden until you show it)."); setKey(""); onAdded(); } else toast("error", r.error); }}>
        <Plus className="size-4" aria-hidden /><span className="sr-only">Add</span>
      </button>
    </div>
  );
}
