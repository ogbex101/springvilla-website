import Link from "next/link";
import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { getJourneys } from "@/lib/content/collections";
import { getPageData } from "@/lib/content/queries";
import { parseSection } from "@/lib/content/schemas";
import { ListingGrid } from "@/components/content/Listing";
import { MediaFrame } from "@/components/ui";

export const generateMetadata = () => pageMetadata("journeys");

export default async function JourneysPage() {
  const [journeys, page] = await Promise.all([getJourneys(48), getPageData("journeys")]);
  const intro = parseSection("listing_intro", page?.sections[0]?.content);
  return (
    <>
      <CmsPage pageKey="journeys" crumbs={[{ name: "Journeys", path: "/journeys" }]} />
      <ListingGrid isEmpty={!journeys.length} empty={intro.emptyText || "No journeys have been published yet."}>
        {journeys.map((j) => (
          <article key={j.id} className="group relative">
            <MediaFrame media={j.portrait} ratio="4/5" tone="cyprus" />
            <p className="mt-4 sv-eyebrow text-muted">{[j.publicName ?? "Member", j.office?.name].filter(Boolean).join(" · ")}</p>
            <h2 className="mt-2 text-[1.35rem] font-semibold"><Link href={`/journeys/${j.slug}`} className="after:absolute after:inset-0">{j.title}</Link></h2>
            {j.summary && <p className="mt-2 line-clamp-3 text-muted">{j.summary}</p>}
          </article>
        ))}
      </ListingGrid>
    </>
  );
}
