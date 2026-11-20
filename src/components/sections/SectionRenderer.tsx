import type { PageData, SectionRow } from "@/lib/content/queries";
import { parseSection } from "@/lib/content/schemas";
import { Hero } from "./home/Hero";
import { IntroMarquee } from "./home/IntroMarquee";
import { WhatIs } from "./home/WhatIs";
import { TwoPaths } from "./home/TwoPaths";
import { JourneyWords } from "./home/JourneyWords";
import { LifeInside } from "./home/LifeInside";
import { RealJourneys } from "./home/RealJourneys";
import { IdeasHappenings } from "./home/IdeasHappenings";
import { FindPlace } from "./home/FindPlace";
import { PageHero } from "./shared/PageHero";
import { FaqSection } from "./shared/Faq";
import { GallerySection } from "./shared/GallerySection";
import { AnchorNav } from "./shared/AnchorNav";
import {
  RichTextSection,
  SplitFeatureSection,
  StepsSection,
  RelationshipSection,
  PathwaysSection,
  RealitySection,
  LeadershipSection,
  CardGridSection,
  CtaBandSection,
  LegalSection,
  ListingIntro,
} from "./shared/Sections";
import { JoinFormSection } from "./forms/JoinFormSection";
import { ContactFormSection } from "./forms/ContactFormSection";

/** Renders one stored section with its typed content. Unknown/empty sections render nothing. */
export function RenderSection({ section, media }: { section: SectionRow; media: PageData["media"] }) {
  const { layer } = section;
  const base = { layer, media };
  switch (section.key) {
    case "home.hero": {
      const c = parseSection("home.hero", section.content);
      const m = (id: string | null) => (id ? media[id] ?? null : null);
      return <Hero content={c} poster={m(c.poster)} videoDesktop={m(c.videoDesktop)} videoDesktopWebm={m(c.videoDesktopWebm)} videoMobile={m(c.videoMobile)} />;
    }
    case "home.marquee":
      return <IntroMarquee content={parseSection("home.marquee", section.content)} />;
    case "home.what_is":
      return <WhatIs {...base} content={parseSection("home.what_is", section.content)} />;
    case "home.two_paths":
      return <TwoPaths {...base} content={parseSection("home.two_paths", section.content)} />;
    case "home.journey_words":
      return <JourneyWords content={parseSection("home.journey_words", section.content)} />;
    case "home.life_inside":
      return <LifeInside {...base} content={parseSection("home.life_inside", section.content)} />;
    case "home.journeys":
      return <RealJourneys layer={layer} content={parseSection("home.journeys", section.content)} />;
    case "home.ideas":
      return <IdeasHappenings layer={layer} content={parseSection("home.ideas", section.content)} />;
    case "home.find_place":
      return <FindPlace {...base} content={parseSection("home.find_place", section.content)} />;
    case "page_hero":
      return <PageHero {...base} content={parseSection("page_hero", section.content)} />;
    case "rich_text":
      return <RichTextSection {...base} content={parseSection("rich_text", section.content)} />;
    case "split_feature":
      return <SplitFeatureSection {...base} content={parseSection("split_feature", section.content)} />;
    case "steps":
      return <StepsSection {...base} content={parseSection("steps", section.content)} />;
    case "relationship":
      return <RelationshipSection {...base} content={parseSection("relationship", section.content)} />;
    case "pathways":
      return <PathwaysSection {...base} content={parseSection("pathways", section.content)} />;
    case "reality":
      return <RealitySection {...base} content={parseSection("reality", section.content)} />;
    case "faq":
      return <FaqSection layer={layer} content={parseSection("faq", section.content)} />;
    case "leadership":
      return <LeadershipSection {...base} content={parseSection("leadership", section.content)} />;
    case "gallery":
      return <GallerySection {...base} content={parseSection("gallery", section.content)} />;
    case "card_grid":
      return <CardGridSection {...base} content={parseSection("card_grid", section.content)} />;
    case "cta_band":
      return <CtaBandSection {...base} content={parseSection("cta_band", section.content)} />;
    case "legal":
      return <LegalSection {...base} content={parseSection("legal", section.content)} />;
    case "listing_intro":
      return <ListingIntro layer={layer} content={parseSection("listing_intro", section.content)} />;
    case "join_form":
      return <JoinFormSection layer={layer} content={parseSection("join_form", section.content)} />;
    case "contact_form":
      return <ContactFormSection layer={layer} content={parseSection("contact_form", section.content)} />;
    default:
      return null;
  }
}

/** Renders all sections of a page, inserting the sticky anchor sub-nav after the hero when sections define anchors. */
export function PageSections({ page, from = 0, to, subnav = false }: { page: PageData; from?: number; to?: number; subnav?: boolean }) {
  const sections = page.sections.slice(from, to);
  const anchors = subnav
    ? page.sections
        .map((s) => s.content as { anchor?: string; navLabel?: string })
        .filter((c) => c.anchor && c.navLabel)
        .map((c) => ({ id: c.anchor as string, label: c.navLabel as string }))
    : [];
  return (
    <>
      {page.preview && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-lime px-5 py-2 text-small font-semibold text-canopy shadow-lift">
          Draft preview
        </div>
      )}
      {sections.map((s, i) => (
        <div key={s.id} className="contents">
          <RenderSection section={s} media={page.media} />
          {i === 0 && anchors.length > 1 && <AnchorNav items={anchors} />}
        </div>
      ))}
    </>
  );
}
