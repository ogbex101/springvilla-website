import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { MfaStep } from "@/components/auth/MfaStep";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Two-step verification", robots: { index: false, follow: false } };

async function Gate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  const { next } = await searchParams;
  if (!s.needsMfa) redirect(next?.startsWith("/admin") ? next : "/admin");
  return <MfaStep next={next ?? "/admin"} />;
}

export default function Mfa({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <AuthCard title="Two-step verification" subtitle="Required for super admins.">
      <Suspense fallback={<p>Loading…</p>}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
