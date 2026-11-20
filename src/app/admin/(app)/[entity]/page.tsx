import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { getEntity } from "@/lib/admin/entities";
import { listEntity } from "@/app/admin/actions/entities";
import { PageHeader, EmptyState, StatusBadge, btn, input, Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

type SP = Promise<{ q?: string; status?: string; parent?: string }>;
const PARENT_COL: Record<string, string> = { modules: "course_id", lessons: "module_id" };
const RELATED: Record<string, { href: string; label: string }[]> = {
  articles: [{ href: "/admin/categories", label: "Categories" }, { href: "/admin/tags", label: "Tags" }],
  journeys: [{ href: "/admin/consent", label: "Consent records" }],
  courses: [{ href: "/admin/resources", label: "Resources" }, { href: "/admin/announcements", label: "Announcements" }],
};

async function List({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: SP }) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();
  await requireAdminPage(def.cap);
  const sp = await searchParams;
  const parent = sp.parent && PARENT_COL[entity] ? { column: PARENT_COL[entity], id: sp.parent } : undefined;
  const r = await listEntity(entity, { q: sp.q, status: sp.status, parent });
  const newHref = `/admin/${entity}/new${sp.parent ? `?parent=${sp.parent}` : ""}`;
  return (
    <>
      <PageHeader
        title={def.plural}
        description={def.description}
        actions={
          <>
            {RELATED[entity]?.map((l) => <Link key={l.href} href={l.href} className={btn.secondary}>{l.label}</Link>)}
            <Link href={newHref} className={btn.primary}><Plus className="size-4" aria-hidden /> New {def.label.toLowerCase()}</Link>
          </>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" action={`/admin/${entity}`}>
        {sp.parent && <input type="hidden" name="parent" value={sp.parent} />}
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder={`Search ${def.plural.toLowerCase()}…`} className={`${input} max-w-xs`} />
        {def.statusOptions && (
          <>
            <label htmlFor="status" className="sr-only">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className={`${input} w-auto`}>
              <option value="">All statuses</option>
              {def.statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}
        <button className={btn.secondary}>Filter</button>
      </form>
      {!r.ok ? (
        <p role="alert" className="text-[#7a1c1c]">{r.error}</p>
      ) : r.data.length === 0 ? (
        <EmptyState title={`No ${def.plural.toLowerCase()} yet`} action={<Link href={newHref} className={btn.primary}>Create the first one</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-canopy/10">
          <table className="w-full min-w-[560px] text-small">
            <thead className="bg-sand/60 text-left">
              <tr>{def.columns.map((c) => <th key={c.key} scope="col" className="p-3 font-semibold">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {r.data.map((row) => (
                <tr key={row.id} className="border-t border-canopy/10 hover:bg-sand/40">
                  {def.columns.map((c, i) => {
                    const v = row[c.key];
                    const cell = c.kind === "status" ? (v ? <StatusBadge status={String(v)} /> : "—") : c.kind === "bool" ? (v ? <Badge tone="good">Yes</Badge> : <Badge>No</Badge>) : c.kind === "date" ? (v ? formatDate(String(v)) : "—") : c.kind === "datetime" ? (v ? formatDate(String(v), { hour: "2-digit", minute: "2-digit" }) : "—") : String(v ?? "—");
                    return (
                      <td key={c.key} className="p-3">
                        {i === 0 ? <Link href={`/admin/${entity}/${row.id}`} className="font-semibold underline-offset-4 hover:underline">{cell}</Link> : cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function EntityList(props: { params: Promise<{ entity: string }>; searchParams: SP }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}>
      <List {...props} />
    </Suspense>
  );
}
