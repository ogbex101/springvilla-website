"use client";

import { useState } from "react";
import { ImagePlus, X, Film } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { useMediaCache } from "./MediaCache";
import { btn } from "./ui";

export function MediaField({ id, value, onChange, kind, label, help }: { id: string; value: string | null; onChange: (v: string | null) => void; kind: "image" | "video"; label: string; help?: string }) {
  const [open, setOpen] = useState(false);
  const { get, put } = useMediaCache();
  const m = value ? get(value) : null;
  return (
    <div>
      <p id={id} className="text-small font-semibold">{label}</p>
      {help && <p className="text-caption text-canopy/75">{help}</p>}
      <div className="mt-2 flex items-center gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-canopy/10 ring-1 ring-canopy/10">
          {m ? (
            m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.thumbUrl} alt={m.alt} className="h-full w-full object-cover" />
            ) : (
              <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
            )
          ) : value ? (
            <span className="grid h-full place-items-center text-caption">Loading…</span>
          ) : (
            <span className="grid h-full place-items-center text-canopy/50">{kind === "image" ? <ImagePlus className="size-6" aria-hidden /> : <Film className="size-6" aria-hidden />}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className={btn.secondary} onClick={() => setOpen(true)} aria-describedby={id}>{value ? "Change" : "Choose"} {kind}</button>
          {value && <button type="button" className={btn.ghost} onClick={() => onChange(null)}><X className="size-4" aria-hidden /> Remove</button>}
        </div>
      </div>
      {m?.caption && <p className="mt-1 text-caption text-canopy/75">Caption: {m.caption}</p>}
      <MediaPicker open={open} kind={kind} onClose={() => setOpen(false)} onPick={(x) => { put(x); onChange(x.id); }} />
    </div>
  );
}
