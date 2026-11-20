import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("discover");

export default function Page() {
  return <CmsPage pageKey="discover" subnav crumbs={[{ name: "Discover", path: "/discover" }]} />;
}
