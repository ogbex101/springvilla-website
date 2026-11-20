import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Section, ButtonLink, MediaFrame, Chip, OutlineNumeral, type PaletteLayer } from "@/components/ui";
import { RevealImage, RevealText, StaggerCards, DrawLine } from "@/lib/motion";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/fields";
import { SafeHtml } from "@/components/site/SafeHtml";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

type Base = { layer: PaletteLayer; media: Record<string, Media> };

/* ------------------------------------------------------------------ rich text */
export function RichTextSection({ content, layer }: Base & { content: SectionContent<"rich_text"> }) {
  if (!content.html && !content.heading) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container size="narrow">
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} />
        {content.html && <SafeHtml className="sv-prose mt-10" html={content.html} />}
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ split feature */
export function SplitFeatureSection({ content, layer, media }: Base & { content: SectionContent<"split_feature"> }) {
  if (!content.heading && !content.body) return null;
  const image = content.image ? media[content.image] : null;
  const left = content.imageSide === "left";
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className={cn("lg:col-span-6", left && "lg:order-2")}>
          <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} size="m" />
          {content.body && <p className="mt-6 max-w-[52ch] whitespace-pre-line text-lead text-muted">{content.body}</p>}
          {content.bullets.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {content.bullets.map((b) => (
                <li key={b}>
                  <Chip>{b}</Chip>
                </li>
              ))}
            </ul>
          )}
          {hasCta(content.cta) && (
            <div className="mt-10">
              <ButtonLink href={content.cta.href}>{content.cta.label}</ButtonLink>
            </div>
          )}
        </div>
        <div className={cn("lg:col-span-6", left && "lg:order-1")}>
          <RevealImage parallax={6} from={left ? "left" : "right"}>
            <MediaFrame media={image} ratio="4/5" sizes="(min-width: 1024px) 45vw, 100vw" tone={layer === "signal" ? "signal" : layer === "cyprus" || layer === "sand" ? "cyprus" : "canopy"} />
          </RevealImage>
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ steps: numbered / pipeline / timeline */
export function StepsSection({ content, layer }: Base & { content: SectionContent<"steps"> }) {
  const items = content.items.filter((i) => i.title);
  if (!items.length) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        {content.style === "pipeline" ? (
          <DrawLine className="relative mt-16" start="top 75%" end="bottom 65%">
            <svg aria-hidden className="absolute left-[1.375rem] top-3 h-[calc(100%-1.5rem)] w-px lg:hidden" preserveAspectRatio="none" viewBox="0 0 1 100">
              <line data-draw x1="0.5" y1="0" x2="0.5" y2="100" stroke="currentColor" strokeOpacity="0.6" />
            </svg>
            <svg aria-hidden className="absolute left-0 top-[1.375rem] hidden h-px w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 1">
              <line data-draw x1="0" y1="0.5" x2="100" y2="0.5" stroke="currentColor" strokeOpacity="0.6" />
            </svg>
            <ol className="relative grid gap-10 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] lg:gap-6" style={{ ["--cols" as string]: items.length }}>
              {items.map((s, i) => (
                <li key={i} className="relative flex gap-5 lg:block">
                  <span className="relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-small font-semibold text-accent-fg">{i + 1}</span>
                  <div className="lg:mt-6 lg:pr-4">
                    <h3 className="text-[1.3rem] font-semibold leading-snug">{s.title}</h3>
                    {s.body && <p className="mt-2 text-muted">{s.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </DrawLine>
        ) : content.style === "timeline" ? (
          <DrawLine className="relative mx-auto mt-16 max-w-3xl" start="top 75%" end="bottom 60%">
            <svg aria-hidden className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px" preserveAspectRatio="none" viewBox="0 0 1 100">
              <line data-draw x1="0.5" y1="0" x2="0.5" y2="100" stroke="currentColor" strokeOpacity="0.6" />
            </svg>
            <StaggerCards as="ol" className="space-y-10">
              {items.map((s, i) => (
                <li key={i} className="relative pl-12">
                  <span aria-hidden className="absolute left-0 top-1 size-[23px] rounded-full border-2 border-current bg-surface" />
                  <h3 className="text-display-s font-semibold">{s.title}</h3>
                  {s.body && <p className="mt-2 max-w-[52ch] text-lead text-muted">{s.body}</p>}
                </li>
              ))}
            </StaggerCards>
          </DrawLine>
        ) : (
          <StaggerCards as="ol" className={cn("mt-14 grid gap-5 sm:grid-cols-2", items.length >= 5 ? "lg:grid-cols-5" : items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {items.map((s, i) => (
              <li key={i} className="flex flex-col rounded-xl border border-line p-6">
                <span className="font-serif text-display-s italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-[1.3rem] font-semibold leading-snug">{s.title}</h3>
                {s.body && <p className="mt-2 text-muted">{s.body}</p>}
              </li>
            ))}
          </StaggerCards>
        )}
        {hasCta(content.cta) && (
          <div className="mt-12">
            <ButtonLink href={content.cta.href}>{content.cta.label}</ButtonLink>
          </div>
        )}
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ relationship graphic (FHG → Springvilla → 2-in-1) */
export function RelationshipSection({ content, layer }: Base & { content: SectionContent<"relationship"> }) {
  const nodes = content.nodes.filter((n) => n.title);
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        {nodes.length > 0 && (
          <DrawLine className="relative mt-16" start="top 80%" end="center 50%">
            <ol className="relative grid gap-6 md:grid-flow-col md:auto-cols-fr" aria-label="How the organisations relate">
              {nodes.map((n, i) => (
                <li key={i} className="relative">
                  <div className={cn("relative flex aspect-square max-h-72 w-full flex-col items-center justify-center rounded-full border border-current p-6 text-center md:max-h-none", i === nodes.length - 1 && "bg-accent text-accent-fg border-transparent")}>
                    <span className="text-display-s font-semibold">{n.title}</span>
                    {n.caption && <span className={cn("mt-2 max-w-[18ch] text-small", i === nodes.length - 1 ? "opacity-90" : "text-muted")}>{n.caption}</span>}
                  </div>
                  {i < nodes.length - 1 && (
                    <svg aria-hidden viewBox="0 0 100 20" className="mx-auto my-2 h-10 w-6 rotate-90 md:absolute md:-right-6 md:top-1/2 md:my-0 md:h-5 md:w-12 md:-translate-y-1/2 md:rotate-0" fill="none">
                      <path data-draw d="M0 10 H 90 M 80 2 L 92 10 L 80 18" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  )}
                </li>
              ))}
            </ol>
          </DrawLine>
        )}
        {content.note && <p className="mt-10 max-w-[60ch] text-muted">{content.note}</p>}
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ pathways (no pin) */
export function PathwaysSection({ content, layer, media }: Base & { content: SectionContent<"pathways"> }) {
  const cards = content.cards.filter((c) => c.title);
  if (!cards.length) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        <StaggerCards className="mt-14 grid gap-6 md:grid-cols-2">
          {cards.map((c, i) => (
            <article key={i} data-layer={c.layer === "canopy" && layer === "canopy" ? "lime" : c.layer} className="group relative flex flex-col rounded-xl p-6 md:p-8">
              <div className="flex items-start justify-between">
                <Chip>{c.label}</Chip>
                <OutlineNumeral value={i + 1} className="-mt-3 text-[clamp(4rem,2rem+5vw,7rem)] text-accent" />
              </div>
              <div className="mt-4 overflow-hidden rounded-lg">
                <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]">
                  <MediaFrame media={c.image ? media[c.image] : null} ratio="16/9" rounded="none" tone={c.layer === "signal" ? "signal" : "canopy"} />
                </div>
              </div>
              <h3 className="mt-6 text-display-s font-semibold">{c.title}</h3>
              {c.body && <p className="mt-3 text-muted">{c.body}</p>}
              {c.href && (
                <Link href={c.href} className="mt-6 inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline">
                  Explore this path <ArrowRight className="size-4" aria-hidden />
                  <span className="sr-only">: {c.title}</span>
                </Link>
              )}
            </article>
          ))}
        </StaggerCards>
        {content.disclaimer && <p className="mt-8 max-w-[60ch] text-small text-muted">{content.disclaimer}</p>}
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ Reality & Responsibility */
export function RealitySection({ content, layer }: Base & { content: SectionContent<"reality"> }) {
  if (!content.heading && !content.body) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} />
        </div>
        <div className="lg:col-span-7">
          {content.body && <p className="font-serif text-display-s italic leading-snug">{content.body}</p>}
          {content.points.length > 0 && (
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {content.points.map((p) => (
                <li key={p} className="flex gap-4 py-5 text-lead">
                  <span aria-hidden className="mt-3 h-px w-6 shrink-0 bg-current" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ leadership (verified only) */
export function LeadershipSection({ content, layer, media }: Base & { content: SectionContent<"leadership"> }) {
  const people = content.people.filter((p) => p.verified && p.name);
  if (!people.length) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        <StaggerCards className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((p) => (
            <figure key={p.name}>
              <MediaFrame media={p.photo ? media[p.photo] : null} ratio="4/5" sizes="(min-width: 1024px) 22vw, 50vw" />
              <figcaption className="mt-4">
                <span className="block text-[1.2rem] font-semibold">{p.name}</span>
                <span className="block text-muted">{p.role}</span>
                {p.bio && <span className="mt-2 block text-small text-muted">{p.bio}</span>}
              </figcaption>
            </figure>
          ))}
        </StaggerCards>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ card grid */
export function CardGridSection({ content, layer, media }: Base & { content: SectionContent<"card_grid"> }) {
  const cards = content.cards.filter((c) => c.title);
  if (!cards.length) return null;
  const anyImage = cards.some((c) => c.image && media[c.image]);
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        <StaggerCards className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <article key={i} className="group relative flex flex-col overflow-hidden rounded-xl border border-line">
              {anyImage && (
                <div className="overflow-hidden">
                  <div className="transition-transform duration-700 group-hover:scale-[1.06]">
                    <MediaFrame media={c.image ? media[c.image] : null} ratio="3/2" rounded="none" />
                  </div>
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                {!anyImage && <span className="font-serif text-display-s italic text-accent">{String(i + 1).padStart(2, "0")}</span>}
                <h3 className={cn("text-[1.3rem] font-semibold", !anyImage && "mt-6")}>
                  {c.href ? (
                    <Link href={c.href} className="after:absolute after:inset-0">
                      {c.title}
                    </Link>
                  ) : (
                    c.title
                  )}
                </h3>
                {c.body && <p className="mt-2 text-muted">{c.body}</p>}
              </div>
            </article>
          ))}
        </StaggerCards>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ CTA band */
export function CtaBandSection({ content, layer }: Base & { content: SectionContent<"cta_band"> }) {
  if (!content.heading) return null;
  return (
    <Section layer={layer} spacing="sm">
      <Container className="flex flex-col gap-10 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} size="m" />
          {content.body && <p className="mt-5 max-w-[48ch] text-lead text-muted">{content.body}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {hasCta(content.primaryCta) && <ButtonLink href={content.primaryCta.href} data-cta="cta-band-primary">{content.primaryCta.label}</ButtonLink>}
          {hasCta(content.secondaryCta) && <ButtonLink href={content.secondaryCta.href} variant="secondary" data-cta="cta-band-secondary">{content.secondaryCta.label}</ButtonLink>}
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ legal */
export function LegalSection({ content, layer }: Base & { content: SectionContent<"legal"> }) {
  return (
    <Section layer={layer} className="pt-40 md:pt-48">
      <Container size="narrow">
        <RevealText as="h1" immediate className="text-display-l font-semibold">
          {content.heading}
        </RevealText>
        {content.pendingReview && (
          <p role="note" className="mt-8 rounded-lg border border-line bg-chip p-4 text-small">
            <strong>Pending legal review.</strong> This text is a draft and will be replaced once it has been reviewed.
          </p>
        )}
        {content.lastUpdated && <p className="mt-6 text-small text-muted">Last updated {content.lastUpdated}</p>}
        <SafeHtml className="sv-prose mt-10" html={content.html} />
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ listing intro (H1 for listing pages) */
export function ListingIntro({ content, layer }: { content: SectionContent<"listing_intro">; layer: PaletteLayer }) {
  return (
    <Section layer={layer} className="pb-section-sm pt-40 md:pt-52" spacing="none">
      <Container>
        <SectionHeader as="h1" size="xl" eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.body} />
      </Container>
    </Section>
  );
}
