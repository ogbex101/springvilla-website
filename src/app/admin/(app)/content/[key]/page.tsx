import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { loadSections } from "@/app/admin/actions/content";
import { PageBuilder } from "@/components/admin/PageBuilder";
import { PageSeoForm } from "@/components/admin/PageSeoForm";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Edit page" };

async function Editor({ params }: { params: Promise<{ key: string }> }) {
  await requireAdminPage("siteContent");
  const { key } = await params;
  const db = await getServerClient();
  const { data: page } = await db.from("pages").select("key,route,title,seo_title,seo_description,og_image_asset_id,noindex").eq("key", key).maybeSingle();
  if (!page) notFound();
  const sections = await loadSections(key);
  return (
    <>
      <PageHeader title={page.title} description={<>Live at <a className="underline" href={page.route} target="_blank" rel="noopener">{page.route}</a>. Save a draft to preview it; Publish updates the live page instantly.</>} back={{ href: "/admin/content", label: "All pages" }} />
      <PageSeoForm pageKey={key} initial={{ seo_title: page.seo_title, seo_description: page.seo_description, og_image_asset_id: page.og_image_asset_id, noindex: page.noindex }} />
      {sections.ok ? <PageBuilder pageKey={key} route={page.route} initial={sections.data} /> : <p role="alert">{sections.error}</p>}
    </>
  );
}

export default function EditPage({ params }: { params: Promise<{ key: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}>
      <Editor params={params} />
    </Suspense>
  );
}
