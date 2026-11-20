"use client";

import { useRef, useState } from "react";
import { UploadCloud, AlertTriangle } from "lucide-react";
import { uploadFile, formatBytes, VIDEO_WARN_BYTES } from "./upload";
import type { AdminMedia } from "@/app/admin/actions/media";
import { cn } from "@/lib/utils";

type Job = { name: string; size: number; pct: number; error?: string; done?: boolean; warn?: string };

/** Drag-and-drop multi-upload with per-file progress. */
export function Dropzone({ accept = "image/*,video/mp4,video/webm", multiple = true, bucket, replaceId, onUploaded, compact = false, label }: { accept?: string; multiple?: boolean; bucket?: string; replaceId?: string; onUploaded: (m: AdminMedia) => void; compact?: boolean; label?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const start = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, multiple ? 20 : 1);
    const base = jobs.length;
    setJobs((j) => [
      ...j,
      ...list.map((f) => ({
        name: f.name,
        size: f.size,
        pct: 0,
        warn: f.type.startsWith("video/") && f.size > VIDEO_WARN_BYTES ? "This video is over 15MB and will load slowly. Aim for a 10–20 second loop, 1080p, H.264, under 10MB (mobile: 720p, under 4MB)." : undefined,
      })),
    ]);
    list.forEach((f, i) => {
      const idx = base + i;
      const set = (patch: Partial<Job>) => setJobs((j) => j.map((x, k) => (k === idx ? { ...x, ...patch } : x)));
      uploadFile(f, { bucket, replaceId, onProgress: (pct) => set({ pct }) })
        .then((m) => {
          set({ done: true, pct: 100 });
          onUploaded(m);
        })
        .catch((e: Error) => set({ error: e.message }));
    });
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) start(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-canopy/25 bg-white text-center transition-colors", compact ? "p-4" : "p-8", over && "border-canopy bg-lime/30")}
      >
        <UploadCloud className="size-7 text-canopy/70" aria-hidden />
        <p className="mt-2 text-small font-semibold">{label ?? "Drag files here"}</p>
        <p className="text-caption text-canopy/75">or</p>
        <button type="button" onClick={() => input.current?.click()} className="mt-1 rounded-lg bg-canopy px-4 py-2 text-small font-semibold text-white">
          Choose {multiple ? "files" : "a file"}
        </button>
        <input ref={input} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => e.target.files && start(e.target.files)} />
      </div>
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-lg bg-white p-3 text-small ring-1 ring-canopy/10">
              <div className="flex justify-between gap-3">
                <span className="truncate font-medium">{j.name}</span>
                <span className="shrink-0 text-canopy/75">{j.error ? "Failed" : j.done ? "Done" : `${j.pct}%`} · {formatBytes(j.size)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canopy/10" role="progressbar" aria-valuenow={j.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${j.name}`}>
                <div className={cn("h-full rounded-full transition-[width]", j.error ? "bg-[#7a1c1c]" : "bg-canopy")} style={{ width: `${j.pct}%` }} />
              </div>
              {j.warn && !j.error && <p className="mt-2 flex gap-2 text-caption text-[#6b4a00]"><AlertTriangle className="size-4 shrink-0" aria-hidden />{j.warn}</p>}
              {j.error && <p role="alert" className="mt-2 text-caption font-medium text-[#7a1c1c]">{j.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
