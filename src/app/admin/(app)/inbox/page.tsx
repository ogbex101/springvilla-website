import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { InboxTable } from "@/components/admin/InboxDrawer";
import { PageHeader, EmptyState, btn, input } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type SP = Promise<{ tab?: string; status?: string; office?: string; interest?: string; type?: string; from?: string; to?: string }>;

async function Inbox({ searchParams }: { searchParams: SP }) {
  const s = await requireAdminPage("inbox");
  const sp = await searchParams;
  const tab = sp.tab === "enquiries" ? "enquiries" : "applications";
  const db = await getServerClient();
  const table = tab === "applications" ? "join_applications" : "contact_enquiries";
  let q = db.from(table).select("*, offices(name)").order("created_at", { ascending: false }).limit(300);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.office) q = q.eq("office_id", sp.office);
  if (sp.from) q = q.gte("created_at", sp.from);
  if (sp.to) q = q.lte("created_at", `${sp.to}T23:59:59`);
  if (tab === "applications" && sp.interest) q = q.eq("interest", sp.interest);
  if (tab === "enquiries" && sp.type) q = q.eq("enquiry_type", sp.type);
  const [{ data, error }, { data: offices }, { data: staffRows }] = await Promise.all([
    q,
    db.from("offices").select("id,name").order("name"),
    db.from("profiles").select("id,display_name,email").eq("is_active", true),
  ]);
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({ ...r, office: (r.offices as { name?: string } | null)?.name ?? "Not chosen" })) as never[];
  const staff = (staffRows ?? []).map((p) => ({ id: p.id, name: p.display_name || p.email || "Staff" }));
  const qs = new URLSearchParams(Object.entries({ ...sp, kind: tab }).filter(([, v]) => v) as [string, string][]).toString();
  const scoped = !s.roles.some((r) => ["super_admin", "central_admin", "member_support"].includes(r));

  return (
    <>
      <PageHeader
        title="Applications & enquiries"
        description={scoped ? "Showing items for your office only." : "Every join application and contact enquiry, routed by office and type."}
        actions={<a href={`/api/admin/export?${qs}`} className={btn.secondary}><Download className="size-4" aria-hidden /> Export CSV</a>}
      />
      <div className="mb-4 flex gap-1" role="tablist">
        {(["applications", "enquiries"] as const).map((t) => (
          <Link key={t} role="tab" aria-selected={tab === t} href={`/admin/inbox?tab=${t}`} className={cn("rounded-lg px-4 py-2 text-small font-semibold", tab === t ? "bg-canopy text-white" : "bg-white text-canopy ring-1 ring-canopy/15")}>{t === "applications" ? "Join applications" : "Contact enquiries"}</Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/inbox">
        <input type="hidden" name="tab" value={tab} />
        <select aria-label="Status" name="status" defaultValue={sp.status ?? ""} className={`${input} w-auto`}><option value="">Any status</option>{["new", "contacted", "visited", "closed"].map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Office" name="office" defaultValue={sp.office ?? ""} className={`${input} w-auto`}><option value="">Any office</option>{(offices ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        {tab === "applications" ? (
          <select aria-label="Interest" name="interest" defaultValue={sp.interest ?? ""} className={`${input} w-auto`}><option value="">Any interest</option><option value="digital">Digital</option><option value="business">Business</option><option value="both">Both</option><option value="not_sure">Not sure</option></select>
        ) : (
          <select aria-label="Type" name="type" defaultValue={sp.type ?? ""} className={`${input} w-auto`}><option value="">Any type</option>{["general", "office_visit", "partnership", "media", "member_support", "feedback", "safeguarding"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</select>
        )}
        <input aria-label="From date" type="date" name="from" defaultValue={sp.from} className={`${input} w-auto`} />
        <input aria-label="To date" type="date" name="to" defaultValue={sp.to} className={`${input} w-auto`} />
        <button className={btn.secondary}>Filter</button>
      </form>
      {error ? <p role="alert">{error.message}</p> : rows.length === 0 ? (
        <EmptyState title="Nothing here">{sp.status || sp.office ? "No items match these filters." : "New submissions will appear here."}</EmptyState>
      ) : (
        <InboxTable kind={tab} rows={rows} staff={staff} columns={tab === "applications" ? [{ key: "full_name", label: "Name" }, { key: "office", label: "Office" }, { key: "interest", label: "Interest" }] : [{ key: "name", label: "Name" }, { key: "enquiry_type", label: "Type" }, { key: "office", label: "Office" }]} />
      )}
    </>
  );
}

export default function InboxPage({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Inbox searchParams={searchParams} /></Suspense>;
}
