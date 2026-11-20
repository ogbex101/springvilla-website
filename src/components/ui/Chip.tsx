import { cn } from "@/lib/utils";

export function Chip({ children, className, active }: { children: React.ReactNode; className?: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border border-line px-3.5 py-1 text-caption font-medium",
        active ? "bg-accent text-accent-fg border-transparent" : "bg-chip text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
