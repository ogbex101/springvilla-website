import { Container, Section, type PaletteLayer } from "@/components/ui";
import { getOffices } from "@/lib/content/collections";
import type { SectionContent } from "@/lib/content/schemas";
import { SectionHeader } from "../shared/SectionHeader";
import { ContactForm } from "./ContactForm";

export async function ContactFormSection({ content, layer }: { content: SectionContent<"contact_form">; layer: PaletteLayer }) {
  const offices = await getOffices();
  const types = content.types.filter((t) => t.label);
  return (
    <Section layer={layer} className="pt-40 md:pt-48">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeader as="h1" size="l" eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        </div>
        <div className="lg:col-span-7">
          <ContactForm types={types} offices={offices.map((o) => ({ id: o.id, name: o.name, city: o.city }))} successHeading={content.successHeading || "Thank you."} successBody={content.successBody} />
        </div>
      </Container>
    </Section>
  );
}
