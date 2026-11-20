import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";

export const metadata = { title: "Site content" };

async function List() {
  await requireAdminPage("siteContent");
  const db = await getServerClient();
  const { data: pages } = await db.from("pages").select("key,route,title,updated_at").order("route");
  if (!pages?.length) return <EmptyState title="No pages yet">Run <code>npm run seed</code> to create the pages (see OWNER_TODO).</EmptyState>;
  return (
    <Panel className="p-0 md:p-0">
      <ul className="divide-y divide-canopy/10">
        {pages.map((p) => (
          <li key={p.key}>
            <Link href={`/admin/content/${p.key}`} className="flex min-h-14 items-center justify-between gap-4 px-5 py-3 hover:bg-sand/60">
              <span>
                <span className="block font-semibold">{p.title}</span>
                <span className="text-caption text-canopy/70">{p.route}</span>
              </span>
              <ChevronRight className="size-4 text-canopy/60" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ContentPage() {
  return (
    <>
      <PageHeader title="Site content" description="Every heading, paragraph, button, image and video on the site. Choose a page to edit its sections." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}>
        <List />
      </Suspense>
    </>
  );
}
