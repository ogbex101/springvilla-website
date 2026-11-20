import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/Shell";

export const metadata = { title: { default: "Admin", template: "%s · Springvilla admin" }, robots: { index: false, follow: false } };

async function Gate({ children }: { children: React.ReactNode }) {
  const s = await requireAdminPage("dashboard");
  return (
    <AdminShell roles={s.roles} email={s.email}>
      {children}
    </AdminShell>
  );
}

function Skeleton() {
  return (
    <div className="min-h-dvh bg-sand lg:grid lg:grid-cols-[264px_1fr]">
      <div className="hidden bg-canopy lg:block" />
      <div className="space-y-4 p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-canopy/10" />
        <div className="h-40 animate-pulse rounded-xl bg-canopy/8" />
      </div>
    </div>
  );
}

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
