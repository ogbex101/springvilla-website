import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "group/btn relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-full px-6 py-3 text-[0.98rem] font-semibold leading-none transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-quart)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:shadow-lift",
  secondary: "border border-current/30 text-ink hover:border-current hover:bg-chip",
  ghost: "px-1 text-ink underline-offset-8 hover:underline",
};

function Arrow({ external }: { external?: boolean }) {
  const Icon = external ? ArrowUpRight : ArrowRight;
  return (
    <span aria-hidden className="relative inline-flex size-4 overflow-hidden">
      <Icon className="absolute inset-0 size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-full" />
      <Icon className="absolute inset-0 size-4 -translate-x-full transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0" />
    </span>
  );
}

type Common = { variant?: ButtonVariant; arrow?: boolean; children: ReactNode; className?: string };

export function ButtonLink({
  href,
  variant = "primary",
  arrow = true,
  children,
  className,
  ...rest
}: Common & { href: string } & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const external = /^https?:\/\//.test(href);
  const cls = cn(base, variants[variant], className);
  if (external || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        <span>{children}</span>
        {arrow && <Arrow external={external} />}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "primary",
  arrow = false,
  children,
  className,
  ...rest
}: Common & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}
