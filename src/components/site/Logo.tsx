import Image from "next/image";
import type { Media } from "@/lib/content/media-types";
import { cn } from "@/lib/utils";

/**
 * Brand rule (blueprint §15.2): the official logo file is placed unchanged and only
 * on Fresh Canopy or Cyprus, with clear space and its own aspect ratio. Callers pass
 * `onBrandSurface` only when the background is one of those two colours; otherwise
 * (or with no uploaded file) the text wordmark is shown instead.
 */
export function Logo({ logo, siteName, onBrandSurface, className, size = "md" }: { logo: Media | null; siteName: string; onBrandSurface: boolean; className?: string; size?: "md" | "lg" }) {
  if (logo && onBrandSurface) {
    const h = size === "lg" ? 128 : 48;
    const w = logo.width && logo.height ? Math.round((logo.width / logo.height) * h) : h * 3;
    return (
      // Clear space: padding equal to ~1/4 of the mark's height on every side.
      <span className={cn("inline-flex", size === "lg" ? "p-4" : "p-2", className)}>
        <Image src={logo.url} alt={siteName} width={w} height={h} className="h-auto w-auto object-contain" style={{ height: h, width: "auto" }} priority={size === "md"} unoptimized={logo.mime === "image/svg+xml"} />
      </span>
    );
  }
  return <span className={cn("text-[1.35rem] font-semibold tracking-[-0.03em]", className)}>{siteName}</span>;
}
