"use server";

import { randomBytes } from "node:crypto";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { rateLimit, sha256 } from "@/lib/security";
import { getAssignedRoles } from "@/lib/auth/session";

const CODE_COUNT = 10;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

const normalise = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (userId: string, code: string) => sha256(`mfa-backup:${userId}:${normalise(code)}`);

function newCode() {
  const bytes = randomBytes(10);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

export type BackupCodesResult = { codes: string[] } | { error: string };

/**
 * Issues a fresh set of one-time backup codes, replacing any earlier set.
 * Only for a super admin who has just verified TOTP (aal2). Codes are shown once
 * and stored only as hashes.
 */
export async function issueBackupCodes(): Promise<BackupCodesResult> {
  if (!hasServiceRole()) return { error: "Backup codes need the server key (SUPABASE_SERVICE_ROLE_KEY)." };
  const supabase = await getServerClient();
  const [{ data: auth }, { data: aal }] = await Promise.all([supabase.auth.getUser(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  const user = auth.user;
  if (!user || aal?.currentLevel !== "aal2") return { error: "Verify your authenticator code first." };
  const roles = await getAssignedRoles();
  if (!roles.ok || !roles.roles.includes("super_admin")) return { error: "Backup codes are only for super admins." };

  const codes = Array.from({ length: CODE_COUNT }, newCode);
  const svc = getServiceClient();
  const del = await svc.from("mfa_backup_codes").delete().eq("user_id", user.id);
  if (del.error) return { error: "Couldn't save backup codes. Try again from Admin → Account." };
  const ins = await svc.from("mfa_backup_codes").insert(codes.map((c) => ({ user_id: user.id, code_hash: hashCode(user.id, c) })));
  if (ins.error) return { error: "Couldn't save backup codes. Try again from Admin → Account." };
  await svc.rpc("write_audit", { p_action: "mfa.backup_codes_issued", p_entity: "user", p_entity_id: user.id, p_before: null, p_after: null });
  return { codes };
}

export type RedeemResult = { ok: true } | { error: string };

/**
 * Lost authenticator: a valid unused backup code removes the user's TOTP factors
 * so they can enrol a new one straight away. The code is then spent.
 * Requires the password step (an aal1 session) to have succeeded already.
 */
export async function redeemBackupCode(code: string): Promise<RedeemResult> {
  if (!hasServiceRole()) return { error: "Backup codes need the server key (SUPABASE_SERVICE_ROLE_KEY)." };
  if (!(await rateLimit("mfa-backup", 5, 900))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Your session has ended. Sign in again." };
  if (normalise(code).length !== 10) return { error: "That backup code didn't work." };

  const svc = getServiceClient();
  const { data: spent, error } = await svc
    .from("mfa_backup_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("code_hash", hashCode(user.id, code))
    .is("used_at", null)
    .select("id");
  if (error || !spent?.length) return { error: "That backup code didn't work." };

  const { data: factors, error: listErr } = await svc.auth.admin.mfa.listFactors({ userId: user.id });
  if (listErr) return { error: "Couldn't reset your authenticator. Contact another super admin." };
  for (const f of factors?.factors ?? []) await svc.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
  // Old codes belonged to the old authenticator; a new set is issued after re-enrolment.
  await svc.from("mfa_backup_codes").delete().eq("user_id", user.id);
  await svc.rpc("write_audit", { p_action: "mfa.backup_code_redeemed", p_entity: "user", p_entity_id: user.id, p_before: null, p_after: null });
  return { ok: true };
}
