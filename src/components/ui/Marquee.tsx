import { cn } from "@/lib/utils";

/**
 * CSS-only marquee (no JS): content duplicated, translated -50%. Pauses on hover
 * and focus; static under reduced motion. Screen readers get one copy.
 */
export function Marquee({
  items,
  reverse = false,
  duration = 45,
  className,
  separator = "✦",
}: {
  items: string[];
  reverse?: boolean;
  duration?: number;
  className?: string;
  separator?: string;
}) {
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <li key={i} className="flex items-center whitespace-nowrap">
          <span className="px-6 md:px-10">{t}</span>
          <span aria-hidden className="text-[0.5em] opacity-70">
            {separator}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("group/marquee relative flex overflow-hidden", className)}>
      <div
        className="flex w-max animate-marquee group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ ["--marquee-duration" as string]: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
