import { RevealHeading } from "@/components/ui/RevealHeading";
import { Container, Section, Eyebrow, ButtonLink, type PaletteLayer } from "@/components/ui";
import { StaggerCards } from "@/lib/motion";
import { getFeaturedPost, searchPosts, getUpcomingEvents, getNews } from "@/lib/content/collections";
import { ArticleCard, EventCard, NewsCard } from "@/components/content/cards";
import type { SectionContent } from "@/lib/content/schemas";
import { hasCta } from "@/lib/content/fields";

/** 06 Ideas and happenings: live from the database, with admin override for the featured article. */
export async function IdeasHappenings({ content, layer }: { content: SectionContent<"home.ideas">; layer: PaletteLayer }) {
  const [featuredOverride, recent, events, officeNews] = await Promise.all([
    getFeaturedPost(content.featuredSlug || undefined),
    searchPosts("", undefined, 1),
    getUpcomingEvents(1),
    content.showOfficeUpdate ? getNews(1, true) : Promise.resolve([]),
  ]);
  const featured = featuredOverride ?? recent.posts[0] ?? null;
  const others = recent.posts.filter((p) => p.id !== featured?.id).slice(0, 2);
  const event = events[0];
  const update = officeNews[0];
  const empty = !featured && !event && !update;

  return (
    <Section layer={layer} id={content.anchor || undefined} aria-labelledby="ideas-heading">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <RevealHeading id="ideas-heading" text={content.heading} highlight={content.highlight} size="m" className="mt-6" />
            {content.body && <p className="mt-5 max-w-[48ch] text-lead text-muted">{content.body}</p>}
          </div>
          {!empty && hasCta(content.cta) && (
            <ButtonLink href={content.cta.href} variant="secondary" className="shrink-0" data-cta="ideas">
              {content.cta.label}
            </ButtonLink>
          )}
        </div>

        {empty ? (
          <p className="mt-12 rounded-xl border border-dashed border-line p-8 text-lead text-muted">{content.emptyText}</p>
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-12">
            {featured && (
              <div className="lg:col-span-7">
                <ArticleCard post={featured} size="lg" />
              </div>
            )}
            <StaggerCards className="grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {others.map((p) => (
                <ArticleCard key={p.id} post={p} />
              ))}
              {event && <EventCard event={event} />}
              {update && <NewsCard item={update} />}
            </StaggerCards>
          </div>
        )}
      </Container>
    </Section>
  );
}
