"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireCapability } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { ROLES } from "@/lib/auth/roles";
import { siteUrl } from "@/lib/utils";

type R = { ok: true; message?: string } | { ok: false; error: string };
const roleSchema = z.object({ role: z.enum(ROLES), office_id: z.string().uuid().nullable() });

function check(role: string, office: string | null, isSuper: boolean) {
  if (role === "super_admin" && !isSuper) throw new Error("Only a super admin can grant super admin.");
  if (role === "office_admin" && !office) throw new Error("Choose the office this admin manages.");
}

export async function inviteUser(input: { email: string; role: string; office_id: string | null }): Promise<R> {
  try {
    const s = await requireCapability("users");
    const email = z.string().trim().toLowerCase().email("Enter a valid email").parse(input.email);
    const { role, office_id } = roleSchema.parse(input);
    check(role, office_id, s.roles.includes("super_admin"));
    const origin = (await headers()).get("origin") || siteUrl();
    const svc = getServiceClient();
    const next = role === "member" ? "/member" : "/admin/reset";
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=${next}` });
    let userId = data?.user?.id;
    if (error) {
      if (!/already|registered|exists/i.test(error.message)) throw error;
      const { data: p } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = p?.id;
      if (!userId) throw new Error("That email already has an account, but no profile was found.");
    }
    const db = await getServerClient();
    const { error: rErr } = await db.from("user_roles").insert({ user_id: userId, role, office_id: role === "office_admin" || role === "member" ? office_id : null });
    if (rErr && rErr.code !== "23505") throw rErr;
    if (role === "member" && office_id) await db.from("profiles").update({ office_id }).eq("id", userId!);
    return { ok: true, message: error ? "Existing account: role added." : `Invitation sent to ${email}.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function addRole(userId: string, input: { role: string; office_id: string | null }): Promise<R> {
  try {
    const s = await requireCapability("users");
    const { role, office_id } = roleSchema.parse(input);
    check(role, office_id, s.roles.includes("super_admin"));
    const db = await getServerClient();
    const { error } = await db.from("user_roles").insert({ user_id: userId, role, office_id: role === "office_admin" ? office_id : null });
    if (error) throw new Error(error.code === "23505" ? "They already have that role." : error.message);
    if (role === "member" && office_id) await db.from("profiles").update({ office_id }).eq("id", userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeRole(roleId: string): Promise<R> {
  try {
    const s = await requireCapability("users");
    const db = await getServerClient();
    const { data: row } = await db.from("user_roles").select("user_id,role").eq("id", roleId).single();
    if (row?.user_id === s.userId && (row.role === "super_admin" || row.role === "central_admin")) throw new Error("You can't remove your own admin role.");
    const { error, count } = await db.from("user_roles").delete({ count: "exact" }).eq("id", roleId);
    if (error) throw error;
    if (!count) throw new Error("You can't remove that role.");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setActive(userId: string, active: boolean): Promise<R> {
  try {
    const s = await requireCapability("users");
    if (userId === s.userId) throw new Error("You can't deactivate yourself.");
    const db = await getServerClient();
    const { error } = await db.from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) throw error;
    // Also block sign-in at the auth level.
    await getServiceClient().auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    return { ok: true, message: active ? "User reactivated." : "User deactivated and signed out of new sessions." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
