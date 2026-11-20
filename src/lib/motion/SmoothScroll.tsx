"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type Lenis from "lenis";
import { RouteChange } from "./RouteChange";
import { loadGsap } from "./gsap";
import { useReducedMotion } from "./useReducedMotion";

type ScrollApi = {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, opts?: { offset?: number }) => void;
  stop: () => void;
  start: () => void;
};

const ScrollContext = createContext<ScrollApi>({
  lenis: null,
  scrollTo: (target) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (typeof el === "number") window.scrollTo({ top: el, behavior: "smooth" });
    else (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth" });
  },
  stop: () => {},
  start: () => {},
});

export const useSmoothScroll = () => useContext(ScrollContext);

/**
 * Lenis smooth scroll synced to GSAP's ticker so ScrollTrigger reads the same
 * scroll position. Off for reduced motion. Only mounted by public layouts.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const disabled = reduced;
  const lenisRef = useRef<Lenis | null>(null);
  const fallback = useContext(ScrollContext);
  const api = useMemo<ScrollApi>(
    () => ({
      get lenis() {
        return lenisRef.current;
      },
      scrollTo: (target, opts) => {
        const l = lenisRef.current;
        if (l) l.scrollTo(target as never, { offset: opts?.offset ?? 0, duration: 1.2 });
        else fallback.scrollTo(target, opts);
      },
      stop: () => lenisRef.current?.stop(),
      start: () => lenisRef.current?.start(),
    }),
    [fallback],
  );

  useEffect(() => {
    document.documentElement.classList.add("motion-ok");
    if (disabled) return;

    // Lenis + GSAP load after hydration so they never delay first paint.
    let cancelled = false;
    let teardown = () => {};
    void Promise.all([import("lenis"), loadGsap()]).then(([{ default: LenisCtor }, { gsap, ScrollTrigger }]) => {
      if (cancelled) return;
      const lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true, syncTouch: false });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      teardown = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef.current = null;
      };
    });
    return () => {
      cancelled = true;
      teardown();
    };
  }, [disabled]);

  // Reset scroll on route change and recalculate triggers once the new page has laid out.
  const first = useRef(true);
  const onRoute = useCallback(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!window.location.hash) lenisRef.current?.scrollTo(0, { immediate: true });
    window.setTimeout(() => void loadGsap().then(({ ScrollTrigger }) => ScrollTrigger.refresh()), 120);
  }, []);

  return (
    <ScrollContext.Provider value={api}>
      {children}
      <RouteChange onChange={onRoute} />
    </ScrollContext.Provider>
  );
}
