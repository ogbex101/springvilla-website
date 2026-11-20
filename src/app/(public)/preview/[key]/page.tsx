import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getPreviewPageData } from "@/lib/content/queries";
import { PageSections, type Registry } from "@/components/sections/SectionRenderer";
import { sharedRegistry } from "@/components/sections/registries/shared";
import { homeRegistry } from "@/components/sections/registries/home";
import { systemRegistry } from "@/components/sections/registries/system";
import { joinRegistry } from "@/components/sections/registries/join";
import { contactRegistry } from "@/components/sections/registries/contact";

export const metadata = { title: "Draft preview", robots: { index: false, follow: false } };

/** Every section type, so any page's drafts can be previewed here. */
const previewRegistry: Registry = { ...sharedRegistry, ...systemRegistry, ...joinRegistry, ...contactRegistry, ...homeRegistry };

async function Preview({ params }: { params: Promise<{ key: string }> }) {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.needsMfa) redirect("/admin/mfa");
  if (!can(s.roles, "siteContent")) notFound();
  const { key } = await params;
  const page = await getPreviewPageData(key);
  if (!page) notFound();
  return <PageSections page={page} registry={previewRegistry} />;
}

/**
 * Admin-only draft preview, shown in the page editor's preview frame.
 * Reads drafts directly (no Draft Mode), so public pages are never affected.
 */
export default function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  return (
    <Suspense fallback={<p className="p-8" role="status">Loading preview…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}
