import { CmsPage } from "@/components/site/CmsPage";
import { pageMetadata } from "@/lib/seo";
import { contactRegistry } from "@/components/sections/registries/contact";

export const generateMetadata = () => pageMetadata("contact");

export default function Page() {
  return <CmsPage pageKey="contact" registry={contactRegistry} crumbs={[{ name: "Contact", path: "/contact" }]} />;
}
