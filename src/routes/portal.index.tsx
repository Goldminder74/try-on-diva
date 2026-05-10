import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRetailerContext, getRetailerMetrics } from "@/lib/retailer.functions";
import { Plus, TrendingUp, Eye, MousePointerClick, Package } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Dashboard — Wigsmi Retailer" }] }),
  component: PortalIndex,
});

function PortalIndex() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getMyRetailerContext);
  const getMetrics = useServerFn(getRetailerMetrics);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getMetrics>> | null>(
    null,
  );
  const [retailerName, setRetailerName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = await getCtx();
      if (cancelled) return;
      if (!ctx.retailer || !ctx.retailer.onboarding_completed) {
        navigate({ to: "/portal/onboarding" });
        return;
      }
      setRetailerName(ctx.retailer.display_name);
      const m = await getMetrics();
      if (!cancelled) {
        setMetrics(m);
        setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [getCtx, getMetrics, navigate]);

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  const trialEnds = metrics?.retailer?.trial_ends_at
    ? new Date(metrics.retailer.trial_ends_at)
    : null;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
            Dashboard
          </p>
          <h1 className="mt-1 font-display text-4xl text-mahogany">
            Welcome, {retailerName}.
          </h1>
        </div>
        <Link
          to="/portal/catalog/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-mahogany px-4 py-2 text-sm text-cream hover:bg-mahogany-soft"
        >
          <Plus className="h-4 w-4" /> Add wig
        </Link>
      </div>

      {daysLeft !== null && metrics?.retailer?.plan === "starter" && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold-dark">
          <strong className="font-medium">Free trial:</strong> {daysLeft} days remaining.
          Your card is never charged automatically.
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Wigs in catalog"
          value={metrics?.wigs ?? 0}
          icon={<Package className="h-4 w-4" />}
        />
        <Stat
          label="Published"
          value={metrics?.published ?? 0}
          icon={<Eye className="h-4 w-4" />}
        />
        <Stat
          label="Try-ons (30d)"
          value={metrics?.tryOns30d ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Product clicks (30d)"
          value={metrics?.clicks30d ?? 0}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl text-mahogany">Get up and running</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <Step
            done={(metrics?.wigs ?? 0) > 0}
            text="Add your first wig"
            to="/portal/catalog/new"
          />
          <Step
            done={(metrics?.published ?? 0) > 0}
            text="Publish at least one wig"
            to="/portal/catalog"
          />
          <Step done={false} text="Embed the widget on your store (coming next)" />
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-mono text-[11px] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-display text-3xl text-mahogany">{value}</p>
    </div>
  );
}

function Step({ done, text, to }: { done: boolean; text: string; to?: string }) {
  const body = (
    <span className={`flex items-center gap-2 ${done ? "text-muted-foreground line-through" : ""}`}>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
          done ? "border-success bg-success/10 text-success" : "border-border"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      {text}
    </span>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="hover:text-mahogany">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
