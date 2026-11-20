import Link from "next/link";
import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { Panel, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

async function Overview() {
  const s = await requireMember();
  const db = await getServerClient();
  const now = new Date().toISOString();
  const [{ data: anns }, { data: reads }, { data: events }, { count: lessons }, { count: done }, { data: office }] = await Promise.all([
    db.from("announcements").select("id,title,published_at").in("kind", ["member", "office"]).eq("status", "published").order("published_at", { ascending: false }).limit(5),
    db.from("announcement_reads").select("announcement_id").eq("user_id", s.userId),
    db.from("events").select("slug,title,starts_at").eq("status", "published").gte("starts_at", now).order("starts_at").limit(3),
    db.from("lessons").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("member_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", s.userId),
    s.memberOfficeId ? db.from("offices").select("name,slug").eq("id", s.memberOfficeId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const read = new Set((reads ?? []).map((r) => r.announcement_id));
  const unread = (anns ?? []).filter((a) => !read.has(a.id));
  return (
    <>
      <PageHeader title={`Hello${s.displayName ? `, ${s.displayName.split(" ")[0]}` : ""}`} description={office ? `Your office: ${office.name}` : "You haven't been linked to an office yet. Ask your office team or contact support."} />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="My learning" actions={<Link href="/member/learning" className="text-small underline">Open</Link>}>
          {lessons ? (
            <>
              <p className="text-[1.6rem] font-semibold">{done ?? 0} <span className="text-lead font-normal text-canopy/75">of {lessons} lessons complete</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-canopy/10" role="progressbar" aria-valuenow={done ?? 0} aria-valuemax={lessons} aria-label="Learning progress"><div className="h-full rounded-full bg-canopy" style={{ width: `${Math.round(((done ?? 0) / lessons) * 100)}%` }} /></div>
            </>
          ) : <p className="text-small text-canopy/75">Courses will appear here when they are published.</p>}
        </Panel>
        <Panel title={`Announcements${unread.length ? ` (${unread.length} new)` : ""}`} actions={<Link href="/member/announcements" className="text-small underline">All</Link>}>
          {(anns ?? []).length === 0 ? <p className="text-small text-canopy/75">No announcements yet.</p> : (
            <ul className="space-y-2">{(anns ?? []).map((a) => <li key={a.id} className="flex justify-between gap-3 text-small"><span className={read.has(a.id) ? "" : "font-semibold"}>{a.title}</span><span className="shrink-0 text-canopy/70">{a.published_at ? formatDate(a.published_at, { day: "numeric", month: "short", year: undefined }) : ""}</span></li>)}</ul>
          )}
        </Panel>
        <Panel title="Coming up" actions={<Link href="/member/events" className="text-small underline">Events</Link>}>
          {(events ?? []).length === 0 ? <p className="text-small text-canopy/75">No upcoming events.</p> : (
            <ul className="space-y-2">{(events ?? []).map((e) => <li key={e.slug} className="text-small"><strong>{formatDate(e.starts_at, { day: "numeric", month: "short", year: undefined })}</strong> · {e.title}</li>)}</ul>
          )}
        </Panel>
        <Panel title="Need help?"><p className="text-small">Questions about learning, your office or your account? <Link href="/member/support" className="underline">Send a support request</Link>.</p></Panel>
      </div>
    </>
  );
}
export default function MemberHome() {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Overview /></Suspense>;
}
