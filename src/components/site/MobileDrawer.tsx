"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ArrowRight } from "lucide-react";
import type { NavLink } from "@/lib/content/queries";
import { useSmoothScroll } from "@/lib/motion/SmoothScroll";

/** Full-screen Fresh Canopy drawer. Links stagger in; Join pinned to the bottom. */
export function MobileDrawer({ open, onClose, links, siteName, pathname }: { open: boolean; onClose: () => void; links: NavLink[]; siteName: string; pathname: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
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

  const item = {
    hidden: { y: reduced ? 0 : "110%", opacity: reduced ? 0 : 1 },
    show: (i: number) => ({ y: 0, opacity: 1, transition: { delay: reduced ? 0 : 0.12 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }),
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-drawer"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-layer="canopy"
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto px-gutter pb-6 pt-4 lg:hidden"
          initial={{ clipPath: reduced ? "inset(0 0 0 0)" : "inset(0 0 100% 0)", opacity: reduced ? 0 : 1 }}
          animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1, transition: { duration: reduced ? 0.15 : 0.55, ease: [0.65, 0, 0.35, 1] } }}
          exit={{ clipPath: reduced ? "inset(0 0 0 0)" : "inset(0 0 100% 0)", opacity: reduced ? 0 : 1, transition: { duration: reduced ? 0.15 : 0.4, ease: [0.65, 0, 0.35, 1] } }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">{siteName}</span>
            <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <X className="size-6" aria-hidden />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-10 flex-1">
            <ul className="space-y-1">
              {[{ label: "Home", href: "/" }, ...links].map((l, i) => (
                <li key={l.href} className="overflow-hidden">
                  <motion.div custom={i} variants={item} initial="hidden" animate="show">
                    <Link
                      href={l.href}
                      onClick={onClose}
                      aria-current={pathname === l.href ? "page" : undefined}
                      className="flex min-h-14 items-center justify-between border-b border-line py-2 text-display-s font-semibold text-white aria-[current=page]:text-lime"
                    >
                      {l.label}
                      <ArrowRight className="size-5 opacity-60" aria-hidden />
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
            <motion.div custom={links.length + 1} variants={item} initial="hidden" animate="show" className="mt-6">
              <Link href="/login" onClick={onClose} className="inline-flex min-h-11 items-center text-lead text-white/85 underline-offset-4 hover:underline">
                Member Login
              </Link>
            </motion.div>
          </nav>

          <Link
            href="/join"
            onClick={onClose}
            data-cta="drawer-join"
            className="mt-8 flex min-h-14 items-center justify-center gap-3 rounded-full bg-lime text-lg font-semibold text-canopy"
          >
            Join Springvilla <ArrowRight className="size-5" aria-hidden />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
