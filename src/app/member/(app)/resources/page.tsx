import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { ResourceButton } from "@/components/member/MemberClient";
import { PageHeader, EmptyState } from "@/components/admin/ui";

async function List() {
  await requireMember();
  const db = await getServerClient();
  const { data } = await db.from("resources").select("id,title,description,category").eq("status", "published").order("category").order("title");
  if (!data?.length) return <EmptyState title="No resources yet">Guides and documents shared by Springvilla will appear here.</EmptyState>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.map((r) => (
        <li key={r.id} className="flex flex-col rounded-xl bg-white p-5 ring-1 ring-canopy/10">
          {r.category && <p className="sv-eyebrow text-canopy/70">{r.category}</p>}
          <h2 className="mt-1 font-semibold">{r.title}</h2>
          {r.description && <p className="mt-1 flex-1 text-small text-canopy/80">{r.description}</p>}
          <div className="mt-3 flex items-center gap-2"><ResourceButton id={r.id} /></div>
        </li>
      ))}
    </ul>
  );
}
export default function Resources() {
  return (<><PageHeader title="Resources" description="Private to members. Links expire after a few minutes." /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><List /></Suspense></>);
}
