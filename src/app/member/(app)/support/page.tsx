import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { SupportForm } from "@/components/member/MemberForms";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

async function Mine() {
  const s = await requireMember();
  const db = await getServerClient();
  const { data } = await db.from("support_requests").select("id,subject,status,created_at").eq("user_id", s.userId).order("created_at", { ascending: false });
  if (!data?.length) return <p className="text-small text-canopy/75">You haven&rsquo;t sent any requests.</p>;
  return <ul className="divide-y divide-canopy/10">{data.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-small"><span>{r.subject}</span><span className="flex items-center gap-2"><StatusBadge status={r.status} /><span className="text-canopy/70">{formatDate(r.created_at)}</span></span></li>)}</ul>;
}
export default function Support() {
  return (
    <>
      <PageHeader title="Support" description="For anything about your learning, office or account." />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="New request"><SupportForm /></Panel>
        <Panel title="Your requests"><Suspense fallback={<p>Loading…</p>}><Mine /></Suspense></Panel>
      </div>
    </>
  );
}
