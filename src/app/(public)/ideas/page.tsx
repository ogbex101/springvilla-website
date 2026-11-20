import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/ui";
import { searchPosts, getCategories, PAGE_SIZE } from "@/lib/content/collections";
import { ArticleCard } from "@/components/content/cards";
import { GridSkeleton } from "@/components/content/Listing";
import { StaggerCards } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const generateMetadata = () => pageMetadata("ideas");

type SP = Promise<{ q?: string; category?: string; page?: string }>;

async function Results({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const category = sp.category || undefined;
  const page = Math.max(1, Math.min(20, Number(sp.page) || 1));
  const [{ posts, total }, categories] = await Promise.all([searchPosts(q, category, page), getCategories()]);
  const qs = (o: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ q: q || undefined, category, ...o }).forEach(([k, v]) => v !== undefined && v !== "" && u.set(k, String(v)));
    const s = u.toString();
    return s ? `/ideas?${s}` : "/ideas";
  };
  const featured = !q && !category && page === 1 ? posts.find((p) => p.featured) ?? posts[0] : null;
  const rest = posts.filter((p) => p.id !== featured?.id);
  return (
    <Section layer="milky" spacing="sm">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {categories.length > 0 && (
            <nav aria-label="Categories">
              <ul className="flex flex-wrap gap-2">
                <li><Link href={qs({ category: undefined, page: undefined })} aria-current={!category ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full border border-line px-4 text-small font-medium", !category && "bg-canopy text-white")}>All</Link></li>
                {categories.map((c) => (
                  <li key={c.slug}><Link href={qs({ category: c.slug, page: undefined })} aria-current={category === c.slug ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full border border-line px-4 text-small font-medium", category === c.slug && "bg-canopy text-white")}>{c.name}</Link></li>
                ))}
              </ul>
            </nav>
          )}
          <form role="search" action="/ideas" className="relative w-full lg:max-w-sm">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="ideas-q" className="sr-only">Search articles</label>
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 opacity-70" />
            <input id="ideas-q" name="q" type="search" defaultValue={q} placeholder="Search articles" className="min-h-12 w-full rounded-full border border-line bg-white/70 pl-12 pr-4" />
          </form>
        </div>
        <p className="mt-6 text-small text-muted" aria-live="polite">
          {q || category ? `${total} ${total === 1 ? "article" : "articles"}${q ? ` for “${q}”` : ""}` : ""}
        </p>

        {posts.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-lead text-muted">{q || category ? "No articles match that search. Try a different word or category." : "No articles have been published yet."}</p>
        ) : (
          <>
            {featured && <div className="mt-6"><ArticleCard post={featured} size="lg" /></div>}
            <StaggerCards className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <ArticleCard key={p.id} post={p} />)}
            </StaggerCards>
            {total > page * PAGE_SIZE && (
              <div className="mt-14 flex justify-center">
                <Link href={qs({ page: page + 1 })} scroll={false} className="inline-flex min-h-12 items-center rounded-full border border-current px-7 font-semibold" aria-label={`Load more articles (showing ${posts.length} of ${total})`}>
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
      </Container>
    </Section>
  );
}

export default function IdeasPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <CmsPage pageKey="ideas" crumbs={[{ name: "Ideas", path: "/ideas" }]} />
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}
