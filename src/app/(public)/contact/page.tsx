import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("contact");

export default function Page() {
  return <CmsPage pageKey="contact" crumbs={[{ name: "Contact", path: "/contact" }]} />;
}
