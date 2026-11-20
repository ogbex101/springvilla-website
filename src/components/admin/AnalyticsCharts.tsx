"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Single-series views-over-time chart (Fresh Canopy), with crosshair tooltip. */
export function ViewsChart({ data }: { data: { day: string; views: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label={`Daily page views: ${data.map((d) => `${d.day} ${d.views}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="views" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2D3E2C" stopOpacity={0.28} /><stop offset="100%" stopColor="#2D3E2C" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#2D3E2C" strokeOpacity={0.08} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#2D3E2C", fillOpacity: 0.7, fontSize: 12 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} minTickGap={24} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#2D3E2C", fillOpacity: 0.7, fontSize: 12 }} width={44} />
          <Tooltip cursor={{ stroke: "#2D3E2C", strokeOpacity: 0.3 }} formatter={(v) => [v, "Page views"]} labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} contentStyle={{ borderRadius: 8, border: "1px solid rgba(45,62,44,.15)" }} />
          <Area type="monotone" dataKey="views" stroke="#2D3E2C" strokeWidth={2} fill="url(#views)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
