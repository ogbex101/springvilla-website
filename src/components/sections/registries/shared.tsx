import { parseSection } from "@/lib/content/schemas";
import type { Registry } from "../SectionRenderer";
import { PageHero } from "../shared/PageHero";
import { FaqSection } from "../shared/Faq";
import { GallerySection } from "../shared/GallerySection";
import { RichTextSection, SplitFeatureSection, StepsSection, RelationshipSection, PathwaysSection, RealitySection, LeadershipSection, CardGridSection, CtaBandSection, LegalSection, ListingIntro } from "../shared/Sections";

/** Sections available on every content page. */
export const sharedRegistry: Registry = {
  page_hero: (s, media) => <PageHero layer={s.layer} media={media} content={parseSection("page_hero", s.content)} />,
  rich_text: (s, media) => <RichTextSection layer={s.layer} media={media} content={parseSection("rich_text", s.content)} />,
  split_feature: (s, media) => <SplitFeatureSection layer={s.layer} media={media} content={parseSection("split_feature", s.content)} />,
  steps: (s, media) => <StepsSection layer={s.layer} media={media} content={parseSection("steps", s.content)} />,
  relationship: (s, media) => <RelationshipSection layer={s.layer} media={media} content={parseSection("relationship", s.content)} />,
  pathways: (s, media) => <PathwaysSection layer={s.layer} media={media} content={parseSection("pathways", s.content)} />,
  reality: (s, media) => <RealitySection layer={s.layer} media={media} content={parseSection("reality", s.content)} />,
  faq: (s) => <FaqSection layer={s.layer} content={parseSection("faq", s.content)} />,
  leadership: (s, media) => <LeadershipSection layer={s.layer} media={media} content={parseSection("leadership", s.content)} />,
  gallery: (s, media) => <GallerySection layer={s.layer} media={media} content={parseSection("gallery", s.content)} />,
  card_grid: (s, media) => <CardGridSection layer={s.layer} media={media} content={parseSection("card_grid", s.content)} />,
  cta_band: (s, media) => <CtaBandSection layer={s.layer} media={media} content={parseSection("cta_band", s.content)} />,
  legal: (s, media) => <LegalSection layer={s.layer} media={media} content={parseSection("legal", s.content)} />,
  listing_intro: (s) => <ListingIntro layer={s.layer} content={parseSection("listing_intro", s.content)} />,
};
