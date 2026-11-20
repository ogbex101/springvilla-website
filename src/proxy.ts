import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot", "/admin/reset"];

/**
 * Optimistic auth gate + session refresh. Real authorisation happens in
 * server guards (lib/auth/session.ts) and RLS.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (!url || !key) {
    // No Supabase yet: protected areas show their login screens, which explain setup.
    if (pathname.startsWith("/admin") && !PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (pathname.startsWith("/member")) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminPublic = PUBLIC_ADMIN.some((p) => pathname.startsWith(p));
  if (pathname.startsWith("/admin") && !isAdminPublic && !user) {
    const to = new URL("/admin/login", request.url);
    if (pathname !== "/admin") to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }
  if (pathname.startsWith("/member") && !user) {
    const to = new URL("/login", request.url);
    to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/member/:path*", "/login", "/auth/:path*", "/api/admin/:path*"],
};
