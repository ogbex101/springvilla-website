"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "./gsap";
import { useFinePointer, useReducedMotion } from "./useReducedMotion";

/** Wraps a button/link; pulls it toward the pointer on desktop fine pointers only. */
export function MagneticButton({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !fine || reduced) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { dependencies: [fine, reduced], scope: ref },
  );

  return (
    <span ref={ref} className={className ?? "inline-block"}>
      {children}
    </span>
  );
}
