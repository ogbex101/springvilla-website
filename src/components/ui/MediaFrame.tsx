import Image from "next/image";
import type { Media } from "@/lib/content/media-types";
import { cn } from "@/lib/utils";
import { BrandField } from "./BrandField";

type Ratio = "16/9" | "4/3" | "3/4" | "4/5" | "1/1" | "21/9" | "3/2" | "2/3" | "auto";

const ratioClass: Record<Ratio, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "3/4": "aspect-[3/4]",
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
  "21/9": "aspect-[21/9]",
  "3/2": "aspect-[3/2]",
  "2/3": "aspect-[2/3]",
  auto: "",
};

/**
 * Aspect-locked, rounded media frame. The image sits in a [data-reveal-inner]
 * wrapper so RevealImage can scale it. Missing media → abstract BrandField.
 */
export function MediaFrame({
  media,
  ratio = "4/3",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  className,
  rounded = "xl",
  tone,
}: {
  media: Media | null | undefined;
  ratio?: Ratio;
  sizes?: string;
  priority?: boolean;
  className?: string;
  rounded?: "none" | "md" | "lg" | "xl";
  tone?: "canopy" | "cyprus" | "signal";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        ratioClass[ratio],
        rounded === "md" && "rounded-md",
        rounded === "lg" && "rounded-lg",
        rounded === "xl" && "rounded-xl",
        className,
      )}
    >
      <div data-reveal-inner className="absolute inset-0 will-change-transform">
        {media?.type === "image" ? (
          <Image
            src={media.url}
            alt={media.alt}
            fill
            sizes={sizes}
            priority={priority}
            placeholder={media.blurDataUrl ? "blur" : "empty"}
            blurDataURL={media.blurDataUrl ?? undefined}
            className="object-cover"
          />
        ) : (
          <BrandField tone={tone} />
        )}
      </div>
    </div>
  );
}
