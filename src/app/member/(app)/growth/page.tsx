import Link from "next/link";
import { Suspense } from "react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { GoalsEditor } from "@/components/member/GoalsEditor";
import { PageHeader, Panel } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Growth" };

async function Growth() {
  const s = await requireMember();
  const db = await getServerClient();
  const [{ data: p }, { data: done }] = await Promise.all([
    db.from("profiles").select("goals").eq("id", s.userId).single(),
    db.from("member_progress").select("completed_at, lessons(id,title,modules(title,courses(title)))").eq("user_id", s.userId).order("completed_at", { ascending: false }).limit(50),
  ]);
  const history = (done ?? []) as unknown as { completed_at: string; lessons: { id: string; title: string; modules: { title: string; courses: { title: string } | null } | null } | null }[];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="My goals">
        <p className="mb-4 text-small text-canopy/80">Voluntary and private to you. Write what you&rsquo;d like to work on; there are no ranks or scores.</p>
        <GoalsEditor initial={(p?.goals as string[]) ?? []} />
      </Panel>
      <Panel title="Learning history">
        {history.length === 0 ? (
          <p className="text-small text-canopy/75">Lessons you complete will be listed here. <Link href="/member/learning" className="underline">Go to My Learning</Link>.</p>
        ) : (
          <ul className="divide-y divide-canopy/10">
            {history.map((h, i) => h.lessons && (
              <li key={i} className="py-2 text-small">
                <Link href={`/member/learning/${h.lessons.id}`} className="font-semibold underline-offset-4 hover:underline">{h.lessons.title}</Link>
                <span className="block text-canopy/70">{[h.lessons.modules?.courses?.title, h.lessons.modules?.title].filter(Boolean).join(" › ")} · {formatDate(h.completed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default function GrowthPage() {
  return (<><PageHeader title="My Growth" description="Your goals and the learning you've completed." /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Growth /></Suspense></>);
}
