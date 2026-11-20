import { notFound } from "next/navigation";
import { Fragment } from "react";
import { getChrome, getPageData, type SectionRow } from "@/lib/content/queries";
import { RenderSection } from "@/components/sections/SectionRenderer";
import { ColourShift } from "@/lib/motion";
import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

export const generateMetadata = () => pageMetadata("home");

const LIGHT = new Set(["milky", "sand"]);

/** Group consecutive light sections so their backgrounds morph (ColourShift) instead of cutting. */
function group(sections: SectionRow[]) {
  const out: SectionRow[][] = [];
  for (const s of sections) {
    const last = out[out.length - 1];
    if (last && LIGHT.has(s.layer) && LIGHT.has(last[last.length - 1].layer) && s.key !== "home.hero") last.push(s);
    else out.push([s]);
  }
  return out;
}

export default async function HomePage() {
  const [page, chrome] = await Promise.all([getPageData("home"), getChrome()]);
  if (!page) notFound();
  return (
    <>
      {page.preview && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-lime px-5 py-2 text-small font-semibold text-canopy shadow-lift">
          Draft preview
        </div>
      )}
      {group(page.sections).map((g) =>
        g.length > 1 ? (
          <ColourShift key={g[0].id}>
            {g.map((s) => (
              <RenderSection key={s.id} section={s} media={page.media} />
            ))}
          </ColourShift>
        ) : (
          <Fragment key={g[0].id}>
            <RenderSection section={g[0]} media={page.media} />
          </Fragment>
        ),
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: chrome.siteName,
          url: siteUrl("/"),
          ...(chrome.logo ? { logo: chrome.logo.url } : {}),
          ...(chrome.footer.legalName ? { legalName: chrome.footer.legalName } : {}),
          ...(chrome.contact.email ? { email: chrome.contact.email } : {}),
          ...(chrome.social.length ? { sameAs: chrome.social.map((s) => s.url) } : {}),
          parentOrganization: { "@type": "Organization", name: "FHG" },
        }}
      />
    </>
  );
}
