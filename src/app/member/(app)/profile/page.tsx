import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { ProfileForm, PasswordForm } from "@/components/member/MemberForms";
import { PageHeader, Panel } from "@/components/admin/ui";

async function Forms() {
  const s = await requireMember();
  const db = await getServerClient();
  const { data: p } = await db.from("profiles").select("display_name,phone,privacy").eq("id", s.userId).single();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Profile"><ProfileForm name={p?.display_name ?? ""} phone={p?.phone ?? ""} showName={(p?.privacy as { show_name_to_office?: boolean })?.show_name_to_office ?? true} /></Panel>
      <Panel title="Password"><PasswordForm /></Panel>
      <Panel title="Your data" className="md:col-span-2">
        <p className="text-small">Signed in as <strong>{s.email}</strong>. To get a copy of your data or close your account, <a href="/member/support" className="underline">send a support request</a>. See the <a href="/privacy" className="underline">privacy policy</a>.</p>
      </Panel>
    </div>
  );
}
export default function Profile() {
  return (<><PageHeader title="Profile & privacy" /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Forms /></Suspense></>);
}
