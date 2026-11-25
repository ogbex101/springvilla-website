"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadGsap } from "./gsap";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Site-wide entrance choreography for everything the bespoke motion components
 * don't already animate: body copy, lists, chips, buttons, cards, icons and
 * framed photos. Professional register: short travel, no bounce, expo/quart
 * easing, staggered in reading order. Dark brand sections move a little slower.
 *
 * Rules that keep it safe:
 *  - only elements that start BELOW the first viewport are hidden-then-revealed,
 *    so nothing visible at load ever flashes or delays LCP;
 *  - anything inside [data-reveal], [data-no-motion], forms, the header/footer
 *    or a pinned bespoke section is left alone;
 *  - reduced motion: nothing runs.
 */
const SKIP = "[data-reveal], [data-no-motion], form, header, footer, nav, [role=dialog], .sv-split-line, [data-stack]";

const GROUPS: { sel: string; kind: "text" | "card" | "action" | "chip" | "icon" }[] = [
  { sel: "article, [data-card]", kind: "card" },
  { sel: "p, li:not(article li), blockquote, dt, dd, h3, h4", kind: "text" },
  { sel: "a[data-cta], a[class*='rounded-full'], button[class*='rounded-full']", kind: "action" },
  { sel: "[data-chip]", kind: "chip" },
  { sel: "[data-icon]", kind: "icon" },
];

export function AutoMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let revert: (() => void) | undefined;

    // Wait a frame so the new route's DOM (and any bespoke components) are in place.
    const raf = requestAnimationFrame(() => {
      void loadGsap().then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        const main = document.getElementById("main");
        if (!main) return;
        const fold = window.innerHeight * 0.92;
        const seen = new Set<Element>();
        const ctx = gsap.context(() => {
          for (const { sel, kind } of GROUPS) {
            const els = Array.from(main.querySelectorAll<HTMLElement>(sel)).filter((el) => {
              if (seen.has(el) || el.closest(SKIP)) return false;
              // Cards own their children's motion; don't double-animate text inside a card.
              if (kind !== "card" && el.closest("article, [data-card]")) return false;
              if (el.getBoundingClientRect().top < fold) return false;
              if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return false;
              return true;
            });
            els.forEach((el) => seen.add(el));
            if (!els.length) continue;

            const dark = (el: Element) => /canopy|cyprus|signal/.test(el.closest<HTMLElement>("[data-layer]")?.dataset.layer ?? "");
            const from: Record<string, gsap.TweenVars> = {
              text: { opacity: 0, y: 26 },
              card: { opacity: 0, y: 54, scale: 0.975, clipPath: "inset(6% 0% 0% 0% round 24px)" },
              action: { opacity: 0, y: 14 },
              chip: { opacity: 0, y: 10, scale: 0.94 },
              icon: { opacity: 0, scale: 0.6, rotate: -12 },
            };
            gsap.set(els, from[kind]);
            ScrollTrigger.batch(els, {
              start: "top 88%",
              once: true,
              onEnter: (batch) => {
                const slow = dark(batch[0]);
                gsap.to(batch, {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotate: 0,
                  clipPath: kind === "card" ? "inset(0% 0% 0% 0% round 24px)" : undefined,
                  duration: (kind === "card" ? 1.1 : kind === "text" ? 0.95 : 0.7) * (slow ? 1.18 : 1),
                  ease: kind === "icon" ? "back.out(1.6)" : kind === "card" ? "expo.out" : "power4.out",
                  stagger: kind === "card" ? 0.11 : kind === "chip" ? 0.04 : 0.07,
                  overwrite: true,
                  clearProps: "clipPath,transform",
                });
              },
            });
          }

          // Failsafe: anything still hidden is shown once the end of the content is reached.
          const all = Array.from(seen);
          ScrollTrigger.create({
            trigger: main,
            start: "bottom bottom+=40",
            once: true,
            onEnter: () => gsap.to(all.filter((el) => Number(gsap.getProperty(el, "opacity")) < 1), { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.5, clearProps: "clipPath,transform" }),
          });

          // Gentle scroll-linked depth on large framed photos (not hero/LCP images).
          main.querySelectorAll<HTMLElement>("[data-reveal-inner]").forEach((inner) => {
            const frame = inner.parentElement;
            if (!frame || inner.closest("article, [data-card]")) return;
            if (frame.getBoundingClientRect().height < 260) return;
            if (frame.getBoundingClientRect().top < fold) return;
            const img = inner.querySelector("img");
            if (!img) return;
            gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 0.6 } });
          });
        }, main);
        ScrollTrigger.refresh();
        revert = () => ctx.revert();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      revert?.();
    };
  }, [pathname]);

  return null;
}
