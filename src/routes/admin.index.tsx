import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminOverview,
  getOutreachStatus,
  getRecentSignups,
  startGmailConnect,
} from "@/lib/admin.functions";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview - Wigsmi Admin" },
      {
        name: "description",
        content: "Platform overview of Wigsmi shoppers, retailers and activity.",
      },
      { property: "og:title", content: "Overview - Wigsmi Admin" },
      {
        property: "og:description",
        content: "Platform overview of Wigsmi shoppers, retailers and activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: OverviewPage,
});

function OverviewPage() {
  const overviewFn = useServerFn(getAdminOverview);
  const signupsFn = useServerFn(getRecentSignups);
  const [overview, setOverview] = useState<any>(null);
  const [signups, setSignups] = useState<any>(null);
  const [tab, setTab] = useState<"retailers" | "consumers">("retailers");

  useEffect(() => {
    overviewFn({})
      .then(setOverview)
      .catch(() => setOverview({}));
    signupsFn({})
      .then(setSignups)
      .catch(() => setSignups({ retailers: [], consumers: [] }));
  }, [overviewFn, signupsFn]);

  if (!overview) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Platform</p>
        <h1 className="mt-1 font-display text-3xl text-mahogany">Overview</h1>
      </div>

      <OutreachSending />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          label="Retailers"
          value={overview.totalRetailers}
          hint={`${overview.activeRetailers} active`}
        />
        <Kpi label="Consumers" value={overview.totalConsumers} />
        <Kpi label="Wigs" value={overview.totalWigs} />
        <Kpi
          label="Try-ons (30d)"
          value={overview.tryOns30d}
          hint={`${overview.clicks30d} clicks`}
        />
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
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--mahogany)"
                fill="url(#adminGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-mahogany">Recent sign-ups</h2>
          <div className="inline-flex rounded-full border border-border p-1 text-xs">
            <button
              onClick={() => setTab("retailers")}
              className={`rounded-full px-3 py-1 ${tab === "retailers" ? "bg-mahogany text-cream" : "text-foreground/70"}`}
            >
              Retailers
            </button>
            <button
              onClick={() => setTab("consumers")}
              className={`rounded-full px-3 py-1 ${tab === "consumers" ? "bg-mahogany text-cream" : "text-foreground/70"}`}
            >
              Consumers
            </button>
          </div>
        </div>
        {!signups ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === "retailers" ? (
          <ul className="divide-y divide-border text-sm">
            {(signups.retailers ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>
                  {r.business_name}{" "}
                  <span className="text-muted-foreground">· {r.country ?? "-"}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!signups.retailers?.length && (
              <li className="py-2 text-muted-foreground">No retailers yet.</li>
            )}
          </ul>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(signups.consumers ?? []).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>
                  {c.display_name || c.email}{" "}
                  <span className="text-muted-foreground">· {c.country ?? "-"}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!signups.consumers?.length && (
              <li className="py-2 text-muted-foreground">No consumers yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-mahogany">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const GMAIL_RESULTS: Record<string, string> = {
  connected: "Gmail connected. Retailer email now sends from info@wigsmi.com with plain links.",
  cancelled: "Gmail connection cancelled.",
  expired: "That connection link expired. Press Connect Gmail again.",
  "wrong-account": "Google returned a different account. Choose info@wigsmi.com when Google asks.",
  "no-refresh-token": "Google did not grant lasting access. Press Connect Gmail again.",
  "not-configured": "The Google sign-in keys are not in the site secrets yet.",
  error: "Google refused the connection. Try again, or check the Google Cloud set-up.",
};

function OutreachSending() {
  const statusFn = useServerFn(getOutreachStatus);
  const connectFn = useServerFn(startGmailConnect);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("gmail");
    if (result) setMessage(GMAIL_RESULTS[result] ?? null);
    statusFn({})
      .then(setStatus)
      .catch(() => setStatus({ error: true }));
  }, [statusFn]);

  async function connect() {
    setBusy(true);
    setMessage(null);
    try {
      const { url } = await connectFn({});
      window.location.href = url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not start the Gmail connection.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase text-gold-dark">Retailer email</p>
      <h2 className="mt-1 font-display text-lg text-mahogany">Sending from Gmail</h2>
      {!status ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      ) : status.error ? (
        <p className="mt-2 text-sm text-muted-foreground">Status unavailable.</p>
      ) : (
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>
            {status.connectedEmail
              ? `Connected as ${status.connectedEmail} since ${new Date(status.connectedAt).toLocaleString("en-GB")}.`
              : `Not connected. Emails stay queued until ${status.sender} is connected.`}
          </p>
          <p>
            Sent in the last 24 hours: {status.sent24h}. Waiting to send: {status.queued}. Rejected
            or failed in the last 24 hours: {status.problems24h}.
          </p>
          {status.lastResult && <p>Last connection attempt: {status.lastResult}</p>}
          {!status.clientConfigured && (
            <p>
              Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to the site secrets first.
            </p>
          )}
        </div>
      )}
      {message && <p className="mt-3 text-sm text-foreground">{message}</p>}
      <button
        type="button"
        onClick={connect}
        disabled={busy || !status?.clientConfigured}
        className="mt-4 bg-bordeaux px-5 py-2 font-mono text-xs uppercase text-champagne disabled:opacity-50"
      >
        {status?.connectedEmail ? "Reconnect Gmail" : "Connect Gmail"}
      </button>
    </div>
  );
}
