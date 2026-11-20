import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";

type Course = { id: string; title: string; summary: string | null; modules: { id: string; title: string; sort_order: number; lessons: { id: string; title: string; sort_order: number; status: string; duration_minutes: number | null }[] }[] };

async function List() {
  const s = await requireMember();
  const db = await getServerClient();
  const [{ data }, { data: prog }] = await Promise.all([
    db.from("courses").select("id,title,summary,modules(id,title,sort_order,lessons(id,title,sort_order,status,duration_minutes))").eq("status", "published").order("sort_order"),
    db.from("member_progress").select("lesson_id").eq("user_id", s.userId),
  ]);
  const done = new Set((prog ?? []).map((p) => p.lesson_id));
  const courses = (data ?? []) as unknown as Course[];
  if (!courses.length) return <EmptyState title="No courses yet">Courses will appear here when they are published.</EmptyState>;
  return (
    <div className="space-y-6">
      {courses.map((c) => {
        const lessons = c.modules.flatMap((m) => m.lessons.filter((l) => l.status === "published"));
        const complete = lessons.filter((l) => done.has(l.id)).length;
        return (
          <section key={c.id} className="rounded-xl bg-white p-5 ring-1 ring-canopy/10" aria-labelledby={`c-${c.id}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id={`c-${c.id}`} className="text-[1.3rem] font-semibold">{c.title}</h2>{c.summary && <p className="text-small text-canopy/80">{c.summary}</p>}</div>
              <p className="text-small font-semibold">{complete}/{lessons.length} complete</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-canopy/10" role="progressbar" aria-valuenow={complete} aria-valuemax={lessons.length || 1} aria-label={`${c.title} progress`}><div className="h-full rounded-full bg-canopy" style={{ width: `${lessons.length ? (complete / lessons.length) * 100 : 0}%` }} /></div>
            <ol className="mt-4 space-y-4">
              {[...c.modules].sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                <li key={m.id}>
                  <h3 className="font-semibold">{m.title}</h3>
                  <ul className="mt-1 divide-y divide-canopy/10">
                    {m.lessons.filter((l) => l.status === "published").sort((a, b) => a.sort_order - b.sort_order).map((l) => (
                      <li key={l.id}>
                        <Link href={`/member/learning/${l.id}`} className="flex min-h-11 items-center gap-3 py-2 text-small hover:underline">
                          {done.has(l.id) ? <CheckCircle2 className="size-5 text-canopy" aria-label="Completed" /> : <Circle className="size-5 text-canopy/40" aria-label="Not started" />}
                          <span className="flex-1">{l.title}</span>
                          {l.duration_minutes ? <span className="text-canopy/70">{l.duration_minutes} min</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
export default function Learning() {
  return (<><PageHeader title="My learning" /><Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><List /></Suspense></>);
}
