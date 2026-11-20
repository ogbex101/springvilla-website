import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container, Section, MediaFrame } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { getNewsItem, getStaticSlugs } from "@/lib/content/collections";
import { JsonLd } from "@/components/site/JsonLd";
import { SafeHtml } from "@/components/site/SafeHtml";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";
import { formatDate, siteUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStaticSlugs("news");
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const n = await getNewsItem(slug);
  if (!n) return { title: "News not found" };
  return buildMetadata({ title: n.seoTitle || n.title, description: n.seoDescription || n.summary, path: `/news/${slug}`, image: n.cover, type: "article", publishedTime: n.publishedAt ?? undefined });
}

async function Item({ params }: { params: Params }) {
  const { slug } = await params;
  const n = await getNewsItem(slug);
  if (!n) notFound();
  return (
    <>
      <Section layer="milky" className="pb-10 pt-36 md:pt-44" spacing="none">
        <Container size="narrow">
          <Link href="/news" className="sv-link-underline text-small text-muted">News</Link>
          <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold">{n.title}</RevealText>
          <p className="mt-6 text-small text-muted">{[n.office?.name, n.publishedAt ? formatDate(n.publishedAt) : null].filter(Boolean).join(" · ")}</p>
        </Container>
      </Section>
      {n.cover && <Container size="wide"><MediaFrame media={n.cover} ratio="21/9" priority sizes="100vw" /></Container>}
      <Section layer="milky" spacing="sm">
        <Container size="narrow"><SafeHtml className="sv-prose" html={n.bodyHtml} /></Container>
      </Section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title, datePublished: n.publishedAt ?? undefined, mainEntityOfPage: siteUrl(`/news/${slug}`), publisher: { "@type": "Organization", name: "Springvilla" } }} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "News", path: "/news" }, { name: n.title, path: `/news/${slug}` }])} />
    </>
  );
}

export default function NewsItemPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-milky" />}><Item params={params} /></Suspense>;
}
