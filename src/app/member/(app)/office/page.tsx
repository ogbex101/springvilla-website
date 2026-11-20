import Link from "next/link";
import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { Panel, PageHeader, EmptyState } from "@/components/admin/ui";

async function Office() {
  const s = await requireMember();
  if (!s.memberOfficeId) return <EmptyState title="No office linked yet">Your office team will link your account. <Link className="underline" href="/member/support">Ask support</Link>.</EmptyState>;
  const db = await getServerClient();
  const { data: o } = await db.from("offices").select("*").eq("id", s.memberOfficeId).maybeSingle();
  if (!o) return <EmptyState title="Office details unavailable" />;
  const hours = (o.hours ?? []) as { day: string; opens?: string; closes?: string; note?: string }[];
  return (
    <>
      <PageHeader title={o.name} description={[o.address_line, o.city, o.state].filter(Boolean).join(", ")} />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Contact">
          <ul className="space-y-1 text-small">
            {o.phone && <li>Phone: <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a></li>}
            {o.whatsapp && <li>WhatsApp: <a className="underline" href={`https://wa.me/${String(o.whatsapp).replace(/\D/g, "")}`}>{o.whatsapp}</a></li>}
            {o.email && <li>Email: <a className="underline" href={`mailto:${o.email}`}>{o.email}</a></li>}
            {o.lead_contact_name && <li>Lead contact: {o.lead_contact_name}{o.lead_contact_role ? `, ${o.lead_contact_role}` : ""}</li>}
          </ul>
        </Panel>
        <Panel title="Opening hours">
          {hours.length === 0 ? <p className="text-small text-canopy/75">Not published yet.</p> : <dl className="text-small">{hours.map((h, i) => <div key={i} className="flex justify-between py-1"><dt>{h.day}</dt><dd>{h.opens && h.closes ? `${h.opens}–${h.closes}` : "Closed"}</dd></div>)}</dl>}
        </Panel>
      </div>
      {o.status === "published" && <p className="mt-6 text-small"><Link className="underline" href={`/offices/${o.slug}`}>View the public office page</Link></p>}
    </>
  );
}
export default function OfficePage() {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Office /></Suspense>;
}
