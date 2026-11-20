import { Container, Section, type PaletteLayer } from "@/components/ui";
import { getOffices } from "@/lib/content/collections";
import type { SectionContent } from "@/lib/content/schemas";
import { SectionHeader } from "../shared/SectionHeader";
import { JoinForm } from "./JoinForm";

export async function JoinFormSection({ content, layer }: { content: SectionContent<"join_form">; layer: PaletteLayer }) {
  const offices = await getOffices();
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} size="m" />
            {content.privacyExplanation && (
              <div className="mt-8 rounded-lg border border-line p-5">
                <p className="sv-eyebrow text-muted">Your privacy</p>
                <p className="mt-2 text-small text-muted">{content.privacyExplanation}</p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-8">
          <JoinForm
            offices={offices.map((o) => ({ id: o.id, slug: o.slug, name: o.name, city: o.city, state: o.state }))}
            copy={{
              enquiryNote: content.enquiryNote,
              successHeading: content.successHeading || "Thank you for your interest.",
              successBody: content.successBody,
              privacyLabel: content.privacyLabel || "I understand how Springvilla will use these details.",
              marketingLabel: content.marketingLabel || "Send me occasional updates from Springvilla (optional).",
              consentVersion: content.consentVersion,
            }}
          />
        </div>
      </Container>
    </Section>
  );
}
