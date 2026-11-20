import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { joinRegistry } from "@/components/sections/registries/join";

export const generateMetadata = () => pageMetadata("join");

export default function Page() {
  return <CmsPage pageKey="join" registry={joinRegistry} crumbs={[{ name: "Join Springvilla", path: "/join" }]} />;
}
