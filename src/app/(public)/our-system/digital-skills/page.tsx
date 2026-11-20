import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("digital-skills");

export default function Page() {
  return <CmsPage pageKey="digital-skills" crumbs={[{ name: "Our System", path: "/our-system" }, { name: "Digital Skills & Freelancing", path: "/our-system/digital-skills" }]} />;
}
