import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

/**
 * Server-to-server cache refresh for scripts that write content directly
 * (seed, bulk media placement). Authorised with the Supabase secret key, which
 * only the server and the owner's scripts hold. Admin edits don't need this:
 * their Server Actions refresh caches themselves.
 *
 *   POST /api/admin/revalidate   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   { "tags": ["pages", "media"] }
 */
const body = z.object({ tags: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/)).min(1).max(40) });

function authorised(req: NextRequest) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!key || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send { tags: string[] }" }, { status: 400 });
  // expire: 0 = the next visit renders fresh content instead of serving the stale copy.
  for (const t of new Set(parsed.data.tags)) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ revalidated: parsed.data.tags }, { headers: { "cache-control": "no-store" } });
}
