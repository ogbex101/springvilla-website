"use client";

import { useState, useTransition } from "react";
import { markRead, toggleLesson, resourceLink } from "@/app/member/actions";
import { btn } from "@/components/admin/ui";

export function MarkReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className={btn.ghost} disabled={pending} onClick={() => start(() => markRead(id))}>{pending ? "Saving…" : "Mark as read"}</button>;
}

export function LessonToggle({ id, done }: { id: string; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex min-h-11 items-center gap-2 text-small font-semibold">
      <input type="checkbox" className="size-5 accent-[#2D3E2C]" checked={done} disabled={pending} onChange={(e) => start(() => toggleLesson(id, e.target.checked))} />
      {done ? "Completed" : "Mark as complete"}
    </label>
  );
}

export function ResourceButton({ id }: { id: string }) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button className={btn.secondary} disabled={pending} onClick={() => start(async () => { const url = await resourceLink(id); if (url) window.open(url, "_blank", "noopener"); else setErr("This file isn't available."); })}>{pending ? "Opening…" : "Open"}</button>
      {err && <span role="alert" className="text-caption text-[#7a1c1c]">{err}</span>}
    </>
  );
}
