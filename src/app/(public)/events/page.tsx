import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { getUpcomingEvents, getPastEvents } from "@/lib/content/collections";
import { getPageData } from "@/lib/content/queries";
import { parseSection } from "@/lib/content/schemas";
import { ListingGrid } from "@/components/content/Listing";
import { EventCard } from "@/components/content/cards";

export const generateMetadata = () => pageMetadata("events");

export default async function EventsPage() {
  const [upcoming, past, page] = await Promise.all([getUpcomingEvents(48), getPastEvents(6), getPageData("events")]);
  const intro = parseSection("listing_intro", page?.sections[0]?.content);
  return (
    <>
      <CmsPage pageKey="events" crumbs={[{ name: "Events", path: "/events" }]} />
      <ListingGrid title="Upcoming" isEmpty={!upcoming.length} empty={intro.emptyText || "No upcoming events."}>
        {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
      </ListingGrid>
      {past.length > 0 && (
        <ListingGrid title="Past events" isEmpty={false} empty="">
          {past.map((e) => <EventCard key={e.id} event={e} />)}
        </ListingGrid>
      )}
    </>
  );
}
