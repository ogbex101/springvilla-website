"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useId, useState } from "react";
import type { z } from "zod";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from "lucide-react";
import type { FieldMeta } from "@/lib/content/fields";
import { MediaField } from "./MediaField";
import { MediaPicker } from "./MediaPicker";
import { Dropzone } from "./Dropzone";
import { useMediaCache } from "./MediaCache";
import { input, label as labelCls, btn } from "./ui";
import { cn } from "@/lib/utils";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false, loading: () => <div className="min-h-48 animate-pulse rounded-lg bg-canopy/5" /> });

/* ------------------------------------------------------------------ zod introspection */
type AnyZod = z.ZodType & { _zod: { def: Record<string, unknown> }; meta?: () => unknown };

function unwrap(s: AnyZod): AnyZod {
  let cur = s;
  for (let i = 0; i < 6; i++) {
    const t = cur._zod.def.type as string;
    if (t === "default" || t === "optional" || t === "nullable" || t === "catch" || t === "prefault") cur = cur._zod.def.innerType as AnyZod;
    else break;
  }
  return cur;
}
function metaOf(s: AnyZod): FieldMeta | undefined {
  return (s.meta?.() as FieldMeta | undefined) ?? undefined;
}
export function shapeOf(schema: z.ZodType): Record<string, AnyZod> {
  return (unwrap(schema as AnyZod) as unknown as { shape: Record<string, AnyZod> }).shape;
}
/** Default value per field; required fields start empty instead of throwing. */
export function defaultsOf(schema: z.ZodType) {
  const shape = shapeOf(schema);
  return Object.fromEntries(
    Object.entries(shape).map(([k, f]) => {
      const r = f.safeParse(undefined);
      return [k, r.success ? r.data : ""];
    }),
  ) as Record<string, unknown>;
}

/** Options for reference fields (offices, categories, …), loaded by the page. */
export const RefOptions = createContext<Record<string, { value: string; label: string }[]>>({});

/* ------------------------------------------------------------------ field renderer */
type V = Record<string, unknown>;

function Field({ name, schema, value, onChange }: { name: string; schema: AnyZod; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const refs = useContext(RefOptions);
  const m = metaOf(schema);
  if (!m) return null;
  const help = m.help && <p className="mt-0.5 text-caption text-canopy/75">{m.help}</p>;
  const lbl = <label htmlFor={id} className={labelCls}>{m.label}{m.required && <span className="text-[#7a1c1c]"> *</span>}</label>;

  switch (m.widget) {
    case "text":
    case "link":
      return (
        <div>
          {lbl}
          {help}
          <input id={id} className={cn(input, "mt-1.5")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={m.widget === "link" ? "/page or https://…" : undefined} />
        </div>
      );
    case "textarea":
      return (
        <div>
          {lbl}
          {help}
          <textarea id={id} rows={(value as string)?.length > 200 ? 6 : 3} className={cn(input, "mt-1.5 py-2")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "richtext":
      return (
        <div>
          <p id={id} className={labelCls}>{m.label}</p>
          {help}
          <div className="mt-1.5"><RichTextEditor value={(value as string) ?? ""} onChange={onChange} labelledBy={id} /></div>
        </div>
      );
    case "image":
    case "video":
    case "media":
      return <MediaField id={id} label={m.label} help={m.help} kind={m.widget === "video" ? "video" : "image"} value={(value as string) ?? null} onChange={onChange} />;
    case "boolean":
      return (
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[#2D3E2C]" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>
            <span className="text-small font-semibold">{m.label}</span>
            {help}
          </span>
        </label>
      );
    case "number":
      return (
        <div>
          {lbl}
          {help}
          <div className="mt-1.5 flex items-center gap-3">
            <input id={id} type="range" min={m.min} max={m.max} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[#2D3E2C]" />
            <input aria-label={`${m.label} value`} type="number" min={m.min} max={m.max} value={Number(value ?? 0)} onChange={(e) => onChange(Math.min(m.max ?? 1e9, Math.max(m.min ?? -1e9, Number(e.target.value))))} className={cn(input, "w-20")} />
          </div>
        </div>
      );
    case "select":
      return (
        <div>
          {lbl}
          {help}
          <select id={id} className={cn(input, "mt-1.5")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            {m.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    case "ref": {
      const opts = refs[m.ref ?? ""] ?? [];
      return (
        <div>
          {lbl}
          {help}
          <select id={id} className={cn(input, "mt-1.5")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
            <option value="">None</option>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    case "refMulti": {
      const opts = refs[m.ref ?? ""] ?? [];
      const v = (value as string[]) ?? [];
      return (
        <fieldset>
          <legend className={labelCls}>{m.label}</legend>
          {help}
          {opts.length === 0 ? <p className="mt-1 text-caption text-canopy/75">None created yet.</p> : (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {opts.map((o) => (
                <label key={o.value} className={cn("inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-small", v.includes(o.value) ? "border-canopy bg-canopy text-white" : "border-canopy/20 bg-white")}>
                  <input type="checkbox" className="sr-only" checked={v.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...v, o.value] : v.filter((x) => x !== o.value))} />
                  {o.label}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      );
    }
    case "date":
    case "datetime":
      return (
        <div>
          {lbl}
          {help}
          <input id={id} type={m.widget === "date" ? "date" : "datetime-local"} className={cn(input, "mt-1.5")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} />
        </div>
      );
    case "decimal":
      return (
        <div>
          {lbl}
          {help}
          <input id={id} type="number" step="any" inputMode="decimal" className={cn(input, "mt-1.5")} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        </div>
      );
    case "privateFile":
      return (
        <div>
          <p id={id} className={labelCls}>{m.label}</p>
          {help}
          {value ? (
            <p className="mt-1.5 flex items-center gap-3 text-small">
              <span className="truncate rounded-lg bg-canopy/8 px-3 py-2 font-mono text-caption">{String(value).split("/").pop()}</span>
              <button type="button" className={btn.ghost} onClick={() => onChange(null)}>Replace</button>
            </p>
          ) : (
            <div className="mt-1.5"><Dropzone compact multiple={false} bucket={m.bucket} accept="application/pdf,image/*,.docx,.pptx,.xlsx" onUploaded={(x) => onChange(x.path)} label="Drop the file here" /></div>
          )}
        </div>
      );
    case "cta": {
      const v = (value as { label: string; href: string }) ?? { label: "", href: "" };
      return (
        <fieldset>
          <legend className={labelCls}>{m.label}</legend>
          {help}
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <input aria-label={`${m.label} label`} placeholder="Button text" className={input} value={v.label} onChange={(e) => onChange({ ...v, label: e.target.value })} />
            <input aria-label={`${m.label} link`} placeholder="/page, #section or https://…" className={input} value={v.href} onChange={(e) => onChange({ ...v, href: e.target.value })} />
          </div>
        </fieldset>
      );
    }
    case "stringList":
      return <StringList label={m.label} help={m.help} max={m.max} value={(value as string[]) ?? []} onChange={onChange} />;
    case "imageList":
      return <ImageList label={m.label} help={m.help} max={m.max} min={m.min} value={(value as string[]) ?? []} onChange={onChange} />;
    case "list": {
      const element = unwrap(schema)._zod.def.element as AnyZod;
      return <ObjectList label={m.label} help={m.help} itemLabel={m.itemLabel ?? "Item"} max={m.max} element={element} value={(value as V[]) ?? []} onChange={onChange} name={name} />;
    }
    default:
      return null;
  }
}

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

function StringList({ label, help, value, onChange, max = 20 }: { label: string; help?: string; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      {help && <p className="text-caption text-canopy/75">{help}</p>}
      <ul className="mt-1.5 space-y-2">
        {value.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <input aria-label={`${label} ${i + 1}`} className={input} value={s} onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))} />
            <button type="button" className={btn.ghost} onClick={() => onChange(move(value, i, -1))} aria-label="Move up"><ChevronUp className="size-4" /></button>
            <button type="button" className={btn.ghost} onClick={() => onChange(move(value, i, 1))} aria-label="Move down"><ChevronDown className="size-4" /></button>
            <button type="button" className={btn.ghost} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Remove"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      {value.length < max && <button type="button" className={cn(btn.secondary, "mt-2")} onClick={() => onChange([...value, ""])}><Plus className="size-4" aria-hidden /> Add</button>}
    </fieldset>
  );
}

function ImageList({ label, help, value, onChange, max = 24, min = 0 }: { label: string; help?: string; value: string[]; onChange: (v: string[]) => void; max?: number; min?: number }) {
  const [open, setOpen] = useState(false);
  const { get, put } = useMediaCache();
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      {help && <p className="text-caption text-canopy/75">{help}</p>}
      {min > 0 && value.length < min && <p className="mt-1 text-caption text-[#6b4a00]">Add at least {min}.</p>}
      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((id, i) => {
          const m = get(id);
          return (
            <li key={id} className="group relative aspect-square overflow-hidden rounded-lg bg-canopy/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m && <img src={m.thumbUrl} alt={m.alt} className="h-full w-full object-cover" />}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-canopy/80 p-1 text-white">
                <button type="button" onClick={() => onChange(move(value, i, -1))} aria-label="Move earlier" className="p-1"><GripVertical className="size-4 rotate-90" /></button>
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Remove photo" className="p-1"><Trash2 className="size-4" /></button>
              </div>
            </li>
          );
        })}
        {value.length < max && (
          <li>
            <button type="button" onClick={() => setOpen(true)} className="grid aspect-square w-full place-items-center rounded-lg border-2 border-dashed border-canopy/25 text-small font-semibold hover:border-canopy">
              <span className="flex flex-col items-center gap-1"><Plus className="size-5" aria-hidden />Add photo</span>
            </button>
          </li>
        )}
      </ul>
      <MediaPicker open={open} kind="image" onClose={() => setOpen(false)} onPick={(m) => { put(m); if (!value.includes(m.id)) onChange([...value, m.id]); }} />
    </fieldset>
  );
}

function ObjectList({ label, help, itemLabel, element, value, onChange, max = 24, name }: { label: string; help?: string; itemLabel: string; element: AnyZod; value: V[]; onChange: (v: V[]) => void; max?: number; name: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(value.length ? null : null);
  const shape = shapeOf(element);
  const firstText = Object.keys(shape).find((k) => ["text"].includes(metaOf(shape[k])?.widget ?? ""));
  return (
    <fieldset>
      <legend className={labelCls}>{label}</legend>
      {help && <p className="text-caption text-canopy/75">{help}</p>}
      <ol className="mt-2 space-y-2">
        {value.map((item, i) => (
          <li key={i} className="rounded-lg border border-canopy/15 bg-white">
            <div className="flex items-center gap-1 p-1.5">
              <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i} className="flex min-h-10 flex-1 items-center gap-2 rounded-md px-2 text-left text-small font-semibold hover:bg-canopy/5">
                <ChevronDown className={cn("size-4 transition-transform", openIdx === i && "rotate-180")} aria-hidden />
                {itemLabel} {i + 1}{firstText && item[firstText] ? `: ${String(item[firstText]).slice(0, 50)}` : ""}
              </button>
              <button type="button" className={btn.ghost} onClick={() => onChange(move(value, i, -1))} aria-label={`Move ${itemLabel} ${i + 1} up`}><ChevronUp className="size-4" /></button>
              <button type="button" className={btn.ghost} onClick={() => onChange(move(value, i, 1))} aria-label={`Move ${itemLabel} ${i + 1} down`}><ChevronDown className="size-4" /></button>
              <button type="button" className={btn.ghost} onClick={() => confirm(`Remove ${itemLabel.toLowerCase()} ${i + 1}?`) && onChange(value.filter((_, k) => k !== i))} aria-label={`Remove ${itemLabel} ${i + 1}`}><Trash2 className="size-4" /></button>
            </div>
            {openIdx === i && (
              <div className="space-y-4 border-t border-canopy/10 p-4">
                <Fields schema={element} value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} prefix={`${name}.${i}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {value.length < max && (
        <button type="button" className={cn(btn.secondary, "mt-2")} onClick={() => { onChange([...value, defaultsOf(element)]); setOpenIdx(value.length); }}>
          <Plus className="size-4" aria-hidden /> Add {itemLabel.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}

export function Fields({ schema, value, onChange, prefix = "", only }: { schema: z.ZodType; value: V; onChange: (v: V) => void; prefix?: string; only?: string[] }) {
  const shape = shapeOf(schema);
  const keys = Object.keys(shape).filter((k) => !only || only.includes(k));
  return (
    <>
      {keys.map((k) => (
        <Field key={k} name={prefix ? `${prefix}.${k}` : k} schema={shape[k]} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
      ))}
    </>
  );
}

/** Media ids referenced anywhere in a value (to prefetch thumbnails). */
export function referencedIds(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v)) out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => referencedIds(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => referencedIds(x, out));
  return out;
}
