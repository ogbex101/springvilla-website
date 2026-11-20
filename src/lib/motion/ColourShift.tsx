"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Wrap a run of <Section>s. As each child section with data-layer reaches the
 * middle of the viewport, the wrapper background tweens to that layer's colour
 * and the sections go transparent, so palette changes morph instead of cut.
 * Without JS (or with reduced motion) each section keeps its own hard background.
 */
export function ColourShift({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = ref.current;
      if (!root || prefersReducedMotion()) return;
      const sections = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-layer]"));
      if (sections.length < 2) return;
      const colours = sections.map((s) => getComputedStyle(s).backgroundColor);
      root.style.backgroundColor = colours[0];
      sections.forEach((s) => (s.style.backgroundColor = "transparent"));
      const to = (c: string) => gsap.to(root, { backgroundColor: c, duration: 0.8, ease: "power2.out", overwrite: true });
      const triggers = sections.map((s, i) =>
        ScrollTrigger.create({
          trigger: s,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) to(colours[i]);
          },
          onLeaveBack: i === 0 ? () => to(colours[0]) : undefined,
          onLeave: i === sections.length - 1 ? () => to(colours[i]) : undefined,
        }),
      );
      return () => {
        triggers.forEach((t) => t.kill());
        sections.forEach((s) => (s.style.backgroundColor = ""));
        root.style.backgroundColor = "";
      };
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
