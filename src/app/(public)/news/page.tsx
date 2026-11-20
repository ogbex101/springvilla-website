import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { getNews } from "@/lib/content/collections";
import { getPageData } from "@/lib/content/queries";
import { parseSection } from "@/lib/content/schemas";
import { ListingGrid } from "@/components/content/Listing";
import { NewsCard } from "@/components/content/cards";

export const generateMetadata = () => pageMetadata("news");

export default async function NewsPage() {
  const [items, page] = await Promise.all([getNews(48), getPageData("news")]);
  const intro = parseSection("listing_intro", page?.sections[0]?.content);
  return (
    <>
      <CmsPage pageKey="news" crumbs={[{ name: "News", path: "/news" }]} />
      <ListingGrid isEmpty={!items.length} empty={intro.emptyText || "No news yet."}>
        {items.map((n) => <NewsCard key={n.id} item={n} />)}
      </ListingGrid>
    </>
  );
}
