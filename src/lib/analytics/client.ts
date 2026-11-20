"use client";

/**
 * Tiny first-party tracker. Posts to /api/track with sendBeacon.
 * Consent is read from the `sv_consent` cookie: without "granted" the server
 * records an anonymous, cookieless count only (no session hash).
 */
export type TrackEvent =
  | "page_view"
  | "cta_click"
  | "hero_video_play"
  | "hero_video_pause"
  | "scroll_depth"
  | "outbound_click"
  | "office_view"
  | "office_search"
  | "join_started"
  | "join_submitted"
  | "contact_submitted"
  | "article_read"
  | "event_view"
  | "login_success";

export function track(event: TrackEvent, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __svNoTrack?: boolean }).__svNoTrack) return;
  const u = new URL(window.location.href);
  const body = JSON.stringify({
    e: event,
    p: u.pathname,
    r: document.referrer || undefined,
    us: u.searchParams.get("utm_source") || undefined,
    um: u.searchParams.get("utm_medium") || undefined,
    uc: u.searchParams.get("utm_campaign") || undefined,
    w: window.innerWidth,
    x: props,
  });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* never break the page for analytics */
  }
}
