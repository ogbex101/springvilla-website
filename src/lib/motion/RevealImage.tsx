"use client";

import { useRef, type ReactNode } from "react";
import { markReady, useGsap } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  from?: "bottom" | "top" | "left" | "right";
  /** Scrubbed parallax of the inner media in yPercent (e.g. 10 = -10 → 10). 0 disables. */
  parallax?: number;
  delay?: number;
  start?: string;
  /** Play immediately rather than on scroll. */
  immediate?: boolean;
};

const insets = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

/**
 * Clip-path reveal frame. The direct child marked [data-reveal-inner] (or the
 * first child) scales 1.25 → 1 while the frame opens.
 */
export function RevealImage({
  children,
  className,
  from = "bottom",
  parallax = 0,
  delay = 0,
  start = "top 85%",
  immediate = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGsap(
    ({ gsap }) => {
      const frame = ref.current;
      if (!frame || immediate) return;
      const inner = (frame.querySelector("[data-reveal-inner]") ?? frame.firstElementChild) as HTMLElement | null;
      if (prefersReducedMotion()) {
        markReady(frame);
        return;
      }
      const tl = gsap.timeline({
        delay,
        scrollTrigger: immediate ? undefined : { trigger: frame, start, once: true },
      });
      tl.fromTo(
        frame,
        { clipPath: insets[from] },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.out" },
      );
      // With parallax the media stays slightly oversized so its edges never show.
      const rest = parallax ? 1 + (Math.abs(parallax) * 2.2) / 100 : 1;
      if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: rest, duration: 1.4, ease: "expo.out" }, 0);
      markReady(frame);

      if (parallax && inner) {
        // GSAP composes yPercent with the scale tween on the same transform.
        gsap.fromTo(
          inner,
          { yPercent: -parallax },
          {
            yPercent: parallax,
            ease: "none",
            scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      }
    },
    { scope: ref },
  );

  // Above-the-fold images are never hidden (LCP): a CSS transform-only settle instead of a clip reveal.
  if (immediate) {
    return <div className={cn("sv-img-settle relative overflow-hidden", className)}>{children}</div>;
  }
  return (
    <div ref={ref} data-reveal="" className={cn("relative overflow-hidden", className)}>
      {children}
    </div>
  );
}
