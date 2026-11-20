import "server-only";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";

/**
 * Logs an unexpected server error and records it in the audit log (action
 * "server.error") so it is visible in Admin → Audit log without platform logs.
 * Records only the error name, message and stack: never form input.
 */
export async function reportServerError(scope: string, e: unknown, extra: Record<string, string | undefined> = {}) {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error(`[${scope}]`, err);
  if (!hasServiceRole()) return;
  try {
    await getServiceClient().rpc("write_audit", {
      p_action: "server.error",
      p_entity: scope,
      p_entity_id: null,
      p_before: null,
      p_after: { ...extra, name: err.name, message: err.message.slice(0, 500), stack: (err.stack ?? "").split("\n").slice(0, 8).join("\n"), cause: String((err as { cause?: unknown }).cause ?? "").slice(0, 300) },
    });
  } catch {
    // Reporting must never throw.
  }
}
