"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Media } from "@/lib/content/media-types";
import { prefersReducedMotion, saveDataEnabled } from "@/lib/motion/useReducedMotion";

/** Short muted loop for inner-page heroes, attached after load; with a pause control. */
export function HeroLoop({ video, poster }: { video: Media; poster: Media | null }) {
  const [on, setOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (prefersReducedMotion() || saveDataEnabled() || window.matchMedia("(max-width: 767px)").matches) return;
    const go = () => setTimeout(() => setOn(true), 200);
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  if (!on) return null;
  return (
    <>
      <video ref={ref} className="absolute inset-0 -z-[5] h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[on=true]:opacity-100" data-on={playing} autoPlay muted loop playsInline preload="metadata" poster={poster?.url} aria-hidden onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}>
        <source src={video.url} type={video.mime} />
      </video>
      <button type="button" onClick={() => (ref.current?.paused ? ref.current.play() : ref.current?.pause())} className="absolute bottom-6 right-6 z-20 inline-flex size-11 items-center justify-center rounded-full border border-white/40 bg-canopy/40 text-white backdrop-blur-md" aria-label={playing ? "Pause background video" : "Play background video"}>
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
    </>
  );
}
