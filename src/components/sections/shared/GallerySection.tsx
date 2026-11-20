import { Container, Section, type PaletteLayer } from "@/components/ui";
import type { SectionContent } from "@/lib/content/schemas";
import type { Media } from "@/lib/content/media-types";
import { SectionHeader } from "./SectionHeader";
import { Gallery } from "./Gallery";

export function GallerySection({ content, layer, media }: { content: SectionContent<"gallery">; layer: PaletteLayer; media: Record<string, Media> }) {
  const images = content.images.map((id) => media[id]).filter((m): m is Media => Boolean(m && m.type === "image"));
  if (!images.length) return null;
  return (
    <Section layer={layer} id={content.anchor || undefined}>
      <Container>
        <SectionHeader eyebrow={content.eyebrow} heading={content.heading} highlight={content.highlight} intro={content.intro} />
        <Gallery images={images} />
      </Container>
    </Section>
  );
}
