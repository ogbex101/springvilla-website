import { notFound } from "next/navigation";
import { getPageData } from "@/lib/content/queries";
import { PageSections } from "@/components/sections/SectionRenderer";
import { JsonLd } from "./JsonLd";
import { breadcrumbLd } from "@/lib/seo";

/** Renders a database-driven page by key. */
export async function CmsPage({ pageKey, subnav = false, crumbs }: { pageKey: string; subnav?: boolean; crumbs?: { name: string; path: string }[] }) {
  const page = await getPageData(pageKey);
  if (!page) notFound();
  return (
    <>
      <PageSections page={page} subnav={subnav} />
      {crumbs && <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, ...crumbs])} />}
    </>
  );
}
