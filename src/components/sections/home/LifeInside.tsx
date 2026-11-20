import Image from "next/image";
import { Container, Section, Eyebrow, DisplayHeading, ButtonLink, Chip, type PaletteLayer } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/fields";
import { formatDate, cn } from "@/lib/utils";
import { MosaicMotion } from "./MosaicMotion";
import { DayStrip } from "./DayStrip";

// Asymmetric editorial grid: col/row spans per tile index (12-column desktop grid).
const SPANS = [
  "md:col-span-7 md:row-span-4",
  "md:col-span-5 md:row-span-2",
  "md:col-span-5 md:row-span-2",
  "md:col-span-4 md:row-span-3",
  "md:col-span-4 md:row-span-3",
  "md:col-span-4 md:row-span-3",
  "md:col-span-5 md:row-span-3",
  "md:col-span-7 md:row-span-3",
  "md:col-span-12 md:row-span-3",
];

/** 04 Life inside Springvilla: documentary mosaic of real photos with what-happened captions. */
export function LifeInside({ content, layer, media }: { content: SectionContent<"home.life_inside">; layer: PaletteLayer; media: Record<string, Media> }) {
  const tiles = content.tiles.map((id) => media[id]).filter((m): m is Media => Boolean(m && m.type === "image")).slice(0, 9);
  const chapters = content.dayChapters.filter((c) => c.title);
  return (
    <Section layer={layer} id={content.anchor || undefined} aria-labelledby="life-heading" spacing="none" className="py-section">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <RevealText as="div" className="mt-6">
              <DisplayHeading id="life-heading" text={content.heading} highlight={content.highlight} size="l" />
            </RevealText>
          </div>
          <div className="lg:col-span-5">
            {content.body && <p className="max-w-[46ch] text-lead text-muted">{content.body}</p>}
          </div>
        </div>

        {content.chips.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="What happens at Springvilla">
            {content.chips.map((c) => (
              <li key={c}>
                <Chip>{c}</Chip>
              </li>
            ))}
          </ul>
        )}

        {tiles.length > 0 && (
          <MosaicMotion className="mt-14 grid auto-rows-[9rem] grid-cols-2 gap-3 md:auto-rows-[7.5rem] md:grid-cols-12 md:gap-4 lg:auto-rows-[9rem]">
            {tiles.map((m, i) => (
              <figure key={m.id} data-tile className={cn("group relative row-span-2", i === 0 ? "col-span-2" : "col-span-1", SPANS[i])}>
                <div data-tile-frame className="absolute inset-0 overflow-hidden rounded-lg">
                  <div data-reveal-inner className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]">
                    <Image src={m.url} alt={m.alt} fill sizes={i === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 40vw, 50vw"} className="object-cover" placeholder={m.blurDataUrl ? "blur" : "empty"} blurDataURL={m.blurDataUrl ?? undefined} />
                  </div>
                  {m.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canopy/90 via-canopy/55 to-transparent p-3 pt-10 text-white md:p-4 md:pt-12">
                      <span className="line-clamp-2 text-caption font-medium md:text-small group-hover:line-clamp-none">{m.caption}</span>
                      {(m.location || m.dateTaken || m.credit) && (
                        <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[var(--ease-out-quart)] group-hover:grid-rows-[1fr]">
                          <span className="overflow-hidden text-caption text-white/80">
                            <span className="block pt-1">{[m.location, m.dateTaken ? formatDate(m.dateTaken) : null, m.credit ? `Photo: ${m.credit}` : null].filter(Boolean).join(" · ")}</span>
                          </span>
                        </span>
                      )}
                    </figcaption>
                  )}
                </div>
              </figure>
            ))}
          </MosaicMotion>
        )}

        {hasCta(content.cta) && (
          <div className="mt-12">
            <ButtonLink href={content.cta.href} data-cta="life-inside">
              {content.cta.label}
            </ButtonLink>
          </div>
        )}
      </Container>
      {chapters.length > 0 && <DayStrip heading={content.dayHeading} chapters={chapters} media={media} />}
    </Section>
  );
}
