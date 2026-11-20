"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/client";
import { RouteChange } from "@/lib/motion/RouteChange";

const COOKIE = "sv_consent";
const readConsent = () => (typeof document === "undefined" ? null : document.cookie.match(/(?:^|; )sv_consent=(granted|denied)/)?.[1] ?? null);

/**
 * First-party tracking: page views, scroll depth, CTA and outbound clicks.
 * Without consent the server stores an anonymous count only (no session hash).
 */
export function Analytics({ enabled, bannerEnabled, bannerText }: { enabled: boolean; bannerEnabled: boolean; bannerText: string }) {
  const [showBanner, setShowBanner] = useState(false);
  const depths = useRef(new Set<number>());

  useEffect(() => {
    if (!enabled) return;
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (gpc && !readConsent()) document.cookie = `${COOKIE}=denied; path=/; max-age=31536000; samesite=lax`;
    const t = setTimeout(() => setShowBanner(bannerEnabled && !readConsent()), 0);
    const reopen = () => setShowBanner(true);
    window.addEventListener("sv:consent", reopen);

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("a,button");
      if (!el) return;
      const cta = el.closest<HTMLElement>("[data-cta]")?.dataset.cta;
      if (cta) track("cta_click", { id: cta });
      const a = el as HTMLAnchorElement;
      if (a.href && a.host && a.host !== location.host && /^https?:/.test(a.href)) track("outbound_click", { host: a.host });
    };
    let raf = 0;
    const onScroll = () => {
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        const h = document.documentElement.scrollHeight - innerHeight;
        const p = h > 0 ? (scrollY / h) * 100 : 100;
        for (const d of [25, 50, 75, 100]) if (p >= d - 0.5 && !depths.current.has(d)) {
          depths.current.add(d);
          track("scroll_depth", { depth: d });
        }
      });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("sv:consent", reopen);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled, bannerEnabled]);

  const onRoute = useCallback(() => {
    if (!enabled) return;
    depths.current.clear();
    track("page_view");
  }, [enabled]);

  const choose = (v: "granted" | "denied") => {
    document.cookie = `${COOKIE}=${v}; path=/; max-age=31536000; samesite=lax; secure`;
    setShowBanner(false);
  };

  return (
    <>
      <RouteChange onChange={onRoute} />
      {showBanner && (
        <div role="region" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl rounded-xl bg-canopy p-5 text-white shadow-nav md:inset-x-auto md:right-6 md:bottom-6">
          <p className="text-small text-white/90">{bannerText}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => choose("granted")} className="min-h-11 rounded-full bg-lime px-5 text-small font-semibold text-canopy">Accept analytics</button>
            <button onClick={() => choose("denied")} className="min-h-11 rounded-full border border-white/40 px-5 text-small font-semibold">Decline</button>
            <a href="/privacy" className="inline-flex min-h-11 items-center px-2 text-small underline underline-offset-4">Privacy</a>
          </div>
        </div>
      )}
    </>
  );
}

/** Footer link that reopens the consent banner. */
export function ConsentLink() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("sv:consent"))} className="sv-link-underline inline-flex min-h-10 items-center">
      Cookie preferences
    </button>
  );
}
