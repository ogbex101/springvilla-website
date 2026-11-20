"use server";

import { z } from "zod";
import { joinSchema, contactSchema, type FormResult, type JoinInput, type ContactInput } from "@/lib/forms/schemas";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { rateLimit, sha256 } from "@/lib/security";

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

const NOT_CONNECTED: FormResult = {
  ok: false,
  error: "Online applications aren't connected yet. Please use the contact details on the Find an Office page for now.",
};

export async function submitJoin(input: JoinInput): Promise<FormResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  // Honeypot or impossibly fast submissions: pretend success, store nothing.
  if (d.website || (d.startedAt && Date.now() - d.startedAt < 2500)) return { ok: true };
  if (!(await rateLimit("join", 5, 600))) return { ok: false, error: "Too many submissions from this connection. Please wait a few minutes and try again." };
  if (!hasServiceRole()) return NOT_CONNECTED;

  const day = new Date().toISOString().slice(0, 10);
  const contactKey = d.email || d.phone.replace(/\D/g, "");
  const { error } = await getServiceClient()
    .from("join_applications")
    .insert({
      full_name: d.fullName,
      email: d.email || null,
      phone: d.phone || null,
      preferred_contact: d.preferredContact,
      city: d.city,
      office_id: d.officeId || null,
      occupation: d.occupation || null,
      interest: d.interest,
      message: d.message || null,
      consent_privacy: true,
      marketing_opt_in: d.marketingOptIn,
      consent_version: d.consentVersion ?? null,
      source_path: d.sourcePath ?? "/join",
      utm: d.utm ?? null,
      dedupe_key: sha256(`${contactKey}|${day}`),
    });
  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("join insert failed", error.message);
    return { ok: false, error: "Something went wrong on our side. Your details are still here; please try again." };
  }
  return { ok: true };
}

export async function submitContact(input: ContactInput): Promise<FormResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.website || (d.startedAt && Date.now() - d.startedAt < 2500)) return { ok: true };
  if (!(await rateLimit("contact", 5, 600))) return { ok: false, error: "Too many messages from this connection. Please wait a few minutes and try again." };
  if (!hasServiceRole()) return { ok: false, error: "The contact form isn’t connected yet. Please try again soon." };

  const { error } = await getServiceClient()
    .from("contact_enquiries")
    .insert({
      enquiry_type: d.enquiryType,
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      office_id: d.officeId || null,
      subject: d.subject || null,
      message: d.message,
      consent_privacy: true,
      source_path: d.sourcePath ?? "/contact",
      dedupe_key: sha256(`${d.email}|${d.enquiryType}|${sha256(d.message)}`),
    });
  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("contact insert failed", error.message);
    return { ok: false, error: "Something went wrong on our side. Your message is still here; please try again." };
  }
  return { ok: true };
}
