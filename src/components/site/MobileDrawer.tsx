"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import type { NavLink } from "@/lib/content/queries";
import type { Media } from "@/lib/content/media-types";
import { Logo } from "./Logo";
import { useSmoothScroll } from "@/lib/motion/SmoothScroll";

/** Full-screen Fresh Canopy drawer. Links stagger in; Join pinned to the bottom. */
export function MobileDrawer({ open, onClose, links, siteName, logo, pathname }: { open: boolean; onClose: () => void; links: NavLink[]; siteName: string; logo: Media | null; pathname: string }) {
  const panel = useRef<HTMLDivElement>(null);
  // Keep mounted briefly after close so the exit animation can play.
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setState(open ? "open" : "closing");
  }
  useEffect(() => {
    if (state !== "closing") return;
    const t = setTimeout(() => setState("closed"), 400);
    return () => clearTimeout(t);
  }, [state]);
  const scroll = useSmoothScroll();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    scroll.stop();
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a,button");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      scroll.start();
      prev?.focus();
    };
  }, [open, onClose, scroll]);

  return (
    <>
      {state !== "closed" && (
        <div
          id="mobile-drawer"
          data-state={state}
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-layer="canopy"
          className="sv-drawer fixed inset-0 z-[60] flex flex-col overflow-y-auto px-gutter pb-6 pt-4 lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Logo logo={logo} siteName={siteName} onBrandSurface className="-m-2 text-white" />
            <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <X className="size-6" aria-hidden />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-10 flex-1">
            <ul className="space-y-1">
              {[{ label: "Home", href: "/" }, ...links].map((l, i) => (
                <li key={l.href} className="overflow-hidden">
                  <div className="sv-drawer-item" style={{ animationDelay: `${0.12 + i * 0.06}s` }}>
                    <Link
                      href={l.href}
                      onClick={onClose}
                      aria-current={pathname === l.href ? "page" : undefined}
                      className="flex min-h-14 items-center justify-between border-b border-line py-2 text-display-s font-semibold text-white aria-[current=page]:text-lime"
                    >
                      {l.label}
                      <ArrowRight className="size-5 opacity-60" aria-hidden />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <div className="sv-drawer-item mt-6" style={{ animationDelay: `${0.12 + (links.length + 1) * 0.06}s` }}>
              <Link href="/login" onClick={onClose} className="inline-flex min-h-11 items-center text-lead text-white/85 underline-offset-4 hover:underline">
                Member Login
              </Link>
            </div>
          </nav>

          <Link
            href="/join"
            onClick={onClose}
            data-cta="drawer-join"
            className="mt-8 flex min-h-14 items-center justify-center gap-3 rounded-full bg-lime text-lg font-semibold text-canopy"
          >
            Join Springvilla <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      )}
    </>
  );
}
