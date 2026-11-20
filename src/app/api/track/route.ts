import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { dailySalt, sha256 } from "@/lib/security";

const EVENTS = ["page_view", "cta_click", "hero_video_play", "hero_video_pause", "scroll_depth", "outbound_click", "office_view", "office_search", "join_started", "join_submitted", "contact_submitted", "article_read", "event_view", "login_success", "lesson_complete"] as const;

const schema = z.object({
  e: z.enum(EVENTS),
  p: z.string().max(300).regex(/^\//),
  r: z.string().max(500).optional(),
  us: z.string().max(100).optional(),
  um: z.string().max(100).optional(),
  uc: z.string().max(100).optional(),
  w: z.number().int().min(0).max(10000).optional(),
  x: z.record(z.string().max(40), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|monitor|curl|wget|python|axios|httpclient|facebookexternalhit|embedly|whatsapp/i;

// Best-effort per-instance limiter (no IPs stored): 120 events / minute / hashed client.
const buckets = new Map<string, { n: number; t: number }>();
function limited(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.t > 60_000) {
    buckets.set(key, { n: 1, t: now });
    if (buckets.size > 5000) buckets.clear();
    return false;
  }
  b.n++;
  return b.n > 120;
}

function device(ua: string, width?: number) {
  if (/ipad|tablet/i.test(ua) || (width && width >= 600 && width < 1024 && /mobile|android/i.test(ua))) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}
function browser(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

/**
 * Privacy-respecting event collector. Never stores raw IPs or user agents.
 * Session hash (daily-rotated salt + IP + UA) only when the visitor consented.
 */
export async function POST(req: NextRequest) {
  const ok = new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return ok;
    const raw = await req.text();
    if (raw.length > 2048) return ok;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success || !hasServiceRole()) return ok;
    const d = parsed.data;
    if (/^\/(admin|api|dev|preview)/.test(d.p) || (/^\/member/.test(d.p) && d.e !== "lesson_complete" && d.e !== "login_success")) return ok;

    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "0.0.0.0").trim();
    const client = sha256(`${dailySalt()}:${ip}:${ua}`);
    if (limited(client)) return ok;
    const consent = req.cookies.get("sv_consent")?.value === "granted";
    // No consent: only an anonymous page-view count is recorded.
    if (!consent && d.e !== "page_view") return ok;

    let referrer: string | null = null;
    try {
      if (d.r) {
        const h = new URL(d.r).hostname.replace(/^www\./, "");
        if (h && h !== req.nextUrl.hostname.replace(/^www\./, "")) referrer = h;
      }
    } catch {}

    const anonymous = !consent;
    await getServiceClient().from("analytics_events").insert({
      session_hash: consent ? client : null,
      event_name: d.e,
      path: d.p.split("?")[0].slice(0, 300),
      referrer_domain: referrer,
      utm_source: d.us ?? null,
      utm_medium: d.um ?? null,
      utm_campaign: d.uc ?? null,
      // Without consent: page-view count only, no device/browser/country detail.
      device_type: anonymous ? null : device(ua, d.w),
      browser: anonymous ? null : browser(ua),
      country: anonymous ? null : req.headers.get("x-vercel-ip-country")?.slice(0, 2) ?? null,
      props: d.x ?? {},
    });
  } catch {
    /* never error to the client */
  }
  return ok;
}
