"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ipHash, rateLimit, sha256 } from "@/lib/security";
import { siteUrl } from "@/lib/utils";
import { getAssignedRoles } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/roles";

export type AuthState = { error?: string; ok?: boolean; message?: string } | null;

const GENERIC = "That email and password combination didn't work.";

async function recordAttempt(email: string, success: boolean) {
  if (!hasServiceRole()) return;
  await getServiceClient().from("login_attempts").insert({ email_hash: sha256(email), ip_hash: await ipHash(), success });
}

/** Shared sign-in for admin and member login: rate limit + lockout + generic errors. */
export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "Sign-in isn't set up yet: Supabase is not configured (see docs/OWNER_TODO.md)." };
  email = email.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  if (!(await rateLimit("login", 10, 300))) return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  if (hasServiceRole()) {
    const { data: locked } = await getServiceClient().rpc("login_locked", { p_email_hash: sha256(email), p_ip_hash: await ipHash() });
    if (locked) return { ok: false, error: "This account is temporarily locked after several failed attempts. Try again in 15 minutes, or reset your password." };
  }
  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  await recordAttempt(email, !error);
  if (error) return { ok: false, error: GENERIC };
  return { ok: true };
}

export async function adminSignIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const res = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  const supabase = await getServerClient();
  // Assigned roles, read server-side through a security-definer RPC so super_admin is
  // visible at aal1 (current_roles() hides it until MFA, by design).
  const assigned = await getAssignedRoles();
  if (!assigned.ok) {
    await supabase.auth.signOut();
    return { error: "We couldn't check your access just now. Please try again in a minute; if it keeps happening, the database setup needs finishing (docs/OWNER_TODO.md)." };
  }
  if (!assigned.roles.some(isStaffRole)) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }
  const next = String(form.get("next") ?? "");
  const dest = next.startsWith("/admin") ? next : "/admin";
  if (assigned.roles.includes("super_admin")) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasTotp = Boolean(factors?.totp?.some((f) => f.status === "verified"));
    const qs = new URLSearchParams({ step: hasTotp ? "verify" : "enrol" });
    if (dest !== "/admin") qs.set("next", dest);
    redirect(`/admin/mfa?${qs}`);
  }
  redirect(dest);
}

export async function signOutAction() {
  if (isSupabaseConfigured) await (await getServerClient()).auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!(await rateLimit("reset", 3, 900))) return { error: "Too many requests. Please wait 15 minutes." };
  const origin = (await headers()).get("origin") || siteUrl();
  await (await getServerClient()).auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/admin/reset` });
  // Same response whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const pw = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (pw.length < 12) return { error: "Use at least 12 characters." };
  if (pw !== confirm) return { error: "The passwords don't match." };
  const { error } = await (await getServerClient()).auth.updateUser({ password: pw });
  if (error) return { error: "Your reset link has expired. Request a new one." };
  redirect("/admin");
}
