import { RevealHeading } from "@/components/ui/RevealHeading";
import { Container, Section, Eyebrow, ButtonLink, MediaFrame, type PaletteLayer } from "@/components/ui";
import { RevealImage, RevealText, DrawLine } from "@/lib/motion";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/cta";

/** 02 What Springvilla is. Editorial split + three connected nodes drawn on scroll. */
export function WhatIs({ content, layer, media }: { content: SectionContent<"home.what_is">; layer: PaletteLayer; media: Record<string, Media> }) {
  const image = content.image ? media[content.image] : null;
  const nodes = content.nodes.filter((n) => n.title);
  return (
    <Section layer={layer} id={content.anchor || undefined} aria-labelledby="what-is-heading">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <RevealImage parallax={8} from="bottom">
              <MediaFrame media={image} ratio="4/5" sizes="(min-width: 1024px) 45vw, 100vw" tone="cyprus" />
            </RevealImage>
            {image?.caption && <p className="mt-3 text-caption text-muted">{image.caption}</p>}
          </div>
          <div className="lg:col-span-6">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <RevealHeading id="what-is-heading" text={content.heading} highlight={content.highlight} size="l" className="mt-6" />
            {content.body && (
              <RevealText as="p" className="mt-8 max-w-[52ch] text-lead text-muted" delay={0.1}>
                {content.body}
              </RevealText>
            )}
            {hasCta(content.cta) && (
              <div className="mt-10">
                <ButtonLink href={content.cta.href} data-cta="what-is">
                  {content.cta.label}
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        {nodes.length > 0 && (
          <div className="mt-section-sm">
            {content.nodesHeading && <p className="sv-eyebrow text-muted">{content.nodesHeading}</p>}
            <DrawLine className="relative mt-8" start="top 80%" end="center 55%">
              {/* Connector: horizontal on desktop, vertical on mobile */}
              <svg aria-hidden className="absolute left-0 top-[1.375rem] hidden h-px w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 1">
                <line data-draw x1="0" y1="0.5" x2="100" y2="0.5" stroke="currentColor" strokeWidth="1" />
              </svg>
              <svg aria-hidden className="absolute left-[1.375rem] top-6 h-[calc(100%-3rem)] w-px md:hidden" preserveAspectRatio="none" viewBox="0 0 1 100">
                <line data-draw x1="0.5" y1="0" x2="0.5" y2="100" stroke="currentColor" strokeWidth="1" />
              </svg>
              <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
                {nodes.map((n, i) => (
                  <li key={i} className="relative flex gap-5 md:block">
                    <span className="relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-current bg-surface text-small font-semibold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="md:mt-6">
                      <h3 className="text-display-s font-semibold">{n.title}</h3>
                      {n.body && <p className="mt-2 max-w-[34ch] text-muted">{n.body}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </DrawLine>
          </div>
        )}
      </Container>
    </Section>
  );
}
