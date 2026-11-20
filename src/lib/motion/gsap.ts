"use client";

import { useEffect, useRef, type DependencyList, type RefObject } from "react";
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { SplitText as SplitTextType } from "gsap/SplitText";

export type Gsap = { gsap: typeof GsapType; ScrollTrigger: typeof ScrollTriggerType; SplitText: typeof SplitTextType };

let loading: Promise<Gsap> | null = null;

/**
 * Loads GSAP + ScrollTrigger + SplitText on demand (after hydration), so the
 * animation library never competes with the first paint / LCP.
 */
export function loadGsap(): Promise<Gsap> {
  loading ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]).then(([g, st, sp]) => {
    const gsap = g.gsap;
    gsap.registerPlugin(st.ScrollTrigger, sp.SplitText);
    gsap.defaults({ ease: "power3.out", duration: 0.9 });
    return { gsap, ScrollTrigger: st.ScrollTrigger, SplitText: sp.SplitText };
  });
  return loading;
}

/** Marks a gated element as handled by the motion engine (see globals.css reveal gating). */
export function markReady(el: Element | null | undefined) {
  el?.setAttribute("data-reveal-ready", "");
}

/**
 * Equivalent of @gsap/react's useGSAP: runs the callback inside a gsap.context
 * scoped to `scope`, reverting every tween/ScrollTrigger on unmount or when
 * dependencies change. The callback may return its own cleanup.
 */
export function useGsap(cb: (g: Gsap) => void | (() => void), opts: { scope: RefObject<Element | null>; dependencies?: DependencyList }) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => {
    let cancelled = false;
    let ctx: { revert: () => void } | null = null;
    let cleanup: void | (() => void);
    void loadGsap().then((g) => {
      if (cancelled) return;
      ctx = g.gsap.context(() => {
        cleanup = cbRef.current(g);
      }, opts.scope.current ?? undefined);
    });
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, opts.dependencies ?? []);
}
