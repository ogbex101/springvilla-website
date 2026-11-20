import { Eyebrow, DisplayHeading } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function SectionHeader({ eyebrow, heading, highlight, intro, id, size = "m", className, as = "h2", center = false }: { eyebrow?: string; heading?: string; highlight?: string; intro?: string; id?: string; size?: "xl" | "l" | "m" | "s"; className?: string; as?: "h1" | "h2"; center?: boolean }) {
  if (!eyebrow && !heading && !intro) return null;
  return (
    <div className={cn(center && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className={cn(center && "justify-center")}>{eyebrow}</Eyebrow>}
      {heading && (
        <RevealText as="div" className={cn(eyebrow && "mt-6")}>
          <DisplayHeading as={as} id={id} text={heading} highlight={highlight} size={size} className={cn(center && "mx-auto")} />
        </RevealText>
      )}
      {intro && <p className={cn("mt-6 max-w-[52ch] text-lead text-muted", center && "mx-auto")}>{intro}</p>}
    </div>
  );
}
