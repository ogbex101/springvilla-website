"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Film, AlertCircle } from "lucide-react";
import { listMedia, type AdminMedia } from "@/app/admin/actions/media";
import { Dropzone } from "./Dropzone";
import { input as inputCls, btn } from "./ui";
import { cn } from "@/lib/utils";

/** Modal picker over the media library. Images without alt text can't be chosen. */
export function MediaPicker({ open, kind, onClose, onPick }: { open: boolean; kind: "image" | "video"; onClose: () => void; onPick: (m: AdminMedia) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<AdminMedia[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const res = await listMedia({ type: kind, q });
      if (res.ok) setItems(res.data);
      else setError(res.error);
    }, 200);
    return () => clearTimeout(t);
  }, [open, q, kind]);

  return (
    <dialog ref={dialog} onClose={onClose} className="m-auto w-[min(96vw,980px)] rounded-xl bg-sand p-0 text-canopy backdrop:bg-black/50" aria-label={`Choose ${kind}`}>
      <div className="flex items-center justify-between border-b border-canopy/10 p-4">
        <h2 className="font-semibold">Choose {kind === "image" ? "an image" : "a video"}</h2>
        <button onClick={onClose} className={btn.ghost} aria-label="Close"><X className="size-5" aria-hidden /></button>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_260px]">
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alt text, caption, location…" className={cn(inputCls, "pl-9")} aria-label="Search media" />
          </div>
          {error && <p role="alert" className="mt-3 text-small text-[#7a1c1c]">{error}</p>}
          <ul className="mt-4 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {items === null && <li className="col-span-full text-small">Loading…</li>}
            {items?.length === 0 && <li className="col-span-full text-small text-canopy/75">Nothing here yet. Upload on the right.</li>}
            {items?.map((m) => {
              const blocked = m.type === "image" && !m.alt.trim();
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      onPick(m);
                      onClose();
                    }}
                    className="group block w-full overflow-hidden rounded-lg bg-white text-left ring-1 ring-canopy/10 hover:ring-canopy disabled:cursor-not-allowed"
                  >
                    <div className="relative aspect-[4/3] bg-canopy/10">
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
                      )}
                      {m.type === "video" && <Film className="absolute left-2 top-2 size-4 text-white drop-shadow" aria-hidden />}
                      {blocked && <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-[#7a1c1c] px-2 py-1 text-caption text-white"><AlertCircle className="size-3" aria-hidden />Add alt text first</span>}
                    </div>
                    <p className="truncate p-2 text-caption">{m.alt || m.caption || m.path.split("/").pop()}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <Dropzone compact multiple={false} accept={kind === "image" ? "image/*" : "video/mp4,video/webm"} onUploaded={(m) => setItems((x) => [m, ...(x ?? [])])} label={`Upload ${kind === "image" ? "an image" : "a video"}`} />
          {kind === "image" && <p className="mt-3 text-caption text-canopy/75">New images need alt text before they can be used. Add it in the Media library.</p>}
        </div>
      </div>
    </dialog>
  );
}
