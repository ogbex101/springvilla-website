import Link from "next/link";
import type { ReactNode } from "react";
import { MediaFrame } from "@/components/ui";
import type { Media } from "@/lib/content/media-types";
import { cn } from "@/lib/utils";

/**
 * Editorial card with the shared hover treatment (desktop): image zooms to 1.06,
 * card lifts 4px, a Lime Sprout underline draws across the title.
 */
export function Card({
  href,
  media,
  ratio = "4/3",
  eyebrow,
  title,
  children,
  meta,
  size = "md",
  sizes,
  className,
  tone,
}: {
  href: string;
  media: Media | null;
  ratio?: "4/3" | "16/9" | "3/2" | "4/5" | "1/1";
  eyebrow?: ReactNode;
  title: string;
  children?: ReactNode;
  meta?: ReactNode;
  size?: "md" | "lg";
  sizes?: string;
  className?: string;
  tone?: "canopy" | "cyprus" | "signal";
}) {
  return (
    <article className={cn("group relative flex flex-col transition-transform duration-300 ease-[var(--ease-out-quart)] [@media(hover:hover)]:hover:-translate-y-1", className)}>
      <div className="overflow-hidden rounded-xl">
        <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] [@media(hover:hover)]:group-hover:scale-[1.06]">
          <MediaFrame media={media} ratio={ratio} rounded="none" sizes={sizes ?? (size === "lg" ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw")} tone={tone} />
        </div>
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        {eyebrow && <div className="sv-eyebrow text-muted">{eyebrow}</div>}
        <h3 className={cn("mt-2 font-semibold", size === "lg" ? "text-display-s" : "text-[1.35rem] leading-snug tracking-[-0.015em]")}>
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            <span className="bg-[linear-gradient(var(--sv-lime),var(--sv-lime))] bg-[length:0%_0.35em] bg-[position:0_88%] bg-no-repeat transition-[background-size] duration-500 ease-[var(--ease-out-expo)] group-hover:bg-[length:100%_0.35em] group-focus-within:bg-[length:100%_0.35em]">
              {title}
            </span>
          </Link>
        </h3>
        {children && <div className="mt-3 text-muted">{children}</div>}
        {meta && <div className="mt-auto pt-4 text-caption text-muted">{meta}</div>}
      </div>
    </article>
  );
}
