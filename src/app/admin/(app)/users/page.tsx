import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/admin/UsersManager";
import { PageHeader } from "@/components/admin/ui";
import type { Role } from "@/lib/auth/roles";

export const metadata = { title: "Users & roles" };

async function Users() {
  const s = await requireAdminPage("users");
  const db = await getServerClient();
  const [{ data: profiles }, { data: roles }, { data: offices }] = await Promise.all([
    db.from("profiles").select("id,email,display_name,is_active").order("email").limit(1000),
    db.from("user_roles").select("id,user_id,role,offices(name)"),
    db.from("offices").select("id,name").order("name"),
  ]);
  const byUser = new Map<string, { id: string; role: Role; office: string | null }[]>();
  for (const r of (roles ?? []) as unknown as { id: string; user_id: string; role: Role; offices: { name: string } | null }[]) {
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), { id: r.id, role: r.role, office: r.offices?.name ?? null }]);
  }
  const users = (profiles ?? []).map((p) => ({ id: p.id, email: p.email ?? "", name: p.display_name, active: p.is_active, roles: byUser.get(p.id) ?? [] }));
  return <UsersManager users={users} offices={offices ?? []} isSuper={s.roles.includes("super_admin")} me={s.userId} />;
}

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users & roles" description="Invite staff and members, assign roles and offices, and deactivate accounts." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Users /></Suspense>
    </>
  );
}
