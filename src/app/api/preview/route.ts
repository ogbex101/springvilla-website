import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Legacy preview link. Draft Mode is no longer used (it broke public pages under
 * Cache Components), so this switches it off for browsers that still have the
 * cookie and sends them to the normal page.
 */
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  const path = req.nextUrl.searchParams.get("path") ?? "/";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return NextResponse.redirect(new URL(safe, req.url));
}
