import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Globe } from "lucide-react";
import { Container, Section, MediaFrame, ButtonLink } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { getEvent, getStaticSlugs } from "@/lib/content/collections";
import { EventDate } from "@/components/content/EventDate";
import { TrackView } from "@/components/content/ArticleTools";
import { JsonLd } from "@/components/site/JsonLd";
import { SafeHtml } from "@/components/site/SafeHtml";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStaticSlugs("events");
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "Event not found" };
  return buildMetadata({ title: e.seoTitle || e.title, description: e.seoDescription || e.summary, path: `/events/${slug}`, image: e.cover });
}

const STATUS: Record<string, string> = { postponed: "Postponed", cancelled: "Cancelled", full: "Fully booked" };
const SCHEMA_STATUS: Record<string, string> = { scheduled: "EventScheduled", postponed: "EventPostponed", cancelled: "EventCancelled", full: "EventScheduled" };

async function EventView({ params }: { params: Params }) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();
  const where = e.office ? `${e.office.name}${e.office.city ? `, ${e.office.city}` : ""}` : e.venue;
  return (
    <>
      <TrackView event="event_view" id={slug} />
      <Section layer="canopy" className="pb-section-sm pt-36 md:pt-44" spacing="none">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Link href="/events" className="sv-link-underline text-small text-white/80">Events</Link>
            {STATUS[e.state] && <p className="mt-6 inline-flex rounded-full bg-lime px-3 py-1 text-caption font-semibold text-canopy">{STATUS[e.state]}</p>}
            <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold text-white">{e.title}</RevealText>
            <ul className="mt-8 space-y-3 text-lead text-white/90">
              <li className="flex gap-3"><CalendarDays className="mt-1 size-5 shrink-0" aria-hidden /><EventDate start={e.startsAt} end={e.endsAt} timeZone={e.timezone} long /></li>
              {where && <li className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0" aria-hidden />{e.office ? <Link href={`/offices/${e.office.slug}`} className="underline underline-offset-4">{where}</Link> : where}</li>}
              {e.onlineUrl && <li className="flex gap-3"><Globe className="mt-1 size-5 shrink-0" aria-hidden />Online</li>}
            </ul>
            {e.registrationUrl && e.state === "scheduled" && <div className="mt-10"><ButtonLink href={e.registrationUrl} data-cta="event-register">Register</ButtonLink></div>}
          </div>
          {e.cover && <div className="lg:col-span-5"><MediaFrame media={e.cover} ratio="4/3" priority /></div>}
        </Container>
      </Section>
      <Section layer="milky" spacing="sm">
        <Container size="narrow">
          {e.summary && <p className="text-lead">{e.summary}</p>}
          <SafeHtml className="sv-prose mt-8" html={e.bodyHtml} />
        </Container>
      </Section>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Event", name: e.title, startDate: e.startsAt, ...(e.endsAt ? { endDate: e.endsAt } : {}),
        eventStatus: `https://schema.org/${SCHEMA_STATUS[e.state]}`,
        eventAttendanceMode: e.onlineUrl && !where ? "https://schema.org/OnlineEventAttendanceMode" : e.onlineUrl ? "https://schema.org/MixedEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
        location: where ? { "@type": "Place", name: where } : { "@type": "VirtualLocation", url: e.onlineUrl },
        description: e.summary ?? undefined, ...(e.cover ? { image: e.cover.url } : {}), url: siteUrl(`/events/${slug}`),
        organizer: { "@type": "Organization", name: "Springvilla", url: siteUrl("/") },
      }} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }, { name: e.title, path: `/events/${slug}` }])} />
    </>
  );
}

export default function EventPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-canopy" />}><EventView params={params} /></Suspense>;
}
