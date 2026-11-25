import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** What kind of key a value looks like. Never returns the value itself. */
function keyKind(v: string | undefined) {
  if (!v) return "missing";
  if (v !== v.trim()) return "has-whitespace";
  if (/^["']|["']$/.test(v)) return "has-quotes";
  if (v.startsWith("sb_publishable_")) return "publishable";
  if (v.startsWith("sb_secret_")) return "secret";
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) return "legacy-jwt";
  return "unrecognised";
}

/**
 * Configuration health check for the owner and for debugging deploys.
 * Reports only shapes and status codes, never secrets or data.
 */
export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let urlOk = false;
  try {
    urlOk = Boolean(url && url === url.trim() && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(new URL(url).origin) && !/\/$/.test(url));
  } catch {}
  const probe = async (key: string | undefined, table: string) => {
    if (!urlOk || !key) return "skipped";
    try {
      const { error } = await createClient(url!.trim(), key.trim(), { auth: { persistSession: false } }).from(table).select("*", { head: true, count: "exact" }).limit(1);
      return error ? `error ${error.code ?? ""} ${error.message.slice(0, 80)}` : "ok";
    } catch (e) {
      return `threw ${(e as Error).name}: ${(e as Error).message.slice(0, 80)}`;
    }
  };
  return NextResponse.json(
    {
      node: process.version,
      supabaseUrl: url ? (urlOk ? "ok" : "malformed") : "missing",
      anonKey: keyKind(anon),
      serviceKey: keyKind(service),
      analyticsSalt: process.env.ANALYTICS_SALT ? "set" : "missing",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ? "set" : "missing",
      publicRead: await probe(anon, "pages"),
      serverRead: await probe(service, "join_applications"),
    },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
