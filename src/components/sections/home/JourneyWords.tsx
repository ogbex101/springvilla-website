"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, markReady } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import type { SectionContent } from "@/lib/content/schemas";

/**
 * Full-screen Fresh Canopy moment. Words swap one at a time with a split-letter
 * reveal while abstract line strands extend and converge behind them (~200vh pin).
 * Without JS or with reduced motion, all words are listed statically.
 */
const STRANDS = [
  "M -40 520 C 180 470, 300 360, 500 330 S 760 300, 1040 120",
  "M -40 120 C 200 160, 330 260, 500 310 S 820 420, 1040 560",
  "M 120 640 C 220 520, 360 420, 500 330 S 680 210, 900 -40",
  "M 900 640 C 780 520, 640 410, 500 330 S 260 190, 80 -40",
  "M -40 330 C 160 330, 330 320, 500 330 S 840 340, 1040 330",
];

export function JourneyWords({ content }: { content: SectionContent<"home.journey_words"> }) {
  const root = useRef<HTMLElement>(null);
  const words = content.words.filter(Boolean);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const stack = q("[data-stack]")[0];
      if (prefersReducedMotion() || words.length < 2) {
        if (stack) markReady(stack);
        return;
      }
      el.classList.add("is-animated");
      const items = q("[data-word]");
      const splits = items.map((w) => SplitText.create(w, { type: "chars", mask: "chars" }));
      const paths = q("[data-strand]") as unknown as SVGPathElement[];
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });

      gsap.set(q("[data-node]"), { scale: 0, transformOrigin: "50% 50%" });
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: el, start: "top top", end: `+=${Math.min(200, 40 * words.length)}%`, pin: true, scrub: 0.5, anticipatePin: 1 },
      });
      splits.forEach((s, i) => {
        gsap.set(s.chars, { yPercent: i === 0 ? 0 : 110 });
        if (i > 0) tl.to(s.chars, { yPercent: 0, duration: 0.6, stagger: 0.03 }, i - 0.4);
        if (i < splits.length - 1) tl.to(s.chars, { yPercent: -110, duration: 0.5, stagger: 0.02, ease: "power2.in" }, i + 0.15);
      });
      tl.to(paths, { strokeDashoffset: 0, ease: "none", duration: words.length - 0.5, stagger: 0.1 }, 0);
      tl.to(q("[data-node]"), { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, words.length - 1);
      markReady(stack);
      return () => {
        splits.forEach((s) => s.revert());
        el.classList.remove("is-animated");
      };
    },
    { scope: root },
  );

  if (!words.length) return null;

  return (
    <section ref={root} data-layer="canopy" aria-label="The Springvilla journey" className="group/jw relative isolate flex min-h-[100svh] items-center overflow-hidden">
      <svg aria-hidden viewBox="0 0 1000 660" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 h-full w-full text-lime/40" fill="none">
        {STRANDS.map((d, i) => (
          <path key={i} data-strand d={d} stroke="currentColor" strokeWidth={i === 4 ? 1.4 : 1} strokeLinecap="round" />
        ))}
        <circle data-node cx="500" cy="330" r="7" className="fill-lime opacity-0 motion-reduce:opacity-100" />
      </svg>

      <div className="mx-auto w-full max-w-[1440px] px-gutter py-section-sm text-center">
        <p className="sr-only">{words.join(" ")}</p>
        {/* Static list (no JS / reduced motion); stacked single cell when animated. */}
        <ul
          data-stack
          data-reveal
          aria-hidden
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-display-l font-semibold text-white group-[.is-animated]/jw:grid group-[.is-animated]/jw:text-[clamp(3.5rem,1rem+11vw,13rem)] group-[.is-animated]/jw:leading-[0.9] group-[.is-animated]/jw:tracking-[-0.04em]"
        >
          {words.map((w, i) => (
            <li key={i} data-word className="group-[.is-animated]/jw:[grid-area:1/1] even:font-serif even:font-normal even:italic even:text-lime">
              {w}
            </li>
          ))}
        </ul>
        {content.caption && <p className="mx-auto mt-10 max-w-[44ch] text-lead text-white/80">{content.caption}</p>}
      </div>
    </section>
  );
}
