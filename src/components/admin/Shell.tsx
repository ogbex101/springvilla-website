"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { LayoutDashboard, PanelsTopLeft, Clapperboard, Images, FileText, Route, CalendarDays, Newspaper, Building2, Inbox, Settings, Users, BarChart3, History, GraduationCap, Megaphone, Menu, X, LogOut, ExternalLink, FolderLock } from "lucide-react";
import { can, type Capability, type Role } from "@/lib/auth/roles";
import { RouteChange } from "@/lib/motion/RouteChange";
import { cn } from "@/lib/utils";
import { ToastProvider } from "./Toast";
import { signOutAction } from "@/app/admin/actions/auth";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; cap: Capability };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, cap: "dashboard" }] },
  {
    title: "Website",
    items: [
      { href: "/admin/hero", label: "Hero video", icon: Clapperboard, cap: "hero" },
      { href: "/admin/content", label: "Site content", icon: PanelsTopLeft, cap: "siteContent" },
      { href: "/admin/media", label: "Media library", icon: Images, cap: "media" },
      { href: "/admin/settings", label: "Navigation & settings", icon: Settings, cap: "settings" },
    ],
  },
  {
    title: "Stories & Ideas",
    items: [
      { href: "/admin/articles", label: "Articles", icon: FileText, cap: "blog" },
      { href: "/admin/journeys", label: "Journeys", icon: Route, cap: "journeys" },
      { href: "/admin/news", label: "News", icon: Newspaper, cap: "news" },
      { href: "/admin/events", label: "Events", icon: CalendarDays, cap: "events" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/offices", label: "Offices", icon: Building2, cap: "offices" },
      { href: "/admin/inbox", label: "Applications & enquiries", icon: Inbox, cap: "inbox" },
      { href: "/admin/users", label: "Users & roles", icon: Users, cap: "users" },
    ],
  },
  {
    title: "Members",
    items: [
      { href: "/admin/courses", label: "Courses", icon: GraduationCap, cap: "learning" },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone, cap: "announcements" },
      { href: "/admin/resources", label: "Resources", icon: FolderLock, cap: "learning" },
    ],
  },
  {
    title: "Insight",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, cap: "analytics" },
      { href: "/admin/audit", label: "Audit log", icon: History, cap: "audit" },
    ],
  },
];

export function AdminShell({ roles, email, children }: { roles: Role[]; email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const onRoute = useCallback((p: string) => {
    setPath(p);
    setOpen(false);
  }, []);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => can(roles, i.cap));
        if (!items.length) return null;
        return (
          <div key={g.title || "main"}>
            {g.title && <p className="px-3 pb-1 text-caption font-semibold uppercase tracking-[0.12em] text-lime/80">{g.title}</p>}
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-small font-medium text-white/85 hover:bg-white/10", active(i.href) && "bg-white/12 text-white")}>
                    <i.icon className={cn("size-4", active(i.href) && "text-lime")} aria-hidden />
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <p className="truncate px-3 text-caption text-white/70" title={email}>{email}</p>
      <div className="mt-2 flex gap-1">
        <a href="/" target="_blank" rel="noopener" className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-3 text-small text-white/85 hover:bg-white/10">
          <ExternalLink className="size-4" aria-hidden /> View site
        </a>
        <form action={signOutAction}>
          <button className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-small text-white/85 hover:bg-white/10">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <RouteChange onChange={onRoute} />
      <div className="min-h-dvh bg-sand text-canopy lg:grid lg:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col bg-canopy lg:flex">
          <Link href="/admin" className="px-6 py-5 text-[1.2rem] font-semibold tracking-tight text-white">Springvilla <span className="font-serif italic text-lime">admin</span></Link>
          {nav}
          {footer}
        </aside>
        <header className="sticky top-0 z-40 flex items-center justify-between bg-canopy px-4 py-3 text-white lg:hidden">
          <Link href="/admin" className="font-semibold">Springvilla <span className="font-serif italic text-lime">admin</span></Link>
          <button onClick={() => setOpen(true)} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/10" aria-expanded={open} aria-controls="admin-drawer">
            <Menu className="size-5" aria-hidden />
            <span className="sr-only">Open admin menu</span>
          </button>
        </header>
        {open && (
          <div id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu" className="fixed inset-0 z-50 flex lg:hidden">
            <div className="flex w-[86vw] max-w-xs flex-col bg-canopy">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-white">Menu</span>
                <button onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10" aria-label="Close menu">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              {nav}
              {footer}
            </div>
            <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          </div>
        )}
        <main id="main" className="min-w-0 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
