import Image from "next/image";
import { Container, Eyebrow, ButtonLink, MediaFrame, BrandField, type PaletteLayer } from "@/components/ui";
import { renderHighlighted } from "@/components/ui/DisplayHeading";
import { RevealImage, RevealText } from "@/lib/motion";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/cta";
import { HeroLoop } from "./HeroLoop";

/** Inner-page hero. The H1 lives here. Variants: full-bleed image, split, typographic. */
export function PageHero({ content, layer, media }: { content: SectionContent<"page_hero">; layer: PaletteLayer; media: Record<string, Media> }) {
  const image = content.media ? media[content.media] : null;
  const video = content.video ? media[content.video] : null;
  const ctas = (
    <div className="mt-10 flex flex-wrap gap-3">
      {hasCta(content.primaryCta) && <ButtonLink href={content.primaryCta.href} data-cta="page-hero-primary">{content.primaryCta.label}</ButtonLink>}
      {hasCta(content.secondaryCta) && <ButtonLink href={content.secondaryCta.href} variant="secondary" data-cta="page-hero-secondary">{content.secondaryCta.label}</ButtonLink>}
    </div>
  );
  const title = (
    <RevealText as="h1" immediate className="max-w-[16ch] text-display-xl font-semibold">
      {renderHighlighted(content.heading || " ", content.highlight)}
    </RevealText>
  );

  if (content.variant === "image") {
    const dark = layer === "canopy" || layer === "cyprus" || layer === "signal";
    return (
      <section data-layer={dark ? layer : "canopy"} className="relative isolate flex min-h-[88svh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {image ? <Image src={image.url} alt={image.alt} fill priority sizes="100vw" className="object-cover" placeholder={image.blurDataUrl ? "blur" : "empty"} blurDataURL={image.blurDataUrl ?? undefined} /> : <BrandField tone={layer === "cyprus" ? "cyprus" : layer === "signal" ? "signal" : "canopy"} />}
        </div>
        {video && <HeroLoop video={video} poster={image} />}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-[4] bg-[linear-gradient(20deg,rgb(45_62_44/0.92)_0%,rgb(45_62_44/0.55)_45%,rgb(45_62_44/0.15)_100%)]" />
        <div aria-hidden className="sv-grain pointer-events-none absolute inset-0 -z-[3] overflow-hidden" />
        <Container className="pointer-events-none pb-16 pt-40 md:pb-24 [&>*]:pointer-events-auto">
          <Eyebrow className="text-lime">{content.eyebrow}</Eyebrow>
          <div className="mt-6 text-white">{title}</div>
          {content.body && <p className="mt-7 max-w-[48ch] text-lead text-white/88">{content.body}</p>}
          {ctas}
        </Container>
      </section>
    );
  }

  if (content.variant === "split") {
    return (
      <section data-layer={layer} className="relative pb-section-sm pt-36 md:pt-44">
        <Container className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <div className="mt-6">{title}</div>
            {content.body && <p className="mt-7 max-w-[48ch] text-lead text-muted">{content.body}</p>}
            {ctas}
          </div>
          <div className="lg:col-span-5">
            <RevealImage immediate delay={0.2} from="right">
              <MediaFrame media={image} ratio="4/5" priority sizes="(min-width: 1024px) 38vw, 100vw" tone={layer === "signal" ? "signal" : "canopy"} />
            </RevealImage>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section data-layer={layer} className="relative overflow-hidden pb-section-sm pt-40 md:pt-52">
      <Container>
        <Eyebrow>{content.eyebrow}</Eyebrow>
        <div className="mt-6">{title}</div>
        {content.body && <p className="mt-8 max-w-[52ch] text-lead text-muted">{content.body}</p>}
        {ctas}
      </Container>
    </section>
  );
}
