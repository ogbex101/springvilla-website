import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/ui";
import { searchPosts, getJourneys, getNews, getUpcomingEvents } from "@/lib/content/collections";
import { ArticleCard, EventCard, NewsCard } from "@/components/content/cards";
import { StaggerCards } from "@/lib/motion";

export const generateMetadata = () => pageMetadata("stories-and-ideas");

function Row({ title, href, children, count }: { title: string; href: string; children: React.ReactNode; count: number }) {
  if (!count) return null;
  return (
    <Section layer="milky" spacing="sm" className="border-t border-line first:border-t-0">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <h2 className="text-display-m font-semibold">{title}</h2>
          <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-2 font-semibold underline-offset-4 hover:underline">
            See all <span className="sr-only">{title}</span> <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <StaggerCards className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{children}</StaggerCards>
      </Container>
    </Section>
  );
}

export default async function StoriesHub() {
  const [posts, journeys, news, events] = await Promise.all([searchPosts("", undefined, 1), getJourneys(3), getNews(3), getUpcomingEvents(3)]);
  const nothing = !posts.posts.length && !journeys.length && !news.length && !events.length;
  return (
    <>
      <CmsPage pageKey="stories-and-ideas" crumbs={[{ name: "Stories & Ideas", path: "/stories-and-ideas" }]} />
      {nothing ? (
        <Section layer="milky" spacing="sm">
          <Container>
            <p className="rounded-xl border border-dashed border-line p-8 text-lead text-muted">Articles, journeys, news and events will appear here as they are published.</p>
          </Container>
        </Section>
      ) : (
        <>
          <Row title="Ideas" href="/ideas" count={posts.posts.length}>
            {posts.posts.slice(0, 3).map((p) => <ArticleCard key={p.id} post={p} />)}
          </Row>
          <Row title="Journeys" href="/journeys" count={journeys.length}>
            {journeys.map((j) => (
              <article key={j.id} className="rounded-xl border border-line p-6">
                <p className="sv-eyebrow text-muted">{j.publicName ?? "Member"}</p>
                <h3 className="mt-2 text-[1.35rem] font-semibold"><Link href={`/journeys/${j.slug}`} className="sv-link-underline">{j.title}</Link></h3>
                {j.summary && <p className="mt-2 text-muted">{j.summary}</p>}
              </article>
            ))}
          </Row>
          <Row title="Events" href="/events" count={events.length}>
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </Row>
          <Row title="News" href="/news" count={news.length}>
            {news.map((n) => <NewsCard key={n.id} item={n} />)}
          </Row>
        </>
      )}
    </>
  );
}
