"use client";

import { useRef } from "react";
import { MediaFrame } from "@/components/ui";
import { useGsap } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import type { Media } from "@/lib/content/media-types";

type Chapter = { title: string; body: string; image: string | null };

/** Optional "A day at Springvilla": pinned horizontal chapter strip on desktop; a swipeable row on touch. */
export function DayStrip({ heading, chapters, media, kind, date }: { heading: string; chapters: Chapter[]; media: Record<string, Media>; kind: "illustrative" | "documented"; date?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGsap(
    ({ gsap }) => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const track = el.querySelector<HTMLElement>("[data-track]");
        if (!track) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative overflow-hidden py-16 lg:flex lg:min-h-[100svh] lg:flex-col lg:justify-center">
      <h3 className="px-gutter text-display-m font-semibold">{heading}</h3>
      <p className="mt-3 px-gutter text-small text-muted">
        {kind === "documented" && date ? `Photographed on ${date}.` : "An illustrative routine, not a fixed daily schedule."}
      </p>
      <ol data-track className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-gutter pb-4 lg:w-max lg:overflow-visible lg:pb-0" aria-label={heading}>
        {chapters.map((c, i) => (
          <li key={i} className="w-[80vw] shrink-0 snap-start sm:w-[55vw] lg:w-[34vw]">
            <MediaFrame media={c.image ? media[c.image] : null} ratio="4/3" sizes="(min-width: 1024px) 34vw, 80vw" />
            <p className="mt-5 sv-eyebrow text-muted">{String(i + 1).padStart(2, "0")}</p>
            <h4 className="mt-2 text-display-s font-semibold">{c.title}</h4>
            {c.body && <p className="mt-2 max-w-[42ch] text-muted">{c.body}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
