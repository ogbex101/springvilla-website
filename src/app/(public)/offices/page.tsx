import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { getOffices } from "@/lib/content/collections";
import { getPageData } from "@/lib/content/queries";
import { parseSection } from "@/lib/content/schemas";
import { Container, Section, ButtonLink } from "@/components/ui";
import { OfficeSearch } from "@/components/content/OfficeSearch";
import { OfficeCardView } from "@/components/content/cards";
import { StaggerCards } from "@/lib/motion";

export const generateMetadata = () => pageMetadata("offices");

export default async function OfficesPage() {
  const [offices, page] = await Promise.all([getOffices(), getPageData("offices")]);
  const intro = parseSection("listing_intro", page?.sections[0]?.content);
  return (
    <>
      <CmsPage pageKey="offices" crumbs={[{ name: "Find an Office", path: "/offices" }]} />
      <Section layer="milky" spacing="sm">
        <Container>
          {offices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8">
              <p className="text-lead text-muted">{intro.emptyText}</p>
              <div className="mt-6"><ButtonLink href="/contact" variant="secondary">Send an enquiry</ButtonLink></div>
            </div>
          ) : (
            <>
              <OfficeSearch offices={offices} headingLevel={2} />
              <h2 className="mt-section-sm text-display-s font-semibold">All offices</h2>
              <StaggerCards className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {offices.map((o) => <OfficeCardView key={o.id} office={o} />)}
              </StaggerCards>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
