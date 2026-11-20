"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { Home, Building2, Megaphone, CalendarDays, FolderOpen, GraduationCap, LifeBuoy, UserRound, LogOut, Sprout } from "lucide-react";
import { RouteChange } from "@/lib/motion/RouteChange";
import { memberSignOut } from "@/app/member/actions";
import { cn } from "@/lib/utils";
import { LoginTracker } from "./MemberForms";

const NAV = [
  { href: "/member", label: "Overview", icon: Home },
  { href: "/member/learning", label: "My learning", icon: GraduationCap },
  { href: "/member/office", label: "My office", icon: Building2 },
  { href: "/member/announcements", label: "Announcements", icon: Megaphone },
  { href: "/member/events", label: "Events", icon: CalendarDays },
  { href: "/member/resources", label: "Resources", icon: FolderOpen },
  { href: "/member/growth", label: "My Growth", icon: Sprout },
  { href: "/member/support", label: "Support", icon: LifeBuoy },
  { href: "/member/profile", label: "Profile & privacy", icon: UserRound },
];

/** Quiet, fast member workspace: no page motion, minimal chrome. */
export function MemberShell({ name, children }: { name: string; children: ReactNode }) {
  const [path, setPath] = useState("");
  const onRoute = useCallback((p: string) => setPath(p), []);
  const active = (h: string) => (h === "/member" ? path === h : path.startsWith(h));
  return (
    <div className="min-h-dvh bg-milky text-canopy">
      <RouteChange onChange={onRoute} />
      <LoginTracker />
      <header className="border-b border-canopy/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/member" className="font-semibold">Springvilla <span className="font-serif italic">members</span></Link>
          <div className="flex items-center gap-3 text-small">
            <span className="hidden sm:inline">{name}</span>
            <form action={memberSignOut}><button className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-canopy/8"><LogOut className="size-4" aria-hidden />Sign out</button></form>
          </div>
        </div>
        <nav aria-label="Member" className="mx-auto max-w-6xl overflow-x-auto px-2 [scrollbar-width:none]">
          <ul className="flex gap-1 pb-2">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0">
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-small font-medium", active(n.href) ? "bg-canopy text-white" : "hover:bg-canopy/8")}>
                  <n.icon className="size-4" aria-hidden />{n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
