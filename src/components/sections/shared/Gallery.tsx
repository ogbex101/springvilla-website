"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Media } from "@/lib/content/media-types";
import { useSmoothScroll } from "@/lib/motion/SmoothScroll";
import { StaggerCards } from "@/lib/motion";

/** Captioned photo grid with an accessible lightbox (Esc, arrows, focus return). */
export function Gallery({ images }: { images: Media[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useSmoothScroll();
  const openAt = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
    scroll.stop();
  };
  const close = useCallback(() => {
    dialog.current?.close();
    setIndex(null);
    scroll.start();
  }, [scroll]);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index !== null ? images[index] : null;
  return (
    <>
      <StaggerCards as="ul" className="mt-14 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
        {images.map((m, i) => (
          <li key={m.id}>
            <figure>
              <button type="button" onClick={() => openAt(i)} className="group block w-full overflow-hidden rounded-lg" aria-label={`Open photo: ${m.caption || m.alt}`}>
                <Image src={m.url} alt={m.alt} width={m.width ?? 1200} height={m.height ?? 900} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.04]" placeholder={m.blurDataUrl ? "blur" : "empty"} blurDataURL={m.blurDataUrl ?? undefined} />
              </button>
              {m.caption && <figcaption className="mt-2 text-small text-muted">{m.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </StaggerCards>
      <dialog ref={dialog} onClose={close} onClick={(e) => e.target === dialog.current && close()} className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 backdrop:bg-[#0c120c]/92" aria-label="Photo viewer">
        {current && (
          <div className="flex h-full flex-col items-center justify-center p-4 text-white md:p-10">
            <div className="relative h-[75vh] w-full max-w-6xl">
              <Image src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" />
            </div>
            <p className="mt-4 max-w-3xl text-center text-small text-white/85">
              {current.caption}
              {current.credit && <span className="text-white/65"> · Photo: {current.credit}</span>}
            </p>
            <div className="absolute right-4 top-4 flex gap-2">
              <button type="button" onClick={close} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photo viewer">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo">
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button type="button" onClick={() => step(1)} className="absolute right-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo">
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
