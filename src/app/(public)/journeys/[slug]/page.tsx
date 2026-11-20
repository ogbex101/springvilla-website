import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container, Section, MediaFrame } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { getJourney, getStaticSlugs } from "@/lib/content/collections";
import { Timeline } from "@/components/content/Timeline";
import { JsonLd } from "@/components/site/JsonLd";
import { SafeHtml } from "@/components/site/SafeHtml";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStaticSlugs("journeys");
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const j = await getJourney(slug);
  if (!j) return { title: "Journey not found" };
  return buildMetadata({ title: j.seoTitle || j.title, description: j.seoDescription || j.summary, path: `/journeys/${slug}`, image: j.portrait, type: "article" });
}

async function Journey({ params }: { params: Params }) {
  const { slug } = await params;
  const j = await getJourney(slug);
  if (!j) notFound();
  const blocks: [string, string | null][] = [
    ["Starting point", j.startingPoint],
    ["The challenge", j.challenge],
    ["What they did", j.actionsTaken],
    ["Support along the way", j.supportReceived],
    ["What changed", j.currentProgress],
  ];
  return (
    <>
      {/* Identity → growth statement */}
      <Section layer="sand" className="pb-section-sm pt-36 md:pt-44" spacing="none">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Link href="/journeys" className="sv-link-underline text-small text-muted">Journeys</Link>
            <p className="mt-6 sv-eyebrow text-muted">{[j.publicName ?? "A Springvilla member", j.office?.name].filter(Boolean).join(" · ")}</p>
            <RevealText as="h1" immediate className="mt-4 text-display-l font-semibold">{j.growthStatement || j.title}</RevealText>
            {j.summary && <p className="mt-6 max-w-[52ch] text-lead text-muted">{j.summary}</p>}
          </div>
          {j.portrait && <div className="lg:col-span-5"><MediaFrame media={j.portrait} ratio="4/5" priority /></div>}
        </Container>
      </Section>
      <Section layer="milky">
        <Container className="grid gap-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            {/* Starting point → activities and effort → resulting change */}
            {blocks.filter(([, v]) => v).map(([k, v]) => (
              <section key={k}>
                <h2 className="text-display-s font-semibold">{k}</h2>
                <p className="mt-3 max-w-[62ch] whitespace-pre-line text-lead text-muted">{v}</p>
              </section>
            ))}
            {j.bodyHtml && <SafeHtml className="sv-prose" html={j.bodyHtml} />}
            {/* Optional quote */}
            {j.quote && <blockquote className="border-l-2 border-current pl-6 font-serif text-display-s italic leading-snug">&ldquo;{j.quote}&rdquo;</blockquote>}
            {j.advice && (
              <section>
                <h2 className="text-display-s font-semibold">Their advice</h2>
                <p className="mt-3 max-w-[62ch] whitespace-pre-line text-lead text-muted">{j.advice}</p>
              </section>
            )}
            {/* Related topics */}
            {j.skillsDeveloped.length > 0 && (
              <section>
                <h2 className="sv-eyebrow text-muted">Skills developed</h2>
                <ul className="mt-3 flex flex-wrap gap-2">{j.skillsDeveloped.map((x) => <li key={x} className="rounded-full bg-chip px-3 py-1 text-small">{x}</li>)}</ul>
              </section>
            )}
          </div>
          {/* Timeline of updates (appended, never overwritten) */}
          {j.updates.length > 0 && (
            <aside className="lg:col-span-5" aria-labelledby="milestones">
              <h2 id="milestones" className="text-display-s font-semibold">Timeline</h2>
              <div className="mt-8"><Timeline items={j.updates} /></div>
            </aside>
          )}
        </Container>
        <Container size="narrow" className="mt-16">
          <p className="text-small text-muted">Shared with the person&rsquo;s consent and verified by Springvilla. This is one individual&rsquo;s experience, not a typical result; outcomes depend on individual effort, access, circumstances and training.</p>
        </Container>
      </Section>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Journeys", path: "/journeys" }, { name: j.title, path: `/journeys/${slug}` }])} />
    </>
  );
}

export default function JourneyPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-sand" />}><Journey params={params} /></Suspense>;
}
