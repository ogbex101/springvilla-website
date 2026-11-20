import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOffice, getUpcomingEvents, getNews, getStaticSlugs } from "@/lib/content/collections";
import { OfficeLayout } from "@/components/content/OfficeLayout";
import { buildMetadata } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStaticSlugs("offices");
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const o = await getOffice(slug);
  if (!o) return { title: "Office not found" };
  return buildMetadata({ title: o.seoTitle || `${o.name}${o.city ? `, ${o.city}` : ""}`, description: o.seoDescription || o.summary, path: `/offices/${slug}`, image: o.hero });
}

async function OfficeView({ params }: { params: Params }) {
  const { slug } = await params;
  const o = await getOffice(slug);
  if (!o) notFound();
  const [events, news] = await Promise.all([getUpcomingEvents(4, slug), getNews(4, true, slug)]);
  return <OfficeLayout o={o} events={events} news={news} slug={slug} />;
}

export default function OfficePage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="min-h-[80vh] bg-canopy" />}><OfficeView params={params} /></Suspense>;
}
