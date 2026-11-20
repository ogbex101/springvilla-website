import { RevealHeading } from "@/components/ui/RevealHeading";
import Link from "next/link";
import { Container, Section, Eyebrow, ButtonLink, MediaFrame, type PaletteLayer } from "@/components/ui";
import { StaggerCards } from "@/lib/motion";
import { getJourneys } from "@/lib/content/collections";
import { Timeline } from "@/components/content/Timeline";
import type { SectionContent } from "@/lib/content/schemas";
import { hasCta } from "@/lib/content/cta";

/** 05 Real journeys: verified, consented journeys only. No carousel. Hides when empty unless editorial text is set. */
export async function RealJourneys({ content, layer }: { content: SectionContent<"home.journeys">; layer: PaletteLayer }) {
  const journeys = await getJourneys(content.limit, true);
  if (!journeys.length && !content.emptyText) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined} aria-labelledby="journeys-heading">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>{content.eyebrow}</Eyebrow>
              <RevealHeading id="journeys-heading" text={content.heading} highlight={content.highlight} size="m" className="mt-6" />
              {content.body && <p className="mt-6 max-w-[42ch] text-lead text-muted">{content.body}</p>}
              {journeys.length > 0 && hasCta(content.cta) && (
                <div className="mt-8">
                  <ButtonLink href={content.cta.href} variant="secondary" data-cta="journeys">
                    {content.cta.label}
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-7">
            {journeys.length === 0 ? (
              <p className="max-w-[52ch] border-l-2 border-current pl-6 font-serif text-display-s italic leading-snug">{content.emptyText}</p>
            ) : (
              <StaggerCards className="space-y-8">
                {journeys.map((j) => (
                  <article key={j.id} className="grid gap-6 rounded-xl bg-white/50 p-5 ring-1 ring-line md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:p-7">
                    <div>
                      <MediaFrame media={j.portrait} ratio="4/5" rounded="lg" sizes="(min-width: 1024px) 22vw, 100vw" tone="cyprus" />
                    </div>
                    <div className="flex flex-col">
                      <p className="sv-eyebrow text-muted">{[j.publicName ?? "Member", j.office?.name].filter(Boolean).join(" · ")}</p>
                      <h3 className="mt-2 text-display-s font-semibold">
                        <Link href={`/journeys/${j.slug}`} className="sv-link-underline">
                          {j.title}
                        </Link>
                      </h3>
                      {j.growthStatement && <p className="mt-3 text-lead">{j.growthStatement}</p>}
                      {j.summary && <p className="mt-2 text-muted">{j.summary}</p>}
                      <div className="mt-6">
                        <Timeline items={j.updates.slice(-4)} />
                      </div>
                    </div>
                  </article>
                ))}
              </StaggerCards>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
