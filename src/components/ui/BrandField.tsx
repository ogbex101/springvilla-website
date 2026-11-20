import { cn } from "@/lib/utils";

/**
 * Abstract Fresh Canopy field with a slow drifting gradient, grain and line
 * strands. Used whenever no real photo exists. Never presented as a real place.
 */
export function BrandField({ className, tone = "canopy" }: { className?: string; tone?: "canopy" | "cyprus" | "signal" }) {
  const bg = tone === "canopy" ? "bg-canopy" : tone === "cyprus" ? "bg-cyprus" : "bg-dark";
  const glow = tone === "signal" ? "var(--sv-tiffany)" : "var(--sv-lime)";
  return (
    <div aria-hidden className={cn("sv-grain absolute inset-0 overflow-hidden", bg, className)}>
      <div
        className="absolute -inset-1/4 opacity-40 [animation:sv-drift_24s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ background: `radial-gradient(40% 45% at 30% 35%, color-mix(in srgb, ${glow} 45%, transparent), transparent 70%), radial-gradient(35% 40% at 75% 70%, color-mix(in srgb, ${glow} 25%, transparent), transparent 70%)` }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${-50 + i * 40} ${620 - i * 10} C ${200 + i * 30} ${420 - i * 40}, ${380 - i * 20} ${260 + i * 30}, ${850} ${120 + i * 70}`}
            stroke={glow}
            strokeWidth={1}
            strokeOpacity={0.6 - i * 0.08}
          />
        ))}
      </svg>
    </div>
  );
}
