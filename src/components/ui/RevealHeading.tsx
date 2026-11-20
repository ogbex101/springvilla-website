import type { ElementType } from "react";
import { RevealText } from "@/lib/motion/RevealText";
import { renderHighlighted } from "./DisplayHeading";
import { cn } from "@/lib/utils";

const SIZES = { xl: "text-display-xl", l: "text-display-l", m: "text-display-m", s: "text-display-s" } as const;

/**
 * Display heading with the line-reveal applied to the heading element itself,
 * so SplitText never duplicates the heading when slicing lines.
 */
export function RevealHeading({ as = "h2", text, highlight, size = "l", id, className }: { as?: ElementType; text: string; highlight?: string | null; size?: keyof typeof SIZES; id?: string; className?: string }) {
  return (
    <RevealText as={as} id={id} immediate={as === "h1"} className={cn("font-sans font-semibold", SIZES[size], className)}>
      {renderHighlighted(text, highlight)}
    </RevealText>
  );
}
