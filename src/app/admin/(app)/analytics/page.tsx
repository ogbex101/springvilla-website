import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { BarList } from "@/components/admin/BarList";
import { PageHeader, Panel, btn, input } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const ViewsChart = dynamic(() => import("@/components/admin/AnalyticsCharts").then((m) => m.ViewsChart));

export const metadata = { title: "Analytics" };
type SP = Promise<{ range?: string; from?: string; to?: string }>;
type L = { label: string; value: number }[];
type Report = {
  totals: { page_views: number; visitors: number; anonymous_views: number };
  timeseries: { day: string; views: number; visitors: number }[];
  top_pages: L; referrers: L; campaigns: L; devices: L; browsers: L; countries: L; ctas: L; articles: L; events: L;
  hero: { home_views: number; plays: number; pauses: number };
  scroll_depth: { label: string; d25: number; d50: number; d75: number; d100: number }[];
  funnel: { visited: number; started: number; submitted: number };
};

const PRESETS = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"]] as const;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

function range(sp: { range?: string; from?: string; to?: string }) {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  if (sp.range === "custom" && sp.from && sp.to) return { from: new Date(sp.from), to: new Date(new Date(sp.to).getTime() + 86400000), key: "custom" };
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[sp.range ?? "30d"] ?? 30;
  return { from: new Date(end.getTime() - days * 86400000), to: end, key: sp.range ?? "30d" };
}

async function Report({ searchParams }: { searchParams: SP }) {
  await requireAdminPage("analytics");
  const sp = await searchParams;
  const r = range(sp);
  const db = await getServerClient();
  const { data, error } = await db.rpc("analytics_report", { p_from: r.from.toISOString(), p_to: r.to.toISOString() });
  if (error) return <p role="alert">{error.message}</p>;
  const d = data as Report;
  const f = d.funnel;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-2">
        <nav aria-label="Date range" className="flex flex-wrap gap-1">
          {PRESETS.map(([k, l]) => <Link key={k} href={`/admin/analytics?range=${k}`} aria-current={r.key === k ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-small font-semibold", r.key === k ? "bg-canopy text-white" : "bg-white ring-1 ring-canopy/15")}>{l}</Link>)}
        </nav>
        <form action="/admin/analytics" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          <input aria-label="From" type="date" name="from" defaultValue={sp.from} required className={`${input} w-auto`} />
          <input aria-label="To" type="date" name="to" defaultValue={sp.to} required className={`${input} w-auto`} />
          <button className={btn.secondary}>Apply</button>
        </form>
        <a className={cn(btn.secondary, "ml-auto")} href={`/api/admin/export?kind=analytics&from=${r.from.toISOString()}&to=${r.to.toISOString()}`}><Download className="size-4" aria-hidden /> Export CSV</a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Page views", d.totals.page_views], ["Visitors (consented)", d.totals.visitors], ["Anonymous views", d.totals.anonymous_views], ["Join conversion", pct(f.submitted, f.visited)]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-white p-5 ring-1 ring-canopy/10"><p className="text-small text-canopy/75">{l}</p><p className="mt-1 text-[1.8rem] font-semibold tabular-nums">{typeof v === "number" ? v.toLocaleString("en-GB") : v}</p></div>
        ))}
      </div>

      <Panel className="mt-6" title="Page views over time"><ViewsChart data={d.timeseries} /></Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Join funnel">
          <BarList items={[{ label: "Visited /join", value: f.visited }, { label: "Started the form", value: f.started }, { label: "Submitted", value: f.submitted }]} />
          <p className="mt-3 text-small text-canopy/75">Start rate {pct(f.started, f.visited)} · completion {pct(f.submitted, f.started)}. Starts and submissions are only counted for visitors who accepted analytics.</p>
        </Panel>
        <Panel title="Hero video">
          <dl className="grid grid-cols-3 gap-3 text-small">
            <div><dt className="text-canopy/75">Homepage views</dt><dd className="text-[1.4rem] font-semibold">{d.hero.home_views}</dd></div>
            <div><dt className="text-canopy/75">Plays</dt><dd className="text-[1.4rem] font-semibold">{d.hero.plays}</dd></div>
            <div><dt className="text-canopy/75">Play rate</dt><dd className="text-[1.4rem] font-semibold">{pct(d.hero.plays, d.hero.home_views)}</dd></div>
          </dl>
          <p className="mt-2 text-caption text-canopy/70">Phones without the mobile clip, reduced-motion and data-saver visitors see the poster, so the play rate is never 100%.</p>
        </Panel>
        <Panel title="Top pages"><BarList items={d.top_pages} /></Panel>
        <Panel title="Top referrers"><BarList items={d.referrers} /></Panel>
        <Panel title="Campaigns (UTM)"><BarList items={d.campaigns} empty="No tagged campaign links used in this period." /></Panel>
        <Panel title="Button clicks"><BarList items={d.ctas} /></Panel>
        <Panel title="Devices"><BarList items={d.devices} /></Panel>
        <Panel title="Browsers"><BarList items={d.browsers} /></Panel>
        <Panel title="Countries"><BarList items={d.countries} /></Panel>
        <Panel title="Most-read articles (read 75%)"><BarList items={d.articles} /></Panel>
      </div>

      <Panel className="mt-6" title="Scroll depth by page">
        {d.scroll_depth.length === 0 ? <p className="text-small text-canopy/70">No data in this period.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-small">
              <thead className="text-left"><tr><th className="py-2">Page</th>{["25%", "50%", "75%", "100%"].map((h) => <th key={h} className="py-2 text-right">{h}</th>)}</tr></thead>
              <tbody>{d.scroll_depth.map((s) => <tr key={s.label} className="border-t border-canopy/10"><td className="py-2">{s.label}</td>{[s.d25, s.d50, s.d75, s.d100].map((n, i) => <td key={i} className="py-2 text-right tabular-nums">{n}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export default function AnalyticsPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader title="Analytics" description="First-party and privacy-respecting. No IP addresses or personal data are stored; detailed figures only come from visitors who accepted analytics." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}><Report searchParams={searchParams} /></Suspense>
    </>
  );
}
