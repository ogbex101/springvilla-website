"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Media } from "@/lib/content/media-types";
import type { SectionContent } from "@/lib/content/schemas";
import { hasCta } from "@/lib/content/fields";
import { BrandField } from "@/components/ui/BrandField";
import { renderHighlighted } from "@/components/ui/DisplayHeading";
import { gsap, SplitText, useGSAP, markReady } from "@/lib/motion/gsap";
import { prefersReducedMotion, saveDataEnabled } from "@/lib/motion/useReducedMotion";
import { useSmoothScroll } from "@/lib/motion/SmoothScroll";
import { MagneticButton } from "@/lib/motion/MagneticButton";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type Props = {
  content: SectionContent<"home.hero">;
  poster: Media | null;
  videoDesktop: Media | null;
  videoDesktopWebm: Media | null;
  videoMobile: Media | null;
};

type Sources = { src: string; type: string }[];

/**
 * 01 Hero. The poster <Image priority> is the LCP element and is preloaded.
 * The <video> is attached only after load + idle, never on reduced motion or
 * Save-Data, and on phones only when the admin allows the mobile clip.
 */
export function Hero({ content, poster, videoDesktop, videoDesktopWebm, videoMobile }: Props) {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sources, setSources] = useState<Sources | null>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);
  const scroll = useSmoothScroll();

  // Decide whether (and which) video to load, after first paint.
  useEffect(() => {
    if (prefersReducedMotion() || saveDataEnabled()) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    let list: Sources = [];
    if (mobile) {
      if (content.allowMobileVideo && videoMobile) list = [{ src: videoMobile.url, type: videoMobile.mime }];
    } else {
      if (videoDesktopWebm) list.push({ src: videoDesktopWebm.url, type: "video/webm" });
      if (videoDesktop) list.push({ src: videoDesktop.url, type: videoDesktop.mime || "video/mp4" });
      if (!list.length && videoMobile) list = [{ src: videoMobile.url, type: videoMobile.mime }];
    }
    if (!list.length) return;
    const start = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => setSources(list), { timeout: 1500 });
      else setTimeout(() => setSources(list), 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [content.allowMobileVideo, videoDesktop, videoDesktopWebm, videoMobile]);

  // Play only while the hero is on screen.
  useEffect(() => {
    const v = videoRef.current;
    const el = root.current;
    if (!v || !el || !sources) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) void v.play().catch(() => {});
        else if (!entry.isIntersecting) v.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sources]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      void v.play();
      track("hero_video_play", { manual: true });
    } else {
      userPaused.current = true;
      v.pause();
      track("hero_video_pause");
    }
  }, []);

  // Entrance + scroll hand-off.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const gated = q("[data-reveal]");
      if (prefersReducedMotion()) {
        gated.forEach(markReady);
        return;
      }
      const split = SplitText.create(q("[data-hero-title]")[0], { type: "lines", mask: "lines", linesClass: "sv-split-line" });
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(q("[data-hero-eyebrow]"), { opacity: 0, y: 12, duration: 0.6 }, 0)
        .from(split.lines, { yPercent: 110, rotate: 2, transformOrigin: "0% 100%", duration: 1, stagger: 0.08 }, 0.12)
        .from(q("[data-hero-after]"), { opacity: 0, y: 24, duration: 0.8, stagger: 0.08, ease: "power3.out" }, 0.6)
        .from(q("[data-hero-badge]"), { opacity: 0, scale: 0.6, rotate: -40, duration: 1, ease: "expo.out" }, 1.1);
      gated.forEach(markReady);

      // Scroll: media scales and darkens, copy drifts up and fades.
      const st = { trigger: el, start: "top top", end: "bottom top", scrub: true };
      gsap.to(q("[data-hero-media]"), { scale: 1.08, ease: "none", scrollTrigger: st });
      gsap.to(q("[data-hero-dim]"), { opacity: 0.45, ease: "none", scrollTrigger: st });
      gsap.to(q("[data-hero-copy]"), { yPercent: -30, opacity: 0, ease: "none", scrollTrigger: { ...st, end: "70% top" } });
      return () => split.revert();
    },
    { scope: root },
  );

  const onCta = (href: string, id: string) => (e: React.MouseEvent) => {
    track("cta_click", { id });
    if (href.startsWith("#")) {
      e.preventDefault();
      scroll.scrollTo(href, { offset: 0 });
      history.replaceState(null, "", href);
    }
  };

  const overlay = Math.min(80, Math.max(0, content.overlay)) / 100;

  return (
    <section ref={root} data-layer="canopy" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
      {/* Media layer */}
      <div data-hero-media className="absolute inset-0 -z-10 will-change-transform">
        {poster ? (
          <Image src={poster.url} alt={poster.alt} fill priority fetchPriority="high" sizes="100vw" className="object-cover" placeholder={poster.blurDataUrl ? "blur" : "empty"} blurDataURL={poster.blurDataUrl ?? undefined} />
        ) : (
          <BrandField />
        )}
        {sources && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster?.url}
            aria-hidden
            onPlaying={() => {
              setPlaying(true);
              track("hero_video_play");
            }}
            onPause={() => setPlaying(false)}
          >
            {sources.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        )}
        {/* Readability: Fresh Canopy gradient from bottom-left (admin slider) + grain */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(20deg, rgb(45 62 44 / ${Math.min(1, overlay + 0.35)}) 0%, rgb(45 62 44 / ${overlay}) 40%, rgb(45 62 44 / ${overlay * 0.35}) 75%, rgb(45 62 44 / ${overlay * 0.2}) 100%)`,
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canopy/50 to-transparent" />
        <div className="sv-grain absolute inset-0 overflow-hidden" />
        <div data-hero-dim className="absolute inset-0 bg-[#0e150e] opacity-0" />
      </div>

      {/* Copy layer: real HTML, never baked into the video */}
      <div data-hero-copy className="mx-auto w-full max-w-[1440px] px-gutter pb-[max(5rem,12svh)] pt-32">
        {content.eyebrow && (
          <p data-hero-eyebrow data-reveal className="sv-eyebrow flex items-center gap-3 text-lime">
            <span aria-hidden className="h-px w-8 bg-current" />
            {content.eyebrow}
          </p>
        )}
        <h1 id="hero-title" data-hero-title data-reveal className="mt-6 max-w-[14ch] text-display-xl font-semibold text-white">
          {renderHighlighted(content.headline || " ", content.highlight)}
        </h1>
        {content.body && (
          <p data-hero-after data-reveal className="mt-7 max-w-[42ch] text-lead text-white/88">
            {content.body}
          </p>
        )}
        <div data-hero-after data-reveal className="mt-9 flex flex-wrap items-center gap-3">
          {hasCta(content.primaryCta) && (
            <MagneticButton>
              <Link href={content.primaryCta.href} onClick={onCta(content.primaryCta.href, "hero-primary")} className="group/btn inline-flex min-h-13 items-center gap-3 rounded-full bg-lime px-7 py-3.5 font-semibold text-canopy transition-shadow hover:shadow-lift">
                {content.primaryCta.label}
                <SlideArrow />
              </Link>
            </MagneticButton>
          )}
          {hasCta(content.secondaryCta) && (
            <Link href={content.secondaryCta.href} onClick={onCta(content.secondaryCta.href, "hero-secondary")} className="group/btn inline-flex min-h-13 items-center gap-3 rounded-full border border-white/40 px-7 py-3.5 font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/10">
              {content.secondaryCta.label}
              <SlideArrow />
            </Link>
          )}
        </div>
      </div>

      {/* Rotating badge (decorative) */}
      {content.badge && (
        <div data-hero-badge data-reveal aria-hidden className="pointer-events-none absolute bottom-8 right-[max(1rem,var(--spacing-gutter))] hidden size-32 md:block lg:size-36">
          <svg viewBox="0 0 120 120" className="size-full animate-spin-slow text-lime motion-reduce:animate-none">
            <defs>
              <path id="hero-badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
            </defs>
            <text className="fill-current text-[10.5px] font-semibold uppercase tracking-[0.32em]">
              <textPath href="#hero-badge-circle">{content.badge.repeat(content.badge.length < 18 ? 2 : 1)}</textPath>
            </text>
          </svg>
          <ArrowUpRight className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rotate-[135deg] text-white" />
        </div>
      )}

      {sources && (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "absolute bottom-6 left-[max(1rem,var(--spacing-gutter))] inline-flex size-11 items-center justify-center rounded-full border border-white/40 bg-canopy/40 text-white backdrop-blur-md transition-colors hover:bg-canopy/70 md:bottom-8",
          )}
          aria-label={playing ? "Pause background video" : "Play background video"}
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      )}
    </section>
  );
}

function SlideArrow() {
  return (
    <span aria-hidden className="relative inline-flex size-4 overflow-hidden">
      <ArrowRight className="absolute inset-0 size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-full" />
      <ArrowRight className="absolute inset-0 size-4 -translate-x-full transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0" />
    </span>
  );
}
