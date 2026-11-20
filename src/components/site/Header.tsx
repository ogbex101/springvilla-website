"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { RouteChange } from "@/lib/motion/RouteChange";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Media } from "@/lib/content/media-types";
import type { NavLink } from "@/lib/content/queries";
import { MobileDrawer } from "./MobileDrawer";

const DARK_LAYERS = new Set(["canopy", "cyprus", "signal", "energy"]);

export function Header({ siteName, logo, links, mobileLinks }: { siteName: string; logo: Media | null; links: NavLink[]; mobileLinks: NavLink[] }) {
  const [pathname, setPathname] = useState("");
  const [open, setOpen] = useState(false);
  const onRoute = useCallback((p: string) => {
    setPathname(p);
    setOpen(false);
  }, []);
  const [floating, setFloating] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [onDark, setOnDark] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const isFloating = y > 80;
      setFloating(isFloating);
      // Hide on scroll down, reveal on scroll up (only once floating).
      if (Math.abs(y - lastY.current) > 6) {
        setHidden(isFloating && y > lastY.current && y > 240);
        lastY.current = y;
      }
      if (!isFloating) {
        // Read the palette layer directly under the bar to choose light/dark text.
        const el = document.elementsFromPoint(window.innerWidth / 2, 40).find((n) => !n.closest("header"));
        const layer = el?.closest<HTMLElement>("[data-layer]")?.dataset.layer;
        setOnDark(layer ? DARK_LAYERS.has(layer) : false);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const light = floating || onDark; // light text
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <RouteChange onChange={onRoute} />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-out-expo)]",
          hidden && !open && "-translate-y-[120%]",
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-4 transition-[max-width,margin,padding,background-color,border-radius,box-shadow,color] duration-500 ease-[var(--ease-out-expo)]",
            floating
              ? "mt-3 max-w-[1240px] rounded-full bg-canopy/92 px-4 py-2 shadow-nav backdrop-blur-md supports-[backdrop-filter]:bg-canopy/85 mx-3 lg:mx-auto lg:px-5"
              : "max-w-[1440px] px-gutter py-5",
            light ? "text-white" : "text-canopy",
          )}
        >
          <Link href="/" className="relative z-10 flex min-h-11 items-center gap-2 rounded-md" aria-label={`${siteName} home`}>
            {logo ? (
              <Image src={logo.url} alt="" width={logo.width ?? 160} height={logo.height ?? 40} className="h-8 w-auto lg:h-9" priority />
            ) : (
              <span className="text-[1.35rem] font-semibold tracking-[-0.03em]">{siteName}</span>
            )}
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={cn(
                      "relative inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.95rem] font-medium transition-colors",
                      light ? "hover:bg-white/10" : "hover:bg-canopy/8",
                      "after:absolute after:inset-x-3.5 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 aria-[current=page]:after:scale-x-100",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className={cn("hidden min-h-11 items-center rounded-full px-3.5 text-[0.95rem] font-medium lg:inline-flex", light ? "hover:bg-white/10" : "hover:bg-canopy/8")}>
              Member Login
            </Link>
            <Link
              href="/join"
              data-cta="header-join"
              className={cn(
                "hidden min-h-11 items-center rounded-full px-5 text-[0.95rem] font-semibold transition-colors sm:inline-flex",
                light ? "bg-lime text-canopy hover:bg-white" : "bg-canopy text-white hover:bg-cyprus",
              )}
            >
              Join Springvilla
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              className={cn("inline-flex size-11 items-center justify-center rounded-full lg:hidden", light ? "hover:bg-white/10" : "hover:bg-canopy/8")}
            >
              <Menu className="size-6" aria-hidden />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </div>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} links={mobileLinks} siteName={siteName} pathname={pathname} />
    </>
  );
}
