"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, markReady } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Selector for the items, default: direct children. */
  selector?: string;
  stagger?: number;
  start?: string;
};

/**
 * Children fade up 40px with a slight scale from 0.96. Hover treatment lives in
 * CSS on the card itself (see .sv-card in components/ui/Card).
 */
export function StaggerCards({ as: Tag = "div", children, className, selector, stagger = 0.1, start = "top 82%" }: Props) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) return markReady(el);
      const items = selector ? el.querySelectorAll(selector) : el.children;
      gsap.from(items, {
        y: 40,
        scale: 0.96,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start, once: true },
      });
      markReady(el);
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {children}
    </Tag>
  );
}
