import { notFound } from "next/navigation";
import { getPageData } from "@/lib/content/queries";
import { PageSections, type Registry } from "@/components/sections/SectionRenderer";
import { sharedRegistry } from "@/components/sections/registries/shared";
import { JsonLd } from "./JsonLd";
import { breadcrumbLd } from "@/lib/seo";

/** Renders a database-driven page by key. */
export async function CmsPage({ pageKey, subnav = false, crumbs, registry = sharedRegistry }: { pageKey: string; subnav?: boolean; crumbs?: { name: string; path: string }[]; registry?: Registry }) {
  const page = await getPageData(pageKey);
  if (!page) notFound();
  return (
    <>
      <PageSections page={page} registry={registry} subnav={subnav} />
      {crumbs && <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, ...crumbs])} />}
    </>
  );
}
