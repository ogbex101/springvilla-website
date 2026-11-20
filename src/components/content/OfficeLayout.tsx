import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Clock, Phone, Mail, MessageCircle, MapPin, Navigation, CalendarDays, Megaphone } from "lucide-react";
import { Container, Section, MediaFrame, ButtonLink } from "@/components/ui";
import { RevealText, StaggerCards } from "@/lib/motion";
import type { OfficeFull, EventCard, NewsCard } from "@/lib/content/collections";
import { EventDate } from "@/components/content/EventDate";
import { TrackView } from "@/components/content/ArticleTools";
import { OfficeSearch } from "@/components/content/OfficeSearch";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { formatDate, siteUrl } from "@/lib/utils";

const PREFERRED: Record<string, string> = { phone: "Phone", whatsapp: "WhatsApp", email: "Email", visit: "Visit in person" };

/** Numbered part heading, so the §11.2 structure is legible to editors and visitors. */
function Part({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-10 first:border-t-0 first:pt-0">
      <p className="sv-eyebrow text-muted" aria-hidden>{String(n).padStart(2, "0")}</p>
      <h2 id={id} className="mt-2 text-display-s font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Text = ({ children }: { children: string }) => <p className="max-w-[62ch] whitespace-pre-line text-lead text-muted">{children}</p>;

/** The 10-part office page from blueprint §11.2, in source order. */
export function OfficeLayout({ o, events, news, slug }: { o: OfficeFull; events: EventCard[]; news: NewsCard[]; slug: string }) {
  const place = [o.city, o.state, o.country].filter(Boolean).join(", ");
  const address = [o.addressLine, o.city, o.state, o.postcode, o.country].filter(Boolean).join(", ");
  const hasCoords = o.lat != null && o.lng != null;
  const directions = hasCoords
    ? `https://www.openstreetmap.org/directions?to=${o.lat}%2C${o.lng}`
    : address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
      : null;
  const expect = [o.welcome, o.whatHappens, o.programmes].filter(Boolean) as string[];
  const guidance = [
    ["Do I need an appointment?", o.visitAppointment],
    ["Your first visit", o.firstVisit],
    ["What to bring", o.whatToBring],
    ["Getting there", o.gettingThere],
    ["Accessibility", o.accessibility],
    ["Eligibility and costs", o.eligibilityCosts],
  ].filter(([, v]) => v) as [string, string][];
  const ask = `/contact?type=office_information&office=${o.slug}`;

  return (
    <>
      <TrackView event="office_view" id={slug} />

      {/* 1. Name, location and approved photograph */}
      <Section layer="canopy" className="pb-section-sm pt-36 md:pt-44" spacing="none">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Link href="/offices" className="sv-link-underline text-small text-white/80">Find an Office</Link>
            <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold text-white">{o.name}</RevealText>
            {place && <p className="mt-4 text-lead text-white/85">{place}</p>}
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-small text-white">
              {o.verified ? <><BadgeCheck className="size-4 text-lime" aria-hidden /> Official office · details verified{o.lastVerifiedAt ? ` ${formatDate(o.lastVerifiedAt)}` : ""}</> : "Details awaiting verification"}
            </p>
            {o.summary && <p className="mt-6 max-w-[52ch] text-lead text-white/85">{o.summary}</p>}
          </div>
          <div className="lg:col-span-5"><MediaFrame media={o.hero} ratio="4/3" priority sizes="(min-width: 1024px) 38vw, 100vw" /></div>
        </Container>
      </Section>

      {/* Parts 2–10 in source order (also the order on phones and for screen readers). */}
      <Section layer="milky">
        <Container className="grid gap-x-12 lg:grid-cols-2">
          {/* 2. Address, coordinates, directions */}
          <Part id="address" n={2} title="Address and directions">
            {address ? <p className="flex gap-3 text-lead"><MapPin className="mt-1 size-5 shrink-0" aria-hidden />{address}</p> : <p className="text-muted">The verified address will appear here.</p>}
            {hasCoords && <p className="mt-2 text-small text-muted">Coordinates: {o.lat!.toFixed(5)}, {o.lng!.toFixed(5)}</p>}
            {directions && (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
                <Navigation className="size-4" aria-hidden /> Get directions<span className="sr-only"> to {o.name} (opens OpenStreetMap)</span>
              </a>
            )}
          </Part>

          {/* 3. Contact, preferred method, hours */}
          <Part id="contact" n={3} title="Contact and opening hours">
            <ul className="space-y-3">
              {o.phone && <li className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`tel:${o.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">{o.phone}</a></li>}
              {o.whatsapp && <li className="flex gap-3"><MessageCircle className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`https://wa.me/${o.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">WhatsApp</a></li>}
              {o.email && <li className="flex gap-3"><Mail className="mt-0.5 size-5 shrink-0" aria-hidden /><a href={`mailto:${o.email}`} className="underline underline-offset-4">{o.email}</a></li>}
              {!o.phone && !o.whatsapp && !o.email && <li className="text-muted">Contact details will appear once verified. You can still <Link href={ask} className="underline">send a message</Link>.</li>}
            </ul>
            {o.preferredContact && <p className="mt-3 text-small text-muted">Preferred: {PREFERRED[o.preferredContact]}</p>}
            {o.hours.length > 0 && (
              <>
                <h3 className="mt-5 flex items-center gap-2 text-small font-semibold"><Clock className="size-4" aria-hidden /> Opening hours</h3>
                <dl className="mt-2 divide-y divide-line">
                  {o.hours.map((h, i) => (
                    <div key={i} className="flex justify-between gap-4 py-2 text-small">
                      <dt className="font-medium">{h.day}</dt>
                      <dd className="text-right text-muted">{h.opens && h.closes ? `${h.opens}–${h.closes}` : "Closed"}{h.note ? ` · ${h.note}` : ""}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Part>

          {hasCoords && <div className="pb-10 lg:col-span-2"><OfficeSearch offices={[o]} showMap headingLevel={2} /></div>}

          {/* 4. What visitors can expect */}
          <div className="lg:col-span-2">
            <Part id="expect" n={4} title="What you can expect">
              {expect.length ? <div className="space-y-5">{expect.map((t, i) => <Text key={i}>{t}</Text>)}</div> : <p className="text-muted">The activities and opportunities offered at this office will be listed once verified.</p>}
            </Part>
          </div>

          {/* 5. Local events and announcements, with freshness */}
          <Part id="local" n={5} title="Local events and announcements">
            {events.length === 0 && news.length === 0 ? (
              <p className="text-muted">No upcoming events or announcements for this office right now.</p>
            ) : (
              <ul className="divide-y divide-line">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3 py-3">
                    <CalendarDays className="mt-1 size-5 shrink-0" aria-hidden />
                    <span><Link href={`/events/${e.slug}`} className="font-semibold underline-offset-4 hover:underline">{e.title}</Link><span className="block text-small text-muted"><EventDate start={e.startsAt} end={e.endsAt} timeZone={e.timezone} /></span></span>
                  </li>
                ))}
                {news.map((n) => (
                  <li key={n.id} className="flex gap-3 py-3">
                    <Megaphone className="mt-1 size-5 shrink-0" aria-hidden />
                    <span><Link href={`/news/${n.slug}`} className="font-semibold underline-offset-4 hover:underline">{n.title}</Link>{n.publishedAt && <span className="block text-small text-muted">Posted {formatDate(n.publishedAt)}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Part>

          {/* 6. Representative (consent-controlled) */}
          <Part id="representative" n={6} title="Office representative">
            {o.leadContactName ? <p className="text-lead">{o.leadContactName}{o.leadContactRole ? <span className="text-muted">, {o.leadContactRole}</span> : null}</p> : <p className="text-muted">Representative details are shown only with their consent.</p>}
          </Part>

          {/* 7. Gallery with captions and dates */}
          <div className="lg:col-span-2">
            <Part id="gallery" n={7} title="Inside the office">
              {o.gallery.length ? (
                <StaggerCards className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {o.gallery.map((m) => (
                    <figure key={m.id}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={m.url} alt={m.alt} fill sizes="(min-width: 768px) 22vw, 50vw" className="object-cover" /></div>
                      {(m.caption || m.dateTaken) && <figcaption className="mt-2 text-caption text-muted">{m.caption}{m.dateTaken ? ` · ${formatDate(m.dateTaken)}` : ""}</figcaption>}
                    </figure>
                  ))}
                </StaggerCards>
              ) : <p className="text-muted">Approved photos of this office will appear here.</p>}
            </Part>
          </div>

          {/* 8. Visitor guidance */}
          <Part id="visit" n={8} title="Planning a visit">
            {guidance.length ? (
              <dl className="space-y-5">
                {guidance.map(([k, v]) => (
                  <div key={k}><dt className="font-semibold">{k}</dt><dd className="mt-1 max-w-[62ch] whitespace-pre-line text-muted">{v}</dd></div>
                ))}
              </dl>
            ) : (
              <p className="text-muted">Visitor guidance (appointments, what to bring, eligibility and costs) will be published once approved. Until then, ask the office before visiting.</p>
            )}
          </Part>

          {/* 9. Calls to action */}
          <Part id="next" n={9} title="Next steps">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={ask} variant="secondary" data-cta="office-ask">Ask about this office</ButtonLink>
              <ButtonLink href={ask} variant="secondary" data-cta="office-visit">Plan a visit</ButtonLink>
              <ButtonLink href={`/join?office=${o.slug}#apply`} data-cta="office-apply">Apply with this office</ButtonLink>
            </div>
          </Part>

          {/* 10. Verification + reporting */}
          <div className="lg:col-span-2">
            <Part id="verified" n={10} title="Accuracy">
              <p className="text-muted">
                {o.lastVerifiedAt ? `Last verified ${formatDate(o.lastVerifiedAt)}.` : "These details have not been verified yet."}{" "}
                <Link href={`/contact?type=office_information&office=${o.slug}&report=1`} className="underline underline-offset-4">Report incorrect details</Link>
              </p>
            </Part>
          </div>
        </Container>
      </Section>

      {o.verified && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "LocalBusiness", name: o.name, url: siteUrl(`/offices/${slug}`),
          ...(o.hero ? { image: o.hero.url } : {}), ...(o.phone ? { telephone: o.phone } : {}), ...(o.email ? { email: o.email } : {}),
          address: { "@type": "PostalAddress", streetAddress: o.addressLine ?? undefined, addressLocality: o.city ?? undefined, addressRegion: o.state ?? undefined, postalCode: o.postcode ?? undefined, addressCountry: o.country ?? undefined },
          ...(hasCoords ? { geo: { "@type": "GeoCoordinates", latitude: o.lat, longitude: o.lng } } : {}),
          ...(o.hours.length ? { openingHours: o.hours.filter((h) => h.opens && h.closes).map((h) => `${h.day} ${h.opens}-${h.closes}`) } : {}),
          parentOrganization: { "@type": "Organization", name: "Springvilla" },
        }} />
      )}
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Find an Office", path: "/offices" }, { name: o.name, path: `/offices/${slug}` }])} />
    </>
  );
}

