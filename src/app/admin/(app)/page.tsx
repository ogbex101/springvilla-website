import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Clapperboard, FilePlus2, CalendarPlus, Inbox, Mail, ShieldCheck, CalendarClock, CalendarDays, Building2, ImageOff, Hourglass } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getServerClient } from "@/lib/supabase/server";
import { PageHeader, Panel, btn } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const Sparkline = dynamic(() => import("@/components/admin/Sparkline"));

export const metadata = { title: "Dashboard" };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function Stat({ label, value, href, icon: Icon }: { label: string; value: number | null; href?: string; icon: typeof Inbox }) {
  const body = (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 ring-1 ring-canopy/10 transition-colors hover:ring-canopy/40">
      <span className="grid size-11 place-items-center rounded-lg bg-lime/60"><Icon className="size-5" aria-hidden /></span>
      <span>
        <span className="block text-[1.7rem] font-semibold leading-none tabular-nums">{value ?? "—"}</span>
        <span className="mt-1 block text-small text-canopy/75">{label}</span>
      </span>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const s = await requireAdminPage("dashboard");
  const { denied } = await searchParams;
  const db = await getServerClient();
  const head = { count: "exact" as const, head: true };
  const now = new Date().toISOString();
  const monthAgo = daysAgo(31);
  const [apps, enq, pendingPosts, pendingOffices, scheduled, events, visitors, verifiedOffices, assetsNeedingWork, staleOffices, activity] = await Promise.all([
    can(s.roles, "inbox") ? db.from("join_applications").select("id", head).eq("status", "new") : null,
    can(s.roles, "inbox") ? db.from("contact_enquiries").select("id", head).eq("status", "new") : null,
    can(s.roles, "blog") ? db.from("blog_posts").select("id", head).in("status", ["in_review", "claims_review"]) : null,
    can(s.roles, "settings") ? db.from("offices").select("id", head).not("pending_changes", "is", null) : null,
    can(s.roles, "blog") ? db.from("blog_posts").select("id", head).eq("status", "scheduled").gt("published_at", now) : null,
    can(s.roles, "events") ? db.from("events").select("id", head).eq("status", "published").gte("starts_at", now) : null,
    can(s.roles, "analytics") ? db.rpc("analytics_visitor_counts") : null,
    can(s.roles, "settings") ? db.from("offices").select("id", head).eq("status", "published").eq("verification_status", "verified") : null,
    can(s.roles, "media") ? db.from("media_assets").select("id", head).eq("bucket", "public-media").or("alt_text.is.null,alt_text.eq.,consent_confirmed.eq.false") : null,
    can(s.roles, "offices") ? db.from("offices").select("id", head).or(`last_verified_at.is.null,last_verified_at.lt.${monthAgo}`) : null,
    can(s.roles, "audit") ? db.from("audit_log").select("id,actor_email,action,entity,after,before,created_at").order("created_at", { ascending: false }).limit(8) : null,
  ]);
  const v = visitors?.data as { today: number; d7: number; d30: number; spark: { day: string; views: number }[] } | null;
  const pendingApprovals = (pendingPosts?.count ?? 0) + (pendingOffices?.count ?? 0);

  return (
    <>
      <PageHeader title={`Welcome${s.displayName ? `, ${s.displayName.split(" ")[0]}` : ""}`} description="Real numbers only: everything here comes straight from the database." />
      {denied && <p role="alert" className="mb-6 rounded-lg bg-[#fbecc8] p-3 text-small text-[#6b4a00]">Your role doesn&rsquo;t include access to that area.</p>}
      <div className="mb-8 flex flex-wrap gap-2">
        {can(s.roles, "hero") && <Link href="/admin/hero" className={btn.primary}><Clapperboard className="size-4" aria-hidden />Change hero video</Link>}
        {can(s.roles, "blog") && <Link href="/admin/articles/new" className={btn.secondary}><FilePlus2 className="size-4" aria-hidden />New article</Link>}
        {can(s.roles, "events") && <Link href="/admin/events/new" className={btn.secondary}><CalendarPlus className="size-4" aria-hidden />New event</Link>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {apps && <Stat label="New applications" value={apps.count} href="/admin/inbox" icon={Inbox} />}
        {enq && <Stat label="New enquiries" value={enq.count} href="/admin/inbox?tab=enquiries" icon={Mail} />}
        {(pendingPosts || pendingOffices) && <Stat label="Waiting for approval" value={pendingApprovals} href="/admin/articles?status=claims_review" icon={ShieldCheck} />}
        {scheduled && <Stat label="Scheduled articles" value={scheduled.count} href="/admin/articles?status=scheduled" icon={CalendarClock} />}
        {events && <Stat label="Upcoming events" value={events.count} href="/admin/events" icon={CalendarDays} />}
        {verifiedOffices && <Stat label="Verified, published offices" value={verifiedOffices.count} href="/admin/offices" icon={Building2} />}
        {staleOffices && <Stat label="Offices due a monthly check" value={staleOffices.count} href="/admin/offices" icon={Hourglass} />}
        {assetsNeedingWork && <Stat label="Photos missing alt text or consent" value={assetsNeedingWork.count} href="/admin/media?consent=no" icon={ImageOff} />}
      </div>
      {v && (
        <Panel className="mt-6" title="Visitors" actions={<Link href="/admin/analytics" className="text-small underline">Full analytics</Link>}>
          <dl className="grid grid-cols-3 gap-4">
            {[["Today", v.today], ["Last 7 days", v.d7], ["Last 30 days", v.d30]].map(([l, n]) => (
              <div key={l as string}><dt className="text-small text-canopy/75">{l}</dt><dd className="text-[1.6rem] font-semibold tabular-nums">{n as number}</dd></div>
            ))}
          </dl>
          <div className="mt-4"><Sparkline data={v.spark} /></div>
        </Panel>
      )}
      {activity && (
        <Panel className="mt-6" title="Recent activity" actions={<Link href="/admin/audit" className="text-small underline">Audit log</Link>}>
          {(activity.data ?? []).length === 0 ? <p className="text-small text-canopy/75">No activity yet.</p> : (
            <ul className="divide-y divide-canopy/10">
              {(activity.data ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2 text-small">
                  <span><strong>{a.actor_email ?? "System"}</strong> {a.action === "insert" ? "created" : a.action === "delete" ? "deleted" : "updated"} {a.entity.replace(/_/g, " ")} <span className="text-canopy/75">{String((a.after as Record<string, unknown>)?.title ?? (a.after as Record<string, unknown>)?.name ?? "")}</span></span>
                  <span className="text-caption text-canopy/70">{formatDate(a.created_at, { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}

export default function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Dashboard searchParams={searchParams} /></Suspense>;
}
