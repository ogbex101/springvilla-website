import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export const PALETTE_LAYERS = ["canopy", "sand", "cyprus", "milky", "signal", "energy"] as const;
export type PaletteLayer = (typeof PALETTE_LAYERS)[number];

type Props = {
  layer?: PaletteLayer;
  spacing?: "default" | "sm" | "none";
} & ComponentPropsWithoutRef<"section">;

/**
 * Every public section goes through this. The layer sets a background/text
 * pair from the brand system, so a section cannot break the two-layer rule.
 */
export function Section({ layer = "milky", spacing = "default", className, ...rest }: Props) {
  return (
    <section
      data-layer={layer}
      className={cn(
        "relative isolate",
        spacing === "default" && "py-section",
        spacing === "sm" && "py-section-sm",
        className,
      )}
      {...rest}
    />
  );
}
