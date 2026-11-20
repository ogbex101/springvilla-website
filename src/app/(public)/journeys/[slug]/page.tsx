import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container, Section, MediaFrame } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { getJourney } from "@/lib/content/collections";
import { Timeline } from "@/components/content/Timeline";
import { JsonLd } from "@/components/site/JsonLd";
import { SafeHtml } from "@/components/site/SafeHtml";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

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
  return (
    <>
      <Section layer="sand" className="pb-section-sm pt-36 md:pt-44" spacing="none">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Link href="/journeys" className="sv-link-underline text-small text-muted">Journeys</Link>
            <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold">{j.title}</RevealText>
            <p className="mt-6 sv-eyebrow text-muted">{[j.publicName ?? "Member", j.office?.name].filter(Boolean).join(" · ")}</p>
            {j.summary && <p className="mt-6 max-w-[52ch] text-lead text-muted">{j.summary}</p>}
          </div>
          {j.portrait && <div className="lg:col-span-5"><MediaFrame media={j.portrait} ratio="4/5" priority /></div>}
        </Container>
      </Section>
      <Section layer="milky">
        <Container className="grid gap-12 lg:grid-cols-12">
          <SafeHtml className="sv-prose lg:col-span-7" html={j.bodyHtml} />
          {j.updates.length > 0 && (
            <aside className="lg:col-span-5" aria-labelledby="milestones">
              <h2 id="milestones" className="text-display-s font-semibold">Milestones</h2>
              <div className="mt-8"><Timeline items={j.updates} /></div>
            </aside>
          )}
        </Container>
        <Container size="narrow" className="mt-16">
          <p className="text-small text-muted">This journey is shared with the person&rsquo;s consent and has been verified by Springvilla. Everyone&rsquo;s progress is different; no outcome is guaranteed.</p>
        </Container>
      </Section>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Journeys", path: "/journeys" }, { name: j.title, path: `/journeys/${slug}` }])} />
    </>
  );
}

export default function JourneyPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-sand" />}><Journey params={params} /></Suspense>;
}
