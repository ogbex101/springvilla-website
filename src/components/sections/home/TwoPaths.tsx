"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow, DisplayHeading, ButtonLink, Chip, OutlineNumeral, MediaFrame, type PaletteLayer } from "@/components/ui";
import { gsap, SplitText, useGSAP, markReady } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import { RevealText, StaggerCards } from "@/lib/motion";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/fields";
import { cn } from "@/lib/utils";

type Content = SectionContent<"home.two_paths">;

/**
 * 03 Two paths, one environment. Desktop: a single pinned, scrubbed timeline
 * (~150vh) — cards slide in from either side, draw together, connector lines
 * meet in the middle and the bridge statement appears. Mobile / reduced motion:
 * no pin, cards stack and reveal in turn.
 */
export function TwoPaths({ content, layer, media }: { content: Content; layer: PaletteLayer; media: Record<string, Media> }) {
  const root = useRef<HTMLElement>(null);
  const cards = content.cards.slice(0, 2);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const gated = q("[data-gate]");
      if (prefersReducedMotion()) return gated.forEach(markReady);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const bridge = q("[data-bridge]")[0];
        const split = bridge ? SplitText.create(bridge, { type: "words" }) : null;
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: { trigger: q("[data-stage]")[0], start: "top top", end: "+=150%", pin: true, scrub: 0.6, anticipatePin: 1 },
        });
        tl.from(q("[data-card='0']"), { xPercent: -70, rotate: -3, opacity: 0, duration: 0.3 }, 0)
          .from(q("[data-card='1']"), { xPercent: 70, rotate: 3, opacity: 0, duration: 0.3 }, 0)
          .from(q("[data-card-media]"), { clipPath: "inset(100% 0% 0% 0%)", duration: 0.25 }, 0.08)
          .from(q("[data-numeral]"), { yPercent: 40, opacity: 0, duration: 0.2, stagger: 0.05 }, 0.12)
          .to(q("[data-card='0']"), { x: "2vw", duration: 0.25 }, 0.32)
          .to(q("[data-card='1']"), { x: "-2vw", duration: 0.25 }, 0.32)
          .from(q("[data-line]"), { scaleX: 0, duration: 0.2 }, 0.38)
          .from(q("[data-dot]"), { scale: 0, duration: 0.08, ease: "back.out(3)" }, 0.56);
        if (split) tl.from(split.words, { yPercent: 60, opacity: 0, duration: 0.2, stagger: 0.012 }, 0.6);
        tl.to({}, { duration: 0.12 }); // short hold before unpinning
        gated.forEach(markReady);
        return () => split?.revert();
      });
      mm.add("(max-width: 1023.98px)", () => {
        q("[data-card]").forEach((card) =>
          gsap.from(card, { y: 48, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 85%", once: true } }),
        );
        gsap.from(q("[data-bridge]"), { y: 24, opacity: 0, duration: 0.8, scrollTrigger: { trigger: q("[data-bridge]")[0], start: "top 90%", once: true } });
        gated.forEach(markReady);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const cardLayer = (l: string): string => (l === "canopy" && layer === "canopy" ? "lime" : l);

  return (
    <section ref={root} data-layer={layer} id={content.anchor || undefined} aria-labelledby="two-paths-heading" className="relative isolate pt-section [--section-accent:var(--accent)]">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <RevealText as="div" className="mt-6">
              <DisplayHeading id="two-paths-heading" text={content.heading} highlight={content.highlight} size="l" />
            </RevealText>
          </div>
          {content.intro && <p className="max-w-[46ch] text-lead text-muted lg:col-span-5">{content.intro}</p>}
        </div>
      </Container>

      <div data-stage className="relative lg:flex lg:min-h-[100svh] lg:items-center">
        <Container className="py-14 lg:py-10">
          <div data-gate data-reveal className="relative grid gap-6 lg:grid-cols-2 lg:gap-[8vw]">
            {cards.map((c, i) => (
              <article
                key={i}
                data-card={i}
                data-layer={cardLayer(c.layer)}
                className="group relative flex flex-col overflow-visible rounded-xl p-5 shadow-lift md:p-7"
              >
                {/* Connector line from the card's inner edge toward the centre */}
                <span
                  data-line
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 hidden h-px w-[4vw] bg-[var(--section-accent)] lg:block",
                    i === 0 ? "left-full origin-left" : "right-full origin-right",
                  )}
                />
                <div className="flex items-start justify-between gap-4">
                  <Chip>{c.label}</Chip>
                  <span data-numeral>
                    <OutlineNumeral value={i + 1} className="-mr-1 -mt-3 text-[clamp(4.5rem,2rem+6vw,8.5rem)] text-accent opacity-90" />
                  </span>
                </div>
                <div data-card-media className="mt-4 overflow-hidden rounded-lg">
                  <MediaFrame media={c.image ? media[c.image] : null} ratio="16/9" rounded="none" sizes="(min-width: 1024px) 42vw, 100vw" tone={c.layer === "signal" ? "signal" : "canopy"} />
                </div>
                <h3 className="mt-6 text-display-s font-semibold">{c.title}</h3>
                {c.body && <p className="mt-3 max-w-[48ch] text-muted">{c.body}</p>}
                {c.href && (
                  <Link href={c.href} className="mt-6 inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-4 hover:underline" data-cta={`path-${i + 1}`}>
                    Explore this path <ArrowRight className="size-4" aria-hidden />
                    <span className="sr-only">: {c.title}</span>
                  </Link>
                )}
              </article>
            ))}
            <span data-dot aria-hidden className="absolute left-1/2 top-1/2 hidden size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--section-accent)] shadow-[0_0_0_6px_rgb(228_253_151/0.18)] lg:block" />
          </div>
          {content.bridge && (
            <p data-bridge className="mx-auto mt-10 max-w-[30ch] text-center font-serif text-display-s italic leading-tight text-accent lg:mt-12">
              {content.bridge}
            </p>
          )}
        </Container>
      </div>

      <Container className="pb-section">
        {content.rows.length > 0 && (
          <div className="mt-10 lg:mt-0">
            {content.comparisonHeading && <h3 className="text-display-s font-semibold">{content.comparisonHeading}</h3>}
            <StaggerCards selector="tbody tr, thead tr" className="mt-6 overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-left">
                <caption className="sr-only">{content.comparisonHeading || "Comparison of the two paths"}</caption>
                <thead>
                  <tr className="bg-chip">
                    <th scope="col" className="p-4 sv-eyebrow md:px-6">{content.leftLabel}</th>
                    <th scope="col" className="border-l border-line p-4 sv-eyebrow md:px-6">{content.rightLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {content.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="p-4 text-lead font-medium md:px-6 md:py-5">{r.left}</td>
                      <td className="border-l border-line p-4 text-lead font-medium md:px-6 md:py-5">{r.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StaggerCards>
          </div>
        )}
        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {content.disclaimer && <p className="max-w-[60ch] text-small text-muted">{content.disclaimer}</p>}
          {hasCta(content.cta) && (
            <ButtonLink href={content.cta.href} data-cta="two-paths" className="shrink-0">
              {content.cta.label}
            </ButtonLink>
          )}
        </div>
      </Container>
    </section>
  );
}
