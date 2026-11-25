"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import type { Media } from "@/lib/content/media-types";
import { prefersReducedMotion, saveDataEnabled } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Muted background loop for a section. The poster renders on the server; the
 * video is attached only when the section nears the viewport, plays only while
 * visible, and never loads for reduced-motion or data-saver users. A brand-tinted
 * overlay keeps text contrast at AA whatever the footage does.
 */
export function BackgroundVideo({
  video,
  poster,
  overlay = 78,
  className,
}: {
  video: Media | null;
  poster: Media | null;
  /** Canopy overlay opacity, 0–95. */
  overlay?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [attach, setAttach] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    if (!video || prefersReducedMotion() || saveDataEnabled()) return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setAttach(true);
        const v = vid.current;
        if (!v) return;
        if (e.isIntersecting && !userPaused) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [video, userPaused]);

  const o = Math.min(95, Math.max(0, overlay)) / 100;
  return (
    <>
    <div ref={wrap} aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {poster && <Image src={poster.url} alt="" fill sizes="100vw" className="scale-105 object-cover" placeholder={poster.blurDataUrl ? "blur" : "empty"} blurDataURL={poster.blurDataUrl ?? undefined} />}
      {attach && video && (
        <video
          ref={vid}
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-opacity duration-[1200ms] ease-out data-[on=true]:opacity-100"
          data-on={playing}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster={poster?.url}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src={video.url} type={video.mime} />
        </video>
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgb(45 62 44 / ${o}) 0%, rgb(45 62 44 / ${Math.min(0.97, o + 0.08)}) 100%)` }} />
      <div className="sv-grain absolute inset-0" />
    </div>
      {attach && video && (
        <button
          type="button"
          onClick={() => {
            const v = vid.current;
            if (!v) return;
            if (v.paused) {
              setUserPaused(false);
              v.play().catch(() => {});
            } else {
              setUserPaused(true);
              v.pause();
            }
          }}
          className="absolute bottom-6 right-6 z-20 inline-flex size-11 items-center justify-center rounded-full border border-white/35 bg-canopy/50 text-white backdrop-blur-md transition-colors hover:bg-canopy/80"
          aria-label={playing ? "Pause background video" : "Play background video"}
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      )}
    </>
  );
}
