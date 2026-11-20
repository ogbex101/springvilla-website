"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { updateInboxItem, addInboxNote } from "@/app/admin/actions/inbox";
import { useToast } from "./Toast";
import { btn, input, label, StatusBadge } from "./ui";
import { cn, formatDate } from "@/lib/utils";

type Item = Record<string, unknown> & { id: string; status: string; notes: { author_name: string; text: string; at: string }[] };

export function InboxTable({ kind, rows, staff, columns }: { kind: "applications" | "enquiries"; rows: Item[]; staff: { id: string; name: string }[]; columns: { key: string; label: string }[] }) {
  const [open, setOpen] = useState<Item | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-canopy/10">
        <table className="w-full min-w-[640px] text-small">
          <thead className="bg-sand/60 text-left"><tr>{columns.map((c) => <th key={c.key} scope="col" className="p-3">{c.label}</th>)}<th className="p-3">Status</th><th className="p-3">Received</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-canopy/10 hover:bg-sand/40">
                {columns.map((c, i) => (
                  <td key={c.key} className="p-3">{i === 0 ? <button onClick={() => setOpen(r)} className="font-semibold underline-offset-4 hover:underline">{String(r[c.key] ?? "—")}</button> : String(r[c.key] ?? "—")}</td>
                ))}
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3">{formatDate(String(r.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <Drawer kind={kind} item={open} staff={staff} onClose={() => setOpen(null)} />}
    </>
  );
}

const LABELS: Record<string, string> = { full_name: "Name", name: "Name", email: "Email", phone: "Phone", city: "City", state: "State", interest: "Interest", age_range: "Age range", current_situation: "Situation", hoped_outcome: "Hopes", how_heard: "Heard via", preferred_contact: "Contact by", consent_contact: "OK to contact", enquiry_type: "Type", subject: "Subject", message: "Message", office: "Office", source_path: "Sent from" };

function Drawer({ kind, item, staff, onClose }: { kind: "applications" | "enquiries"; item: Item; staff: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const update = async (patch: { status?: string; assigned_to?: string | null }) => {
    const r = await updateInboxItem(kind, item.id, patch);
    toast(r.ok ? "success" : "error", r.ok ? "Updated." : r.error);
    if (r.ok) router.refresh();
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label="Details" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 outline-none">
        <div className="flex items-start justify-between">
          <h2 className="text-[1.4rem] font-semibold">{String(item.full_name ?? item.name)}</h2>
          <button onClick={onClose} className={btn.ghost} aria-label="Close"><X className="size-5" /></button>
        </div>
        <p className="text-small text-canopy/75">Received {formatDate(String(item.created_at), { hour: "2-digit", minute: "2-digit" })}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="st" className={label}>Status</label>
            <select id="st" className={cn(input, "mt-1")} defaultValue={item.status} onChange={(e) => update({ status: e.target.value })}>
              {["new", "contacted", "visited", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="as" className={label}>Assigned to</label>
            <select id="as" className={cn(input, "mt-1")} defaultValue={(item.assigned_to as string) ?? ""} onChange={(e) => update({ assigned_to: e.target.value || null })}>
              <option value="">Nobody</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-canopy/10 text-small">
          {Object.entries(LABELS).filter(([k]) => item[k] !== undefined && item[k] !== null && item[k] !== "").map(([k, l]) => (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2">
              <dt className="text-canopy/75">{l}</dt>
              <dd className="whitespace-pre-line break-words">{k === "email" ? <a className="underline" href={`mailto:${item[k]}`}>{String(item[k])}</a> : k === "phone" ? <a className="underline" href={`tel:${item[k]}`}>{String(item[k])}</a> : typeof item[k] === "boolean" ? (item[k] ? "Yes" : "No") : String(item[k])}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          <h3 className="font-semibold">Internal notes</h3>
          {item.notes?.length ? (
            <ul className="mt-2 space-y-2">{item.notes.map((n, i) => <li key={i} className="rounded-lg bg-sand/60 p-3 text-small"><p className="whitespace-pre-line">{n.text}</p><p className="mt-1 text-caption text-canopy/70">{n.author_name} · {formatDate(n.at, { hour: "2-digit", minute: "2-digit" })}</p></li>)}</ul>
          ) : <p className="mt-1 text-small text-canopy/75">No notes yet.</p>}
          <label htmlFor="note" className="sr-only">Add a note</label>
          <textarea id="note" rows={3} className={cn(input, "mt-3 py-2")} placeholder="Add a note (only staff can see this)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={cn(btn.primary, "mt-2")} onClick={async () => { const r = await addInboxNote(kind, item.id, note); if (r.ok) { setNote(""); toast("success", "Note added."); router.refresh(); onClose(); } else toast("error", r.error); }}>Add note</button>
        </div>
      </div>
    </div>
  );
}
