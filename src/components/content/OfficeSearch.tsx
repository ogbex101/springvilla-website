"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import type { OfficeCard } from "@/lib/content/collections";
import { track } from "@/lib/analytics/client";

const OfficeMap = dynamic(() => import("./OfficeMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-chip" /> });

/**
 * City/state search over a readable list. The map (Leaflet + OSM) loads lazily
 * when scrolled near, and the list always works without it.
 */
export function OfficeSearch({ offices, initialQuery = "", showMap = true, headingLevel = 3 }: { offices: OfficeCard[]; initialQuery?: string; showMap?: boolean; headingLevel?: 2 | 3 }) {
  const [q, setQ] = useState(initialQuery);
  const dq = useDeferredValue(q);
  const [mapVisible, setMapVisible] = useState(false);
  const mapBox = useRef<HTMLDivElement>(null);
  const H = headingLevel === 2 ? "h2" : "h3";

  const results = useMemo(() => {
    const s = dq.trim().toLowerCase();
    if (!s) return offices;
    return offices.filter((o) => [o.name, o.city, o.state, o.country].some((v) => v?.toLowerCase().includes(s)));
  }, [dq, offices]);

  useEffect(() => {
    if (!dq.trim()) return;
    const t = setTimeout(() => track("office_search", { q: dq.trim().slice(0, 40), results: results.length }), 800);
    return () => clearTimeout(t);
  }, [dq, results.length]);

  useEffect(() => {
    const el = mapBox.current;
    if (!el || !showMap) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setMapVisible(true), io.disconnect()), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [showMap]);

  const pinned = results.filter((o) => o.lat != null && o.lng != null);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <label htmlFor="office-q" className="sv-eyebrow text-muted">
          Search by city or state
        </label>
        <div className="relative mt-3">
          <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 opacity-70" />
          <input
            id="office-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. your city"
            autoComplete="address-level2"
            className="min-h-14 w-full rounded-full border border-line bg-white/70 pl-13 pr-5 text-lead text-canopy placeholder:text-canopy/55 focus:border-current"
          />
        </div>
        <p className="mt-3 text-small text-muted" aria-live="polite">
          {offices.length === 0 ? "" : `${results.length} ${results.length === 1 ? "office" : "offices"}${dq ? ` matching “${dq}”` : ""}`}
        </p>
        <ul className="mt-4 max-h-[26rem] divide-y divide-line overflow-y-auto rounded-xl border border-line" data-lenis-prevent>
          {results.map((o) => (
            <li key={o.id}>
              <Link href={`/offices/${o.slug}`} className="flex min-h-16 items-start gap-3 px-5 py-4 transition-colors hover:bg-chip">
                <MapPin aria-hidden className="mt-1 size-4 shrink-0 opacity-70" />
                <span>
                  <H className="font-semibold">{o.name}</H>
                  <span className="block text-small text-muted">{[o.addressLine, o.city, o.state].filter(Boolean).join(", ")}</span>
                </span>
              </Link>
            </li>
          ))}
          {results.length === 0 && offices.length > 0 && <li className="px-5 py-6 text-muted">No offices match that search yet. Try a nearby city or state.</li>}
        </ul>
      </div>
      {showMap && pinned.length > 0 && (
        <div ref={mapBox} className="relative min-h-[22rem] overflow-hidden rounded-xl ring-1 ring-line lg:min-h-full">
          {mapVisible && <OfficeMap offices={pinned} />}
        </div>
      )}
    </div>
  );
}
