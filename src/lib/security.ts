import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

/** Client IP from the platform headers. Never stored raw: always hashed. */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

export function dailySalt(date = new Date()) {
  const base = process.env.ANALYTICS_SALT || "springvilla-dev-salt";
  return sha256(`${base}:${date.toISOString().slice(0, 10)}`);
}

export async function ipHash() {
  return sha256(`${dailySalt()}:${await clientIp()}`);
}

/** Postgres-backed fixed-window rate limit. Fails open only if the DB is unavailable. */
export async function rateLimit(bucket: string, max: number, windowSeconds: number) {
  if (!hasServiceRole()) return true;
  const key = `${bucket}:${await ipHash()}`;
  const { data, error } = await getServiceClient().rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) return true;
  return Boolean(data);
}
