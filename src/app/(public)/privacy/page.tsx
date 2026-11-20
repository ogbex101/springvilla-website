import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("privacy");

export default function Page() {
  return <CmsPage pageKey="privacy" crumbs={[{ name: "Privacy", path: "/privacy" }]} />;
}
