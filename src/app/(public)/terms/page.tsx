import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("terms");

export default function Page() {
  return <CmsPage pageKey="terms" crumbs={[{ name: "Terms", path: "/terms" }]} />;
}
