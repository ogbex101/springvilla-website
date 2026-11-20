import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { fetchMedia } from "@/lib/content/queries";
import { SafeHtml } from "@/components/site/SafeHtml";
import { LessonToggle } from "@/components/member/MemberClient";

async function Lesson({ params }: { params: Promise<{ lesson: string }> }) {
  const s = await requireMember();
  const { lesson } = await params;
  const db = await getServerClient();
  const { data: l } = await db.from("lessons").select("id,title,body_html,video_asset_id,duration_minutes,modules(title,courses(title))").eq("id", lesson).eq("status", "published").maybeSingle();
  if (!l) notFound();
  const { data: p } = await db.from("member_progress").select("lesson_id").eq("user_id", s.userId).eq("lesson_id", lesson).maybeSingle();
  const video = l.video_asset_id ? (await fetchMedia(db, [l.video_asset_id]))[l.video_asset_id] : null;
  const mod = l.modules as unknown as { title: string; courses: { title: string } } | null;
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/member/learning" className="text-small underline">← My learning</Link>
      <p className="mt-4 text-small text-canopy/75">{mod?.courses?.title} › {mod?.title}</p>
      <h1 className="mt-1 text-[2rem] font-semibold leading-tight">{l.title}</h1>
      {video && <video src={video.url} controls preload="metadata" className="mt-6 w-full rounded-xl bg-black" />}
      <SafeHtml className="sv-prose mt-6" html={l.body_html} />
      <div className="mt-8 rounded-xl bg-white p-4 ring-1 ring-canopy/10"><LessonToggle id={l.id} done={Boolean(p)} /></div>
    </article>
  );
}
export default function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-canopy/5" />}><Lesson params={params} /></Suspense>;
}
