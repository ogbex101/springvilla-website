import { Marquee } from "@/components/ui";
import type { SectionContent } from "@/lib/content/schemas";

/** Slow two-row Lime Sprout marquee on Fresh Canopy. Pauses on hover; static for reduced motion. */
export function IntroMarquee({ content }: { content: SectionContent<"home.marquee"> }) {
  if (!content.rowOne.length && !content.rowTwo.length) return null;
  return (
    <section data-layer="canopy" aria-label="Springvilla in a few words" className="relative overflow-hidden border-y border-line py-8 md:py-10">
      <div className="space-y-2 font-semibold text-lime md:space-y-4">
        {content.rowOne.length > 0 && <Marquee items={content.rowOne} duration={60} className="text-display-m" />}
        {content.rowTwo.length > 0 && (
          <Marquee items={content.rowTwo} reverse duration={70} className="sv-serif-accent text-display-s font-normal text-white/80" separator="·" />
        )}
      </div>
    </section>
  );
}
