import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/** Enables Draft Mode for an authenticated content admin, then shows the page. */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.needsMfa || !can(s.roles, "siteContent")) return new NextResponse("Not allowed", { status: 403 });
  const path = req.nextUrl.searchParams.get("path") ?? "/";
  const safe = path.startsWith("/") && !path.startsWith("//") && !/^\/(admin|api|member)/.test(path) ? path : "/";
  (await draftMode()).enable();
  return NextResponse.redirect(new URL(safe, req.url));
}
