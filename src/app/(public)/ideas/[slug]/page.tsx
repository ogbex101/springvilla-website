import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Container, Section, MediaFrame } from "@/components/ui";
import { RevealImage, RevealText } from "@/lib/motion";
import { getPost, getRelatedPosts, getStaticSlugs } from "@/lib/content/collections";
import { ArticleCard } from "@/components/content/cards";
import { ReadingProgress, ShareLinks } from "@/components/content/ArticleTools";
import { JsonLd } from "@/components/site/JsonLd";
import { SafeHtml } from "@/components/site/SafeHtml";
import { buildMetadata, breadcrumbLd } from "@/lib/seo";
import { formatDate, siteUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStaticSlugs("posts");
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found" };
  return buildMetadata({ title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, path: `/ideas/${slug}`, image: post.ogImage, type: "article", publishedTime: post.publishedAt, modifiedTime: post.updatedAt });
}

async function Article({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { related, next } = await getRelatedPosts(slug, post.category?.slug ?? null);
  const url = siteUrl(`/ideas/${slug}`);
  return (
    <>
      <ReadingProgress targetId="article-body" />
      <Section layer="milky" className="pb-10 pt-36 md:pt-44" spacing="none">
        <Container size="narrow">
          <nav aria-label="Breadcrumb" className="text-small text-muted">
            <Link href="/ideas" className="sv-link-underline">Ideas</Link>
            {post.category && <> / <Link href={`/ideas?category=${post.category.slug}`} className="sv-link-underline">{post.category.name}</Link></>}
          </nav>
          <RevealText as="h1" immediate className="mt-6 text-display-l font-semibold">{post.title}</RevealText>
          {post.excerpt && <p className="mt-6 text-lead text-muted">{post.excerpt}</p>}
          <p className="mt-6 flex flex-wrap gap-x-3 text-small text-muted">
            {post.authorName && <span>By {post.authorName}</span>}
            <span>Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></span>
            {post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10) && <span>Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></span>}
            <span>{post.readingMinutes} min read</span>
          </p>
        </Container>
      </Section>
      {post.cover && (
        <Container size="wide">
          <RevealImage immediate>
            <MediaFrame media={post.cover} ratio="21/9" priority sizes="100vw" />
          </RevealImage>
          {post.cover.caption && <p className="mx-auto mt-3 max-w-[880px] text-caption text-muted">{post.cover.caption}</p>}
        </Container>
      )}
      <Section layer="milky" spacing="sm">
        <Container size="narrow">
          {post.keyTakeaways.length > 0 && (
            <aside className="mb-12 rounded-xl bg-chip p-6 md:p-8" aria-labelledby="takeaways">
              <h2 id="takeaways" className="sv-eyebrow">Key takeaways</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-lead">
                {post.keyTakeaways.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </aside>
          )}
          <SafeHtml id="article-body" className="sv-prose" html={post.bodyHtml} />
          {post.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => <li key={t.slug} className="rounded-full bg-chip px-3 py-1 text-caption">{t.name}</li>)}
            </ul>
          )}
          <div className="mt-12 border-t border-line pt-8"><ShareLinks title={post.title} url={url} /></div>
          {next && (
            <Link href={`/ideas/${next.slug}`} className="group mt-12 flex items-center justify-between gap-6 rounded-xl bg-canopy p-6 text-white md:p-8">
              <span><span className="sv-eyebrow text-lime">Next article</span><span className="mt-2 block text-display-s font-semibold">{next.title}</span></span>
              <ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          )}
        </Container>
      </Section>
      {related.length > 0 && (
        <Section layer="sand" spacing="sm">
          <Container>
            <h2 className="text-display-s font-semibold">Related reading</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{related.map((p) => <ArticleCard key={p.id} post={p} />)}</div>
          </Container>
        </Section>
      )}
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt ?? undefined, datePublished: post.publishedAt, dateModified: post.updatedAt, mainEntityOfPage: url, ...(post.cover ? { image: post.cover.url } : {}), ...(post.authorName ? { author: { "@type": "Person", name: post.authorName } } : { author: { "@type": "Organization", name: "Springvilla" } }), publisher: { "@type": "Organization", name: "Springvilla" } },
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Ideas", path: "/ideas" }, { name: post.title, path: `/ideas/${slug}` }]),
      ] as unknown as Record<string, unknown>[]} />
    </>
  );
}

export default function ArticlePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="min-h-[80vh] bg-milky" />}>
      <Article params={params} />
    </Suspense>
  );
}
