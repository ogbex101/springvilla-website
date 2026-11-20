import { cn } from "@/lib/utils";

export function Eyebrow({ children, className, as: Tag = "p" }: { children: React.ReactNode; className?: string; as?: "p" | "span" | "div" }) {
  if (!children) return null;
  return (
    <Tag className={cn("sv-eyebrow flex items-center gap-3 text-muted", className)}>
      <span aria-hidden className="h-px w-8 bg-current opacity-60" />
      <span>{children}</span>
    </Tag>
  );
}
