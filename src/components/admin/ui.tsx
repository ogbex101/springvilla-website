import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && <Link href={back.href} className="text-small text-canopy/75 hover:underline">← {back.label}</Link>}
        <h1 className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-canopy/80">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-canopy/12 bg-white p-5 md:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-canopy/25 bg-white/60 p-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-small text-canopy/75">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "info" | "bad" }) {
  const tones = {
    neutral: "bg-canopy/8 text-canopy",
    good: "bg-[#dff3d6] text-[#1d4d14]",
    warn: "bg-[#fbecc8] text-[#6b4a00]",
    info: "bg-[#d9eeec] text-cyprus",
    bad: "bg-[#f6d9d9] text-[#7a1c1c]",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold", tones[tone])}>{children}</span>;
}

export const STATUS_TONE: Record<string, "neutral" | "good" | "warn" | "info" | "bad"> = {
  published: "good", approved: "good", verified: "good", closed: "neutral", archived: "neutral",
  draft: "neutral", idea: "neutral", in_review: "warn", claims_review: "warn", pending: "warn", scheduled: "info",
  new: "info", contacted: "warn", visited: "good", unverified: "bad",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}

export const btn = {
  primary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-canopy px-4 text-small font-semibold text-white transition-colors hover:bg-cyprus disabled:opacity-50",
  secondary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-canopy/25 bg-white px-4 text-small font-semibold text-canopy transition-colors hover:border-canopy disabled:opacity-50",
  danger: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#7a1c1c]/30 bg-white px-4 text-small font-semibold text-[#7a1c1c] hover:bg-[#f6d9d9] disabled:opacity-50",
  ghost: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-small font-semibold text-canopy hover:bg-canopy/8 disabled:opacity-50",
};

export const input = "w-full min-h-10 rounded-lg border border-canopy/20 bg-white px-3 text-[0.95rem] text-canopy focus:border-canopy focus:outline-2 focus:outline-offset-1 focus:outline-canopy";
export const label = "block text-small font-semibold";
