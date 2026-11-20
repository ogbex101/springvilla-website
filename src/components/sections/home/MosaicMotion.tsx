"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, markReady } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";

const SPEEDS = [-6, 5, -9, 7, -4, 8, -7, 4, -5];
const FROM = ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 100%)", "inset(0% 100% 0% 0%)", "inset(0% 0% 100% 0%)"];

/** Each tile opens with a clip reveal at a different delay and drifts at its own parallax speed. */
export function MosaicMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) return markReady(el);
      const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", el);
      tiles.forEach((tile, i) => {
        const frame = tile.querySelector<HTMLElement>("[data-tile-frame]");
        const inner = tile.querySelector<HTMLElement>("[data-reveal-inner]");
        if (!frame) return;
        const tl = gsap.timeline({ scrollTrigger: { trigger: tile, start: "top 88%", once: true }, delay: (i % 3) * 0.08 });
        tl.fromTo(frame, { clipPath: FROM[i % FROM.length] }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.out" });
        if (inner) tl.fromTo(inner, { scale: 1.3 }, { scale: 1.12, duration: 1.4, ease: "expo.out" }, 0);
        if (inner && window.matchMedia("(min-width: 768px)").matches) {
          gsap.fromTo(inner, { yPercent: -SPEEDS[i % SPEEDS.length] / 2 }, { yPercent: SPEEDS[i % SPEEDS.length] / 2, ease: "none", scrollTrigger: { trigger: tile, start: "top bottom", end: "bottom top", scrub: true } });
        }
      });
      markReady(el);
    },
    { scope: ref },
  );
  return (
    <div ref={ref} data-reveal className={className}>
      {children}
    </div>
  );
}
