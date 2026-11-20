import { RevealHeading } from "@/components/ui/RevealHeading";
import { Container, Section, Eyebrow, ButtonLink, MediaFrame, type PaletteLayer } from "@/components/ui";
import { RevealImage } from "@/lib/motion";
import { getOffices } from "@/lib/content/collections";
import { OfficeSearch } from "@/components/content/OfficeSearch";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { hasCta } from "@/lib/content/cta";

/** 07 Find your place: office search + map, warm photo, application preview, honest enquiry note. */
export async function FindPlace({ content, layer, media }: { content: SectionContent<"home.find_place">; layer: PaletteLayer; media: Record<string, Media> }) {
  const offices = await getOffices();
  const image = content.image ? media[content.image] : null;
  return (
    <Section layer={layer} id={content.anchor || undefined} aria-labelledby="find-heading">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <RevealHeading id="find-heading" text={content.heading} highlight={content.highlight} size="l" className="mt-6" />
            {content.body && <p className="mt-6 max-w-[48ch] text-lead text-muted">{content.body}</p>}
          </div>
          <div className="lg:col-span-5">
            <RevealImage from="right">
              <MediaFrame media={image} ratio="4/3" sizes="(min-width: 1024px) 38vw, 100vw" />
            </RevealImage>
          </div>
        </div>

        <div data-layer="milky" className="mt-14 rounded-xl p-5 md:p-8">
          {offices.length > 0 ? <OfficeSearch offices={offices} /> : <p className="text-lead">Office details are being verified and will appear here soon. You can still tell us where you are and we&rsquo;ll connect you.</p>}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          {content.previewSteps.length > 0 && (
            <div className="lg:col-span-7">
              {content.previewHeading && <h3 className="text-display-s font-semibold">{content.previewHeading}</h3>}
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {content.previewSteps.map((s, i) => (
                  <li key={i} className="rounded-lg border border-line p-5">
                    <span className="font-serif text-display-s italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-3 font-medium">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex flex-col justify-end gap-6 lg:col-span-5">
            {content.enquiryNote && <p className="text-muted">{content.enquiryNote}</p>}
            <div className="flex flex-wrap gap-3">
              {hasCta(content.primaryCta) && (
                <ButtonLink href={content.primaryCta.href} data-cta="find-primary">
                  {content.primaryCta.label}
                </ButtonLink>
              )}
              {hasCta(content.secondaryCta) && (
                <ButtonLink href={content.secondaryCta.href} variant="secondary" data-cta="find-secondary">
                  {content.secondaryCta.label}
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
