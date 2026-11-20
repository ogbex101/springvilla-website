import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { SafeHtml } from "@/components/site/SafeHtml";
import { MarkReadButton } from "@/components/member/MemberClient";
import { PageHeader, EmptyState, Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

function nowIso() {
  return new Date().toISOString();
}

async function List() {
  const s = await requireMember();
  const db = await getServerClient();
  const [{ data }, { data: reads }] = await Promise.all([
    db.from("announcements").select("id,title,summary,body_html,published_at,pinned,kind,priority,expires_at").in("kind", ["member", "office"]).eq("status", "published").or(`expires_at.is.null,expires_at.gt.${nowIso()}`).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(50),
    db.from("announcement_reads").select("announcement_id").eq("user_id", s.userId),
  ]);
  const read = new Set((reads ?? []).map((r) => r.announcement_id));
  if (!data?.length) return <EmptyState title="No announcements yet" />;
  return (
    <ul className="space-y-4">
      {data.map((a) => (
        <li key={a.id} className="rounded-xl bg-white p-5 ring-1 ring-canopy/10">
          <div className="flex flex-wrap items-center gap-2">
            {!read.has(a.id) && <Badge tone="info">New</Badge>}
            {a.pinned && <Badge>Pinned</Badge>}
            {a.priority === "urgent" && <Badge tone="bad">Action required</Badge>}
            {a.priority === "important" && <Badge tone="warn">Important</Badge>}
            <span className="text-caption text-canopy/70">{a.published_at ? formatDate(a.published_at) : ""} · {a.kind === "office" ? "Your office" : "All members"}</span>
          </div>
          <h2 className="mt-2 text-[1.25rem] font-semibold">{a.title}</h2>
          {a.summary && <p className="mt-1 text-canopy/80">{a.summary}</p>}
          {a.body_html && <details className="mt-2"><summary className="cursor-pointer text-small font-semibold">Read more</summary><SafeHtml className="sv-prose mt-3" html={a.body_html} /></details>}
          {!read.has(a.id) && <div className="mt-3"><MarkReadButton id={a.id} /></div>}
        </li>
      ))}
    </ul>
  );
}
export default function Announcements() {
  return (<><PageHeader title="Announcements" /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><List /></Suspense></>);
}
