"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { OfficeCard } from "@/lib/content/collections";

/** Leaflet + OpenStreetMap tiles. Loaded only on demand. */
export default function OfficeMap({ offices }: { offices: OfficeCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const icon = L.divIcon({ className: "", html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#2D3E2C;border:3px solid #E4FD97;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const bounds = L.latLngBounds([]);
      offices.forEach((o) => {
        const ll = L.latLng(o.lat as number, o.lng as number);
        bounds.extend(ll);
        const a = document.createElement("a");
        a.href = `/offices/${o.slug}`;
        a.textContent = o.name;
        a.style.fontWeight = "600";
        L.marker(ll, { icon, title: o.name, alt: o.name }).addTo(map!).bindPopup(a);
      });
      if (offices.length === 1) map.setView(bounds.getCenter(), 13);
      else map.fitBounds(bounds, { padding: [40, 40] });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [offices]);
  return <div ref={ref} className="absolute inset-0" role="region" aria-label="Map of offices" />;
}
