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
          </div>
        </div>
        <div className="lg:col-span-8">
          <JoinForm
            offices={offices.map((o) => ({ id: o.id, name: o.name, city: o.city, state: o.state }))}
            copy={{ enquiryNote: content.enquiryNote, successHeading: content.successHeading || "Thank you.", successBody: content.successBody, privacyLabel: content.privacyLabel || "I agree that Springvilla can store these details to respond to me.", contactLabel: content.contactLabel || "I'm happy to be contacted." }}
          />
        </div>
      </Container>
    </Section>
  );
}
