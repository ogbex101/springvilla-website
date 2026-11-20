import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { SafeHtml } from "@/components/site/SafeHtml";
import { formatDate } from "@/lib/utils";

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("blog");
  const { id } = await params;
  const db = await getServerClient();
  const { data: p } = await db.from("blog_posts").select("title,excerpt,body_html,key_takeaways,author_name,status,published_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-[760px] rounded-xl bg-milky p-6 md:p-12">
      <p className="mb-6 inline-block rounded-full bg-lime px-3 py-1 text-caption font-semibold">Preview · status: {p.status}</p>
      <h1 className="text-display-m font-semibold">{p.title}</h1>
      {p.excerpt && <p className="mt-4 text-lead text-canopy/80">{p.excerpt}</p>}
      <p className="mt-4 text-small text-canopy/75">{[p.author_name, p.published_at ? formatDate(p.published_at) : "Not scheduled"].filter(Boolean).join(" · ")}</p>
      {p.key_takeaways?.length > 0 && (
        <aside className="mt-8 rounded-xl bg-canopy/8 p-6"><h2 className="sv-eyebrow">Key takeaways</h2><ul className="mt-3 list-disc pl-5">{p.key_takeaways.map((k: string) => <li key={k}>{k}</li>)}</ul></aside>
      )}
      <SafeHtml className="sv-prose mt-10" html={p.body_html} />
    </article>
  );
}

export default function ArticlePreview({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><Preview params={params} /></Suspense>;
}
