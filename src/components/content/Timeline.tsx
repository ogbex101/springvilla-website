import { DrawLine } from "@/lib/motion";
import { formatDate } from "@/lib/utils";

/** Vertical milestone timeline; the line draws as you scroll and milestones fade in. */
export function Timeline({ items }: { items: { id: string; occurredOn: string; title: string; body: string | null }[] }) {
  if (!items.length) return null;
  return (
    <DrawLine className="relative" start="top 80%" end="bottom 70%">
      <svg aria-hidden className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px" preserveAspectRatio="none" viewBox="0 0 1 100">
        <line data-draw x1="0.5" y1="0" x2="0.5" y2="100" stroke="currentColor" strokeOpacity="0.5" />
      </svg>
      <ol className="space-y-6">
        {items.map((u) => (
          <li key={u.id} className="relative pl-8">
            <span aria-hidden className="absolute left-0 top-1.5 size-[15px] rounded-full border-2 border-current bg-surface" />
            <time dateTime={u.occurredOn} className="sv-eyebrow text-muted">
              {formatDate(u.occurredOn, { day: undefined })}
            </time>
            <p className="mt-1 font-semibold">{u.title}</p>
            {u.body && <p className="mt-1 text-small text-muted">{u.body}</p>}
          </li>
        ))}
      </ol>
    </DrawLine>
  );
}
