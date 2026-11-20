"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RouteChange } from "./RouteChange";
import { animate } from "motion";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Fresh Canopy curtain wipe between public routes (~600ms total).
 * Never runs on the initial load, so it cannot delay first paint.
 * Motion owns the curtain element exclusively.
 */
export function PageTransition() {
  const curtain = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pending = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page / hash links
      if (/^\/(admin|member|api|login)/.test(url.pathname)) return;
      if (prefersReducedMotion() || !curtain.current) return;
      e.preventDefault();
      pending.current = true;
      const el = curtain.current;
      el.style.transformOrigin = "50% 100%";
      animate(el, { scaleY: [0, 1] }, { duration: 0.32, ease: [0.65, 0, 0.35, 1] }).then(() => {
        router.push(url.pathname + url.search + url.hash);
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  const onRoute = useCallback(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!pending.current || !curtain.current) return;
    pending.current = false;
    const el = curtain.current;
    el.style.transformOrigin = "50% 0%";
    animate(el, { scaleY: [1, 0] }, { duration: 0.34, ease: [0.16, 1, 0.3, 1], delay: 0.05 });
  }, []);

  return (
    <>
    <RouteChange onChange={onRoute} />
    <div
      ref={curtain}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] bg-canopy"
      style={{ transform: "scaleY(0)" }}
    />
    </>
  );
}
