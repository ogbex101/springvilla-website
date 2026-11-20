"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export default function Sparkline({ data }: { data: { day: string; views: number }[] }) {
  return (
    <div className="h-28" role="img" aria-label={`Page views over the last ${data.length} days: ${data.map((d) => d.views).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2D3E2C" stopOpacity={0.35} /><stop offset="100%" stopColor="#2D3E2C" stopOpacity={0} /></linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <Tooltip formatter={(v) => [v, "Views"]} labelFormatter={(l) => new Date(String(l)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
          <Area type="monotone" dataKey="views" stroke="#2D3E2C" strokeWidth={2} fill="url(#spark)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
