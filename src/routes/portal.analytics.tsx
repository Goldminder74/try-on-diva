import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Lock, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  getRetailerAnalytics,
  exportRetailerAnalyticsCsv,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/portal/analytics")({
  head: () => ({ meta: [{ title: "Analytics - Wigsmi Retailer" }] }),
  component: AnalyticsPage,
});

type Range = "7d" | "30d" | "90d" | "all";
const RANGES: { value: Range; label: string; days: number | null }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getRetailerAnalytics);
  const fetchCsv = useServerFn(exportRetailerAnalyticsCsv);
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["retailer-analytics", range],
    queryFn: () => fetchAnalytics({ data: { range } }),
  });

  const planLimitDays = data?.planLimitDays ?? 30;
  const rangeAllowed = (r: Range) => {
    const d = RANGES.find((x) => x.value === r)!.days;
    if (planLimitDays === null) return true;
    if (d === null) return false;
    return d <= planLimitDays;
  };

  const onExport = async () => {
    const res = await fetchCsv({ data: { range } });
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-gold-dark">
            Analytics
          </p>
          <h1 className="mt-1 font-display text-4xl text-mahogany">How your widget is performing.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Try-ons, clicks, and customer signals from your store.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-1">
            {RANGES.map((r) => {
              const allowed = rangeAllowed(r.value);
              const active = range === r.value;
              return (
                <button
                  key={r.value}
                  disabled={!allowed}
                  onClick={() => allowed && setRange(r.value)}
                  title={allowed ? "" : "Upgrade your plan to see more history"}
                  className={`relative rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-mahogany text-cream"
                      : allowed
                        ? "text-foreground hover:bg-sand/60"
                        : "cursor-not-allowed text-muted-foreground/60"
                  }`}
                >
                  {r.label}
                  {!allowed && <Lock className="ml-1 inline h-3 w-3" />}
                </button>
              );
            })}
          </div>
          {data?.canExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-mahogany"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {isLoading && <LoadingState />}

      {isError && (
        <div className="rounded-md border border-error/30 bg-error/5 p-6 text-sm">
          <p className="font-medium text-error">Couldn't load analytics.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-md border border-error/40 bg-card px-3 py-1.5 text-xs hover:bg-error/10"
          >
            Try again
          </button>
        </div>
      )}

      {data && !isLoading && !data.hasAnyEvents && <EmptyState />}

      {data && !isLoading && data.hasAnyEvents && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Try-ons" value={data.kpis.tryOns.value} prev={data.kpis.tryOns.prev} />
            <KpiCard
              label="Unique visitors"
              value={data.kpis.uniqueVisitors.value}
              prev={data.kpis.uniqueVisitors.prev}
            />
            <KpiCard label="Wig clicks" value={data.kpis.clicks.value} prev={data.kpis.clicks.prev} />
            <KpiCard
              label="Click-through rate"
              value={data.kpis.ctr.value}
              prev={data.kpis.ctr.prev}
              format="percent"
            />
          </div>

          <Card title="Try-ons over time">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeseries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tryOnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--mahogany)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--mahogany)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: string) => v.slice(5)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tryOns"
                    stroke="var(--mahogany)"
                    strokeWidth={2}
                    fill="url(#tryOnFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Top wigs">
            {data.topWigs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No wig try-ons yet in this range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">Wig</th>
                    <th className="py-2 text-right">Try-ons</th>
                    <th className="py-2 text-right">Clicks</th>
                    <th className="py-2 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topWigs.map((w) => (
                    <tr key={w.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-3">
                          {w.image ? (
                            <img src={w.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-sand" />
                          )}
                          <span className="truncate">{w.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{w.tryOns}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{w.clicks}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {(w.ctr * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="Device">
              <Breakdown rows={data.deviceBreakdown} />
            </Card>
            <Card title="Source">
              <Breakdown rows={data.sourceBreakdown} />
            </Card>
          </div>

          <Card title="Geography">
            {data.canSeeGeography ? (
              <Breakdown rows={data.geography} />
            ) : (
              <div className="flex items-start gap-4 py-2">
                <div className="rounded-md bg-sand p-2 text-gold-dark">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Geography breakdown is a Pro feature.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See where your customers are trying on wigs from.{" "}
                    <Link to="/portal/billing" className="text-mahogany underline-offset-2 hover:underline">
                      Upgrade to Pro
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  prev,
  format,
}: {
  label: string;
  value: number;
  prev: number;
  format?: "percent";
}) {
  const display =
    format === "percent" ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();
  const delta = prev === 0 ? (value > 0 ? 1 : 0) : (value - prev) / prev;
  const Icon = delta > 0.001 ? ArrowUpRight : delta < -0.001 ? ArrowDownRight : Minus;
  const tone =
    delta > 0.001 ? "text-success" : delta < -0.001 ? "text-error" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl tabular-nums text-mahogany">{display}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-xs ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {prev === 0 && value === 0
          ? "no change"
          : `${Math.abs(delta * 100).toFixed(0)}% vs prev.`}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-gold-dark">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Breakdown({ rows }: { rows: { label: string; value: number }[] }) {
  if (rows.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="capitalize">{r.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">{r.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full bg-mahogany"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-display text-2xl text-mahogany">No data yet.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Paste your widget snippet on a product page to start collecting try-ons, clicks, and customer signals.
      </p>
      <Link
        to="/portal/widget"
        className="mt-6 inline-flex rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
      >
        Set up widget
      </Link>
    </div>
  );
}
