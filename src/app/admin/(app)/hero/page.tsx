import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { loadSections } from "@/app/admin/actions/content";
import { PageBuilder } from "@/components/admin/PageBuilder";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";

export const metadata = { title: "Hero video" };

async function Hero() {
  await requireAdminPage("hero");
  const r = await loadSections("home");
  if (!r.ok) return <p role="alert">{r.error}</p>;
  if (!r.data.some((s) => s.section_key === "home.hero")) return <EmptyState title="The homepage hasn't been set up yet">Run <code>npm run seed</code> (see OWNER_TODO).</EmptyState>;
  return <PageBuilder pageKey="home" route="/" initial={r.data} only="home.hero" title="Homepage hero" />;
}

export default function HeroPage() {
  return (
    <>
      <PageHeader title="Hero video" description="The full-screen video at the top of the homepage. Upload the desktop video, a lighter mobile video and a poster image, then preview and publish." />
      <Panel className="mb-6 bg-lime/40">
        <h2 className="font-semibold">Getting the video right</h2>
        <ul className="mt-2 grid gap-1 text-small md:grid-cols-2">
          <li>• Desktop: a 10–20 second loop, 1080p, H.264 MP4, under <strong>10MB</strong>.</li>
          <li>• Mobile: 720p MP4 under <strong>4MB</strong>. Leave &ldquo;play on phones&rdquo; off for the fastest site.</li>
          <li>• Poster: a 1920×1080 still from the video. It shows first, so it must look good on its own.</li>
          <li>• No sound is ever played. Keep important text out of the video; the headline is real text.</li>
          <li>• Files over 15MB get a warning; the storage limit on the free plan is 50MB per file.</li>
          <li>• Use the overlay slider until the headline reads clearly over the brightest frame.</li>
        </ul>
      </Panel>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}>
        <Hero />
      </Suspense>
    </>
  );
}
