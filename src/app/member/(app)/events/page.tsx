import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { EventDate } from "@/components/content/EventDate";
import { PageHeader, EmptyState, Badge } from "@/components/admin/ui";

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

async function List() {
  await requireMember();
  const db = await getServerClient();
  const { data } = await db.from("events").select("id,slug,title,summary,starts_at,ends_at,timezone,audience,venue,registration_url,offices(name)").eq("status", "published").gte("starts_at", yesterday()).order("starts_at").limit(50);
  if (!data?.length) return <EmptyState title="No upcoming events" />;
  return (
    <ul className="space-y-3">
      {(data as unknown as { id: string; slug: string; title: string; summary: string | null; starts_at: string; ends_at: string | null; timezone: string; audience: string; venue: string | null; registration_url: string | null; offices: { name: string } | null }[]).map((e) => (
        <li key={e.id} className="rounded-xl bg-white p-5 ring-1 ring-canopy/10">
          <p className="text-small text-canopy/75"><EventDate start={e.starts_at} end={e.ends_at} timeZone={e.timezone} long /> {e.audience === "members" && <Badge tone="info">Members only</Badge>}</p>
          <h2 className="mt-1 text-[1.2rem] font-semibold">{e.audience === "public" ? <a className="underline-offset-4 hover:underline" href={`/events/${e.slug}`}>{e.title}</a> : e.title}</h2>
          <p className="text-small text-canopy/75">{e.offices?.name ?? e.venue}</p>
          {e.summary && <p className="mt-2">{e.summary}</p>}
          {e.registration_url && <a className="mt-2 inline-block text-small font-semibold underline" href={e.registration_url} target="_blank" rel="noopener noreferrer">Register</a>}
        </li>
      ))}
    </ul>
  );
}
export default function Events() {
  return (<><PageHeader title="Events" /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><List /></Suspense></>);
}
