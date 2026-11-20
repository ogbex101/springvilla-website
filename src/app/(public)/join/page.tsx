import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("join");

export default function Page() {
  return <CmsPage pageKey="join" crumbs={[{ name: "Join Springvilla", path: "/join" }]} />;
}
