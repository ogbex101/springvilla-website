import { parseSection } from "@/lib/content/schemas";
import type { Registry } from "../SectionRenderer";
import { sharedRegistry } from "./shared";
import { Hero } from "../home/Hero";
import { IntroMarquee } from "../home/IntroMarquee";
import { WhatIs } from "../home/WhatIs";
import { TwoPaths } from "../home/TwoPaths";
import { JourneyWords } from "../home/JourneyWords";
import { LifeInside } from "../home/LifeInside";
import { RealJourneys } from "../home/RealJourneys";
import { IdeasHappenings } from "../home/IdeasHappenings";
import { FindPlace } from "../home/FindPlace";

/** Homepage-only sections (plus the shared ones). */
export const homeRegistry: Registry = {
  ...sharedRegistry,
  "home.hero": (s, media) => {
    const c = parseSection("home.hero", s.content);
    const m = (id: string | null) => (id ? media[id] ?? null : null);
    return <Hero content={c} poster={m(c.poster)} videoDesktop={m(c.videoDesktop)} videoDesktopWebm={m(c.videoDesktopWebm)} videoMobile={m(c.videoMobile)} />;
  },
  "home.marquee": (s) => <IntroMarquee content={parseSection("home.marquee", s.content)} />,
  "home.what_is": (s, media) => <WhatIs layer={s.layer} media={media} content={parseSection("home.what_is", s.content)} />,
  "home.two_paths": (s, media) => <TwoPaths layer={s.layer} media={media} content={parseSection("home.two_paths", s.content)} />,
  "home.journey_words": (s) => <JourneyWords content={parseSection("home.journey_words", s.content)} />,
  "home.life_inside": (s, media) => <LifeInside layer={s.layer} media={media} content={parseSection("home.life_inside", s.content)} />,
  "home.journeys": (s) => <RealJourneys layer={s.layer} content={parseSection("home.journeys", s.content)} />,
  "home.ideas": (s) => <IdeasHappenings layer={s.layer} content={parseSection("home.ideas", s.content)} />,
  "home.find_place": (s, media) => <FindPlace layer={s.layer} media={media} content={parseSection("home.find_place", s.content)} />,
};
