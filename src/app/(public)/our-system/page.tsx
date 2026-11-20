import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("our-system");

export default function Page() {
  return <CmsPage pageKey="our-system" crumbs={[{ name: "Our System", path: "/our-system" }]} />;
}
