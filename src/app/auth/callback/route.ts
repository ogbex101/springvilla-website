import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

/** Exchanges the email-link code (password reset, invite) for a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";
  const safeNext = /^\/(admin|member)(\/|$)/.test(next) ? next : "/admin";
  if (code) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/login?error=link", url.origin));
}
