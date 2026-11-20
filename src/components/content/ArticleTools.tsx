"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Check } from "lucide-react";
import { track } from "@/lib/analytics/client";

/** Reading progress bar; fires `article_read` once at 75% scroll of the article body. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.5;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (p >= 0.75 && !fired.current) {
        fired.current = true;
        track("article_read");
      }
    };
    const on = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[55] h-1">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-lime" />
    </div>
  );
}

export function ShareLinks({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: "X", href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sv-eyebrow text-muted">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-small hover:bg-chip">
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked */
          }
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-small hover:bg-chip"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}

/** Fires a single analytics event when mounted (e.g. event_view, office_view). */
export function TrackView({ event, id }: { event: "event_view" | "office_view"; id: string }) {
  useEffect(() => {
    track(event, { id });
  }, [event, id]);
  return null;
}
