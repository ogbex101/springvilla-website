import { Fragment, type ElementType } from "react";
import { cn } from "@/lib/utils";

type Size = "xl" | "l" | "m" | "s";

/**
 * Display heading with an optional highlighted word set in the serif italic accent.
 * Line breaks: use "\n" in the text for controlled breaks.
 */
export function DisplayHeading({
  as: Tag = "h2",
  text,
  highlight,
  size = "l",
  className,
  id,
}: {
  as?: ElementType;
  text: string;
  highlight?: string | null;
  size?: Size;
  className?: string;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "font-sans font-semibold",
        size === "xl" && "text-display-xl",
        size === "l" && "text-display-l",
        size === "m" && "text-display-m",
        size === "s" && "text-display-s",
        className,
      )}
    >
      {renderHighlighted(text, highlight)}
    </Tag>
  );
}

export function renderHighlighted(text: string, highlight?: string | null) {
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <Fragment key={li}>
      {li > 0 && <br />}
      {highlightLine(line, highlight)}
    </Fragment>
  ));
}

function highlightLine(line: string, highlight?: string | null) {
  if (!highlight) return line;
  const idx = line.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return line;
  return (
    <>
      {line.slice(0, idx)}
      <em className="sv-serif-accent text-accent">
        {line.slice(idx, idx + highlight.length)}
      </em>
      {line.slice(idx + highlight.length)}
    </>
  );
}
