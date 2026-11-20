import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AdminLoginForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const notice = !isSupabaseConfigured
    ? "Supabase is not connected yet. Follow docs/OWNER_TODO.md section B to set it up, then sign in here."
    : sp.error === "no-access"
      ? "Your account doesn't have admin access."
      : undefined;
  return <AdminLoginForm next={sp.next} notice={notice} />;
}

export default function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return (
    <AuthCard title="Sign in" subtitle="For Springvilla staff and editors.">
      <Suspense fallback={null}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
