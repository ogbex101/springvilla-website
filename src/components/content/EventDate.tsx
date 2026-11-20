/** Timezone-aware event date, rendered in the event's own timezone with the zone shown. */
export function EventDate({ start, end, timeZone, long = false }: { start: string; end?: string | null; timeZone: string; long?: boolean }) {
  const tz = safeZone(timeZone);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: tz });
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, timeZoneName: "short" });
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sameDay = e && day.format(s) === day.format(e);
  return (
    <time dateTime={start}>
      {day.format(s)}, {time.format(s).replace(/\s\S+$/, "")}
      {e && (sameDay ? `–${time.format(e)}` : ` – ${day.format(e)}, ${time.format(e)}`)}
      {!e && ` ${time.format(s).split(" ").pop()}`}
    </time>
  );
}

function safeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
