"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { signIn } from "@/app/admin/actions/auth";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type State = { error?: string; message?: string } | null;

export async function memberSignIn(_p: State, form: FormData): Promise<State> {
  const r = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/member") ? `${next}${next.includes("?") ? "&" : "?"}signed_in=1` : "/member?signed_in=1");
}

export async function memberSignOut() {
  if (isSupabaseConfigured) await (await getServerClient()).auth.signOut();
  redirect("/login");
}

export async function markRead(announcementId: string) {
  const s = await requireMember();
  const db = await getServerClient();
  await db.from("announcement_reads").upsert({ announcement_id: announcementId, user_id: s.userId });
  revalidatePath("/member/announcements");
}

export async function toggleLesson(lessonId: string, done: boolean) {
  const s = await requireMember();
  const db = await getServerClient();
  if (done) await db.from("member_progress").upsert({ user_id: s.userId, lesson_id: lessonId });
  else await db.from("member_progress").delete().eq("user_id", s.userId).eq("lesson_id", lessonId);
  revalidatePath("/member/learning");
}

const supportSchema = z.object({ category: z.enum(["general", "learning", "office", "account", "wellbeing"]), subject: z.string().trim().min(3, "Add a short subject").max(160), message: z.string().trim().min(10, "Tell us a little more").max(4000) });
export async function createSupport(_p: State, form: FormData): Promise<State> {
  const s = await requireMember();
  const r = supportSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const db = await getServerClient();
  const { error } = await db.from("support_requests").insert({ ...r.data, user_id: s.userId, office_id: s.memberOfficeId });
  if (error) return { error: "Couldn't send your request. Please try again." };
  revalidatePath("/member/support");
  return { message: "Request sent. The support team will reply soon." };
}

const profileSchema = z.object({ display_name: z.string().trim().min(2, "Enter your name").max(80), phone: z.string().trim().max(25).regex(/^[+()\d\s-]*$/, "Use digits only").optional().default(""), show_name_to_office: z.string().optional() });
export async function saveProfile(_p: State, form: FormData): Promise<State> {
  const s = await requireMember();
  const r = profileSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const db = await getServerClient();
  const { error } = await db.from("profiles").update({ display_name: r.data.display_name, phone: r.data.phone || null, privacy: { show_name_to_office: r.data.show_name_to_office === "on" } }).eq("id", s.userId);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/member/profile");
  return { message: "Saved." };
}

export async function changePassword(_p: State, form: FormData): Promise<State> {
  await requireMember();
  const pw = String(form.get("password") ?? "");
  if (pw.length < 12) return { error: "Use at least 12 characters." };
  if (pw !== String(form.get("confirm") ?? "")) return { error: "The passwords don't match." };
  const { error } = await (await getServerClient()).auth.updateUser({ password: pw });
  return error ? { error: "Couldn't change your password. Sign out and use 'forgot password'." } : { message: "Password changed." };
}

/** Short-lived signed link to a private resource the member may see (RLS checked first). */
export async function resourceLink(resourceId: string): Promise<string | null> {
  await requireMember();
  const db = await getServerClient();
  const { data } = await db.from("resources").select("asset_id").eq("id", resourceId).maybeSingle();
  if (!data) return null;
  const { data: m } = await getServiceClient().from("media_assets").select("bucket,path").eq("id", data.asset_id).single();
  if (!m || m.bucket !== "private-docs") return null;
  const { data: signed } = await getServiceClient().storage.from("private-docs").createSignedUrl(m.path, 300);
  return signed?.signedUrl ?? null;
}
