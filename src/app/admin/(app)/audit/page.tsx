import Link from "next/link";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge, btn, input } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Audit log" };
type SP = Promise<{ q?: string; entity?: string; action?: string; page?: string }>;

function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: { key: string; from: string; to: string }[] = [];
  for (const k of keys) {
    if (["updated_at", "updated_by", "created_at"].includes(k)) continue;
    const a = JSON.stringify(before?.[k] ?? null);
    const b = JSON.stringify(after?.[k] ?? null);
    if (a !== b) out.push({ key: k, from: a.slice(0, 300), to: b.slice(0, 300) });
  }
  return out;
}

async function Log({ searchParams }: { searchParams: SP }) {
  await requireAdminPage("audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await getServerClient();
  let q = db.from("audit_log").select("*").order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (sp.entity) q = q.eq("entity", sp.entity);
  if (sp.action) q = q.eq("action", sp.action);
  if (sp.q) q = q.or(`actor_email.ilike.%${sp.q.replace(/[%,()]/g, "")}%,entity_id.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data, error } = await q;
  const rows = (data ?? []) as { id: number; actor_email: string | null; action: string; entity: string; entity_id: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string }[];
  return (
    <>
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/audit">
        <input aria-label="Search by person or record id" name="q" defaultValue={sp.q} placeholder="Person's email or record id" className={`${input} max-w-xs`} />
        <select aria-label="Area" name="entity" defaultValue={sp.entity ?? ""} className={`${input} w-auto`}>
          <option value="">All areas</option>
          {["page_sections", "media_assets", "blog_posts", "member_journeys", "consent_records", "events", "announcements", "offices", "join_applications", "contact_enquiries", "user_roles", "site_settings", "navigation_items", "profiles"].map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
        </select>
        <select aria-label="Action" name="action" defaultValue={sp.action ?? ""} className={`${input} w-auto`}>
          <option value="">All actions</option>{["insert", "update", "delete", "approve"].map((a) => <option key={a}>{a}</option>)}
        </select>
        <button className={btn.secondary}>Search</button>
      </form>
      {error ? <p role="alert">{error.message}</p> : rows.length === 0 ? <EmptyState title="No matching changes" /> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const d = diff(r.before, r.after);
            return (
              <li key={r.id} className="rounded-xl bg-white ring-1 ring-canopy/10">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4 text-small">
                    <Badge tone={r.action === "delete" ? "bad" : r.action === "insert" ? "good" : "info"}>{r.action}</Badge>
                    <span className="font-semibold">{r.entity.replace(/_/g, " ")}</span>
                    <span className="text-canopy/75">{String(r.after?.title ?? r.after?.name ?? r.after?.full_name ?? r.before?.title ?? r.entity_id ?? "")}</span>
                    <span className="ml-auto text-caption text-canopy/70">{r.actor_email ?? "system"} · {formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })}</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-canopy/10 p-4">
                    {d.length === 0 ? <p className="text-small text-canopy/75">No field-level changes.</p> : (
                      <table className="w-full text-caption"><thead className="text-left"><tr><th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Before</th><th className="pb-1">After</th></tr></thead>
                        <tbody>{d.map((x) => <tr key={x.key} className="border-t border-canopy/10 align-top"><td className="py-1 pr-3 font-semibold">{x.key}</td><td className="max-w-[40ch] break-words py-1 pr-3 text-[#7a1c1c]">{x.from}</td><td className="max-w-[40ch] break-words py-1 text-[#1d4d14]">{x.to}</td></tr>)}</tbody>
                      </table>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6 flex gap-2">
        {page > 1 && <Link className={btn.secondary} href={`/admin/audit?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>Newer</Link>}
        {rows.length === 50 && <Link className={btn.secondary} href={`/admin/audit?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Older</Link>}
      </div>
    </>
  );
}

export default function AuditPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader title="Audit log" description="Every change made in the admin, who made it and what changed." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Log searchParams={searchParams} /></Suspense>
    </>
  );
}
