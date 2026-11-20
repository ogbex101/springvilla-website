/** Ranked horizontal bars: single hue, values as text (doubles as the table view). */
export function BarList({ items, empty = "No data in this period.", format = (n: number) => n.toLocaleString("en-GB") }: { items: { label: string; value: number }[]; empty?: string; format?: (n: number) => string }) {
  if (!items.length) return <p className="text-small text-canopy/70">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="relative" title={`${i.label}: ${format(i.value)}`}>
          <div aria-hidden className="absolute inset-y-0 left-0 rounded-[4px] bg-canopy/12" style={{ width: `${(i.value / max) * 100}%` }} />
          <div className="relative flex justify-between gap-3 px-2.5 py-1.5 text-small">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{format(i.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
