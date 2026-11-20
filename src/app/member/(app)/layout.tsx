import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { MemberShell } from "@/components/member/MemberShell";

export const metadata = { title: { default: "Members", template: "%s · Springvilla members" }, robots: { index: false, follow: false } };

async function Gate({ children }: { children: React.ReactNode }) {
  const s = await requireMember();
  return <MemberShell name={s.displayName ?? s.email}>{children}</MemberShell>;
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-dvh bg-milky" />}><Gate>{children}</Gate></Suspense>;
}
