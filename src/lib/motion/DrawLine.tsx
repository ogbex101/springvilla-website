"use client";

import { useRef, type ReactNode } from "react";
import { useGsap } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Draws every SVG path/line marked [data-draw] inside it as the element scrolls
 * through the viewport (stroke-dashoffset). Fully drawn without JS.
 */
export function DrawLine({ children, className, start = "top 75%", end = "bottom 60%", scrub = true }: { children: ReactNode; className?: string; start?: string; end?: string; scrub?: boolean | number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(
    ({ gsap }) => {
      const root = ref.current;
      if (!root || prefersReducedMotion()) return;
      const paths = root.querySelectorAll<SVGGeometryElement>("[data-draw]");
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(paths, {
        strokeDashoffset: 0,
        ease: "none",
        stagger: 0.15,
        duration: scrub ? undefined : 1.4,
        scrollTrigger: { trigger: root, start, end, scrub: scrub === true ? 0.6 : scrub || undefined, once: !scrub },
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
