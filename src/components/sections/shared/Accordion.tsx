"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible accordion (button + region). Height animates via CSS grid rows
 * (0fr → 1fr), so there is no per-frame layout work in JS.
 */
export function Accordion({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const isOpen = open === i;
        const btn = `${base}-b${i}`;
        const panel = `${base}-p${i}`;
        return (
          <li key={i}>
            <h3>
              <button
                id={btn}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left text-[1.2rem] font-semibold leading-snug"
              >
                {it.title}
                <Plus aria-hidden className={cn("size-5 shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)]", isOpen && "rotate-45")} />
              </button>
            </h3>
            <div id={panel} role="region" aria-labelledby={btn} className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-quart)]", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!isOpen}>
              <div className="overflow-hidden">
                <p className="max-w-[65ch] whitespace-pre-line pb-6 text-lead text-muted">{it.body}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
