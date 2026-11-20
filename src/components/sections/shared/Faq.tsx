import { Container, Section, type PaletteLayer } from "@/components/ui";
import type { SectionContent } from "@/lib/content/schemas";
import { SectionHeader } from "./SectionHeader";
import { Accordion } from "./Accordion";
import { JsonLd } from "@/components/site/JsonLd";

/** FAQ accordion + FAQPage structured data. */
export function FaqSection({ content, layer }: { content: SectionContent<"faq">; layer: PaletteLayer }) {
  const items = content.items.filter((i) => i.question && i.answer);
  if (!items.length) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} size="m" />
        </div>
        <div className="lg:col-span-8">
          <Accordion items={items.map((i) => ({ title: i.question, body: i.answer }))} />
        </div>
      </Container>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
        }}
      />
    </Section>
  );
}
