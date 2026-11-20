import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Phone, Mail, MessageCircle, MapPin } from "lucide-react";
import { Container, Section, MediaFrame, ButtonLink, Eyebrow } from "@/components/ui";
import { RevealText, StaggerCards } from "@/lib/motion";
import { getOffice, getUpcomingEvents } from "@/lib/content/collections";
import { EventCard } from "@/components/content/cards";
import { TrackView } from "@/components/content/ArticleTools";
import { OfficeSearch } from "@/components/content/OfficeSearch";
import { JsonLd } from "@/components/site/JsonLd";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";
import { formatDate, siteUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const o = await getOffice(slug);
  if (!o) return { title: "Office not found" };
  return buildMetadata({ title: o.seoTitle || `${o.name}${o.city ? `, ${o.city}` : ""}`, description: o.seoDescription || o.summary, path: `/offices/${slug}`, image: o.hero });
}

function Block({ title, text, id }: { title: string; text: string | null; id: string }) {
  if (!text) return null;
  return (
    <section aria-labelledby={id} className="border-t border-line py-10 first:border-t-0 first:pt-0">
      <h2 id={id} className="text-display-s font-semibold">{title}</h2>
      <p className="mt-4 max-w-[62ch] whitespace-pre-line text-lead text-muted">{text}</p>
    </section>
  );
}

async function OfficeView({ params }: { params: Params }) {
  const { slug } = await params;
  const o = await getOffice(slug);
  if (!o) notFound();
  const events = await getUpcomingEvents(3, slug);
  const address = [o.addressLine, o.city, o.state, o.postcode, o.country].filter(Boolean).join(", ");
  const hasContact = o.phone || o.email || o.whatsapp;
  return (
    <>
      <TrackView event="office_view" id={slug} />
      {/* 1. Hero */}
      <Section layer="canopy" className="pb-section-sm pt-36 md:pt-44" spacing="none">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Link href="/offices" className="sv-link-underline text-small text-white/80">Find an Office</Link>
            <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold text-white">{o.name}</RevealText>
            {(o.city || o.state) && <p className="mt-4 text-lead text-white/85">{[o.city, o.state].filter(Boolean).join(", ")}</p>}
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-small text-white">
              {o.verified ? <><BadgeCheck className="size-4 text-lime" aria-hidden /> Details verified{o.lastVerifiedAt ? ` ${formatDate(o.lastVerifiedAt)}` : ""}</> : "Details awaiting verification"}
            </p>
            {o.summary && <p className="mt-6 max-w-[52ch] text-lead text-white/85">{o.summary}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/join`} data-cta="office-join">Join through this office</ButtonLink>
              <ButtonLink href={`/contact?type=office_visit`} variant="secondary">Arrange a visit</ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5"><MediaFrame media={o.hero} ratio="4/3" priority sizes="(min-width: 1024px) 38vw, 100vw" /></div>
        </Container>
      </Section>

      <Section layer="milky">
        <Container className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {/* 2–6 Editorial parts */}
            <Block id="welcome" title="Welcome" text={o.welcome} />
            <Block id="what-happens" title="What happens here" text={o.whatHappens} />
            <Block id="programmes" title="Programmes" text={o.programmes} />
            <Block id="first-visit" title="Your first visit" text={o.firstVisit} />
            <Block id="getting-there" title="Getting there" text={o.gettingThere} />
            <Block id="accessibility" title="Accessibility" text={o.accessibility} />
            {!o.welcome && !o.whatHappens && !o.firstVisit && <p className="text-lead text-muted">More about this office is coming soon. You can still arrange a visit or send an enquiry.</p>}
          </div>
          {/* 7–8 Practical details */}
          <aside className="space-y-8 lg:col-span-5" aria-label="Office details">
            {o.hours.length > 0 && (
              <div className="rounded-xl border border-line p-6">
                <h2 className="flex items-center gap-2 font-semibold"><Clock className="size-5" aria-hidden /> Opening hours</h2>
                <dl className="mt-4 divide-y divide-line">
                  {o.hours.map((h, i) => (
                    <div key={i} className="flex justify-between gap-4 py-2 text-small">
                      <dt className="font-medium">{h.day}</dt>
                      <dd className="text-right text-muted">{h.opens && h.closes ? `${h.opens}–${h.closes}` : "Closed"}{h.note ? ` · ${h.note}` : ""}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {(hasContact || address) && (
              <div className="rounded-xl border border-line p-6">
                <h2 className="font-semibold">Contact &amp; location</h2>
                <ul className="mt-4 space-y-3">
                  {address && <li className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0" aria-hidden /><span>{address}{o.lat != null && o.lng != null && <> · <a className="underline underline-offset-4" href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=17/${o.lat}/${o.lng}`} target="_blank" rel="noopener noreferrer">Open map</a></>}</span></li>}
                  {o.phone && <li className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`tel:${o.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">{o.phone}</a></li>}
                  {o.whatsapp && <li className="flex gap-3"><MessageCircle className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`https://wa.me/${o.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">WhatsApp</a></li>}
                  {o.email && <li className="flex gap-3"><Mail className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`mailto:${o.email}`} className="underline underline-offset-4">{o.email}</a></li>}
                </ul>
                {o.leadContactName && <p className="mt-4 text-small text-muted">Lead contact: {o.leadContactName}{o.leadContactRole ? `, ${o.leadContactRole}` : ""}</p>}
              </div>
            )}
            {/* 10. Verification + reporting */}
            <p className="text-small text-muted">
              {o.lastVerifiedAt ? `Last verified ${formatDate(o.lastVerifiedAt)}.` : "These details have not been verified yet."}{" "}
              <Link href={`/contact?type=feedback&office=${o.slug}`} className="underline underline-offset-4">Report incorrect details</Link>
            </p>
          </aside>
        </Container>
        {o.lat != null && o.lng != null && (
          <Container className="mt-14">
            <OfficeSearch offices={[o]} showMap headingLevel={2} />
          </Container>
        )}
      </Section>

      {/* 9. Gallery */}
      {o.gallery.length > 0 && (
        <Section layer="sand" spacing="sm">
          <Container>
            <Eyebrow>Inside the office</Eyebrow>
            <StaggerCards className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
              {o.gallery.map((m) => (
                <figure key={m.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={m.url} alt={m.alt} fill sizes="(min-width: 768px) 30vw, 50vw" className="object-cover" /></div>
                  {m.caption && <figcaption className="mt-2 text-caption text-muted">{m.caption}</figcaption>}
                </figure>
              ))}
            </StaggerCards>
          </Container>
        </Section>
      )}

      {/* Upcoming events at this office */}
      {events.length > 0 && (
        <Section layer="milky" spacing="sm">
          <Container>
            <h2 className="text-display-s font-semibold">Coming up at {o.name}</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
          </Container>
        </Section>
      )}

      {o.verified && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "LocalBusiness", name: o.name, url: siteUrl(`/offices/${slug}`),
          ...(o.hero ? { image: o.hero.url } : {}), ...(o.phone ? { telephone: o.phone } : {}), ...(o.email ? { email: o.email } : {}),
          address: { "@type": "PostalAddress", streetAddress: o.addressLine ?? undefined, addressLocality: o.city ?? undefined, addressRegion: o.state ?? undefined, postalCode: o.postcode ?? undefined, addressCountry: o.country ?? undefined },
          ...(o.lat != null && o.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: o.lat, longitude: o.lng } } : {}),
          parentOrganization: { "@type": "Organization", name: "Springvilla" },
        }} />
      )}
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Find an Office", path: "/offices" }, { name: o.name, path: `/offices/${slug}` }])} />
    </>
  );
}

export default function OfficePage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-canopy" />}><OfficeView params={params} /></Suspense>;
}
