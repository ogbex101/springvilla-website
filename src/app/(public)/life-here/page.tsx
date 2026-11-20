import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("life-here");

export default function Page() {
  return <CmsPage pageKey="life-here" crumbs={[{ name: "Life Here", path: "/life-here" }]} />;
}
