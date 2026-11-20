import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can, isStaffRole, type Capability, type Role } from "./roles";

export type SessionInfo = {
  userId: string;
  email: string;
  displayName: string | null;
  roles: Role[];
  officeIds: string[];
  memberOfficeId: string | null;
  aal: "aal1" | "aal2";
  needsMfa: boolean; // super admin without a verified MFA factor in this session
};

/**
 * Reads the current user, their roles and MFA level. Returns null if signed out.
 * Note: super_admin is dropped from effective roles until the session is aal2,
 * matching public.current_roles() in the database.
 */
export const getSession = cache(async function getSession(): Promise<SessionInfo | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: roleRows }, { data: profile }, { data: aalData }] = await Promise.all([
    supabase.from("user_roles").select("role, office_id").eq("user_id", user.id),
    supabase.from("profiles").select("display_name, office_id, is_active").eq("id", user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (profile && profile.is_active === false) return null;

  const aal = (aalData?.currentLevel ?? "aal1") as "aal1" | "aal2";
  const rawRoles = (roleRows ?? []) as { role: Role; office_id: string | null }[];
  const isSuper = rawRoles.some((r) => r.role === "super_admin");
  const roles = Array.from(new Set(rawRoles.map((r) => r.role).filter((r) => r !== "super_admin" || aal === "aal2")));

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    roles,
    officeIds: rawRoles.filter((r) => r.role === "office_admin" && r.office_id).map((r) => r.office_id as string),
    memberOfficeId: profile?.office_id ?? null,
    aal,
    needsMfa: isSuper && aal !== "aal2",
  };
});

/**
 * The signed-in user's ASSIGNED roles (super_admin included at aal1), via the
 * security-definer RPC my_assigned_roles(). Only for routing sign-in; never for
 * permissions (use getSession().roles). Distinguishes "no roles" from "lookup failed".
 */
export async function getAssignedRoles(): Promise<{ ok: true; roles: Role[] } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc("my_assigned_roles");
  if (error) {
    console.error("[auth] my_assigned_roles failed:", error.code, error.message);
    return { ok: false, error: error.message };
  }
  const roles = ((data ?? []) as unknown[]).map((r) => (typeof r === "string" ? r : (r as { my_assigned_roles: string }).my_assigned_roles)) as Role[];
  return { ok: true, roles };
}

export function isStaff(s: SessionInfo | null) {
  return Boolean(s && s.roles.some(isStaffRole));
}

/** Page guard for /admin pages. Redirects instead of throwing. */
export async function requireAdminPage(cap: Capability = "dashboard") {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.needsMfa) redirect("/admin/mfa");
  if (!isStaff(s)) redirect("/admin/login?error=no-access");
  if (!can(s.roles, cap)) redirect("/admin?denied=" + cap);
  return s;
}

/** Server-action guard. Throws so the action returns an error state. */
export async function requireCapability(cap: Capability) {
  const s = await getSession();
  if (!s || s.needsMfa || !can(s.roles, cap)) throw new Error("You do not have permission to do that.");
  return s;
}

export async function requireMember() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
