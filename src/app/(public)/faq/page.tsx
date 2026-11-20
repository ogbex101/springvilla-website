import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("faq");

export default function Page() {
  return <CmsPage pageKey="faq" crumbs={[{ name: "FAQ", path: "/faq" }]} />;
}
