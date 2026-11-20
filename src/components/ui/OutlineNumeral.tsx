import { cn } from "@/lib/utils";

/** Huge outlined numerals ("01", "02"). Decorative: hidden from assistive tech. */
export function OutlineNumeral({ value, className }: { value: string | number; className?: string }) {
  const text = typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <span aria-hidden className={cn("sv-outline-numeral block select-none text-numeral font-semibold tracking-tighter", className)}>
      {text}
    </span>
  );
}
