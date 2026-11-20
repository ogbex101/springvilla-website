import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { systemRegistry } from "@/components/sections/registries/system";

export const generateMetadata = () => pageMetadata("our-system");

export default function Page() {
  return <CmsPage pageKey="our-system" registry={systemRegistry} crumbs={[{ name: "Our System", path: "/our-system" }]} />;
}
