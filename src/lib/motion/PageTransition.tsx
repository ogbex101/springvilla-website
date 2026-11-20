"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RouteChange } from "./RouteChange";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Fresh Canopy curtain wipe between public routes (~600ms total).
 * Never runs on the initial load, so it cannot delay first paint.
 * Uses the Web Animations API (no animation library in the public bundle).
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
      el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 320, easing: "cubic-bezier(0.65,0,0.35,1)", fill: "forwards" }).finished.then(() => {
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
    el.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 340, delay: 50, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" });
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
