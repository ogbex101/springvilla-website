"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/lib/motion/SmoothScroll";

/** Sticky anchor sub-navigation with scroll-spy. Built from sections that set an anchor + label. */
export function AnchorNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const scroll = useSmoothScroll();
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setActive(v.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="sticky top-0 z-40 border-b border-line bg-milky/90 backdrop-blur-md">
      <ul className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-gutter py-2 [scrollbar-width:none]">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              onClick={(e) => {
                e.preventDefault();
                scroll.scrollTo(`#${i.id}`, { offset: -64 });
                history.replaceState(null, "", `#${i.id}`);
              }}
              aria-current={active === i.id ? "location" : undefined}
              className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-small font-medium text-canopy transition-colors", active === i.id ? "bg-canopy text-white" : "hover:bg-canopy/8")}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
