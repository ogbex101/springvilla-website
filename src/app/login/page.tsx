import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { MemberLoginForm } from "@/components/member/MemberForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Member login", robots: { index: false, follow: false } };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <MemberLoginForm next={next} notice={isSupabaseConfigured ? undefined : "Member sign-in will be available soon."} />;
}

export default function MemberLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <AuthCard brand="Springvilla" title="Member login" subtitle="Your learning, office updates and resources." footer={<Link href="/" className="underline">Back to the website</Link>}>
      <Suspense fallback={null}><Form searchParams={searchParams} /></Suspense>
    </AuthCard>
  );
}
