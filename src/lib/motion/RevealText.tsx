"use client";

import { useRef, type ElementType, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { gsap, SplitText, useGSAP, markReady } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

type Mode = "lines" | "words" | "chars";

type Props<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  mode?: Mode;
  /** Play on mount instead of on scroll (used in the hero). */
  immediate?: boolean;
  delay?: number;
  stagger?: number;
  /** ScrollTrigger start, default "top 80%". */
  start?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "children" | "className">;

/**
 * Splits text into lines (or words/chars) inside overflow-hidden masks and
 * raises them into place. Server-rendered text stays readable without JS.
 */
export function RevealText<T extends ElementType = "div">({
  as,
  children,
  mode = "lines",
  immediate = false,
  delay = 0,
  stagger,
  start = "top 80%",
  className,
  ...rest
}: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        markReady(el);
        return;
      }
      const split = SplitText.create(el, {
        type: mode === "lines" ? "lines" : mode === "words" ? "words" : "chars,words",
        mask: mode,
        autoSplit: mode === "lines",
        aria: "auto",
        linesClass: "sv-split-line",
        onSplit(self) {
          const targets = mode === "lines" ? self.lines : mode === "words" ? self.words : self.chars;
          const tween = gsap.from(targets, {
            yPercent: 110,
            rotate: mode === "chars" ? 0 : 2,
            transformOrigin: "0% 100%",
            duration: mode === "chars" ? 0.8 : 1,
            ease: "power4.out",
            stagger: stagger ?? (mode === "chars" ? 0.025 : 0.08),
            delay,
            scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
          });
          markReady(el);
          return tween;
        },
      });
      return () => split.revert();
    },
    { scope: ref, dependencies: [mode, immediate, delay] },
  );

  return (
    <Tag ref={ref} data-reveal="" className={className} {...rest}>
      {children}
    </Tag>
  );
}
