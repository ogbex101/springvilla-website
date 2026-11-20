import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("business");

export default function Page() {
  return <CmsPage pageKey="business" crumbs={[{ name: "Our System", path: "/our-system" }, { name: "Network Marketing & Business", path: "/our-system/business" }]} />;
}
