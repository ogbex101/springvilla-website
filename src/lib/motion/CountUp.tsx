"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Counts up to a REAL number from the database. Never pass invented figures.
 * Renders the final value on the server so it is correct without JS.
 */
export function CountUp({ value, duration = 1.6, className, format }: { value: number; duration?: number; className?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString("en-GB"));
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = fmt(obj.n);
        },
      });
    },
    { scope: ref, dependencies: [value] },
  );
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {fmt(value)}
    </span>
  );
}
