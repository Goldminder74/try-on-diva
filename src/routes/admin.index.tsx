import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview, getRecentSignups } from "@/lib/admin.functions";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const overviewFn = useServerFn(getAdminOverview);
  const signupsFn = useServerFn(getRecentSignups);
  const [overview, setOverview] = useState<any>(null);
  const [signups, setSignups] = useState<any>(null);
  const [tab, setTab] = useState<"retailers" | "consumers">("retailers");

  useEffect(() => {
    overviewFn({}).then(setOverview).catch(() => setOverview({}));
    signupsFn({}).then(setSignups).catch(() => setSignups({ retailers: [], consumers: [] }));
  }, [overviewFn, signupsFn]);

  if (!overview) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Platform</p>
        <h1 className="mt-1 font-display text-3xl text-mahogany">Overview</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Retailers" value={overview.totalRetailers} hint={`${overview.activeRetailers} active`} />
        <Kpi label="Consumers" value={overview.totalConsumers} />
        <Kpi label="Wigs" value={overview.totalWigs} />
        <Kpi label="Try-ons (30d)" value={overview.tryOns30d} hint={`${overview.clicks30d} clicks`} />
        <Kpi label="MRR (est.)" value={`£${overview.mrr.toLocaleString()}`} />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg text-mahogany">Try-ons · last 30 days</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview.timeseries}>
              <defs>
                <linearGradient id="adminGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--mahogany)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--mahogany)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="var(--mahogany)" fill="url(#adminGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-mahogany">Recent signups</h2>
          <div className="inline-flex rounded-full border border-border p-1 text-xs">
            <button onClick={() => setTab("retailers")} className={`rounded-full px-3 py-1 ${tab === "retailers" ? "bg-mahogany text-cream" : "text-foreground/70"}`}>Retailers</button>
            <button onClick={() => setTab("consumers")} className={`rounded-full px-3 py-1 ${tab === "consumers" ? "bg-mahogany text-cream" : "text-foreground/70"}`}>Consumers</button>
          </div>
        </div>
        {!signups ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === "retailers" ? (
          <ul className="divide-y divide-border text-sm">
            {(signups.retailers ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>{r.business_name} <span className="text-muted-foreground">· {r.country ?? "-"}</span></span>
                <span className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </li>
            ))}
            {!signups.retailers?.length && <li className="py-2 text-muted-foreground">No retailers yet.</li>}
          </ul>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(signups.consumers ?? []).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.display_name || c.email} <span className="text-muted-foreground">· {c.country ?? "-"}</span></span>
                <span className="font-mono text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </li>
            ))}
            {!signups.consumers?.length && <li className="py-2 text-muted-foreground">No consumers yet.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-mahogany">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
