import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyRetailerContext,
  getRetailerMetrics,
  getActivationStatus,
} from "@/lib/retailer.functions";
import { Plus, TrendingUp, Eye, MousePointerClick, Package, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "Dashboard — Wigsmi Retailer" }] }),
  component: PortalIndex,
});

type Activation = Awaited<ReturnType<typeof getActivationStatus>>;

function PortalIndex() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getMyRetailerContext);
  const getMetrics = useServerFn(getRetailerMetrics);
  const getActivation = useServerFn(getActivationStatus);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getMetrics>> | null>(
    null,
  );
  const [activation, setActivation] = useState<Activation | null>(null);
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
      const [m, a] = await Promise.all([getMetrics(), getActivation()]);
      if (!cancelled) {
        setMetrics(m);
        setActivation(a);
        setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [getCtx, getMetrics, getActivation, navigate]);

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

      {activation && <ActivationCard activation={activation} />}
    </div>
  );
}

function ActivationCard({ activation }: { activation: Activation }) {
  const steps = [
    {
      key: "profile",
      done: activation.profileDone,
      title: "Finish your profile",
      helper: "Brand name, currency, primary color.",
      to: "/portal/settings",
      cta: "Edit profile",
    },
    {
      key: "wig",
      done: activation.hasWig,
      title: "Add your first wig",
      helper: "Photos, price, style — at least one wig.",
      to: "/portal/catalog/new",
      cta: "Add a wig",
    },
    {
      key: "published",
      done: activation.hasPublished,
      title: "Publish a wig",
      helper: "Toggle a wig to published so shoppers can see it.",
      to: "/portal/catalog",
      cta: "Open catalog",
    },
    {
      key: "widget",
      done: activation.hasWidget,
      title: "Create your widget",
      helper: "Configure how the try-on appears on your store.",
      to: "/portal/widget",
      cta: "Set up widget",
    },
    {
      key: "embed",
      done: activation.hasFirstTryOn,
      title: "Embed on your store",
      helper: "Paste the snippet on your product or home page.",
      to: "/portal/widget",
      cta: "Get snippet",
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const activeIndex = steps.findIndex((s) => !s.done);

  if (allDone) {
    return (
      <div className="mt-10 flex items-center justify-between rounded-2xl border border-success/40 bg-success/5 p-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-success">
            You're live
          </p>
          <h2 className="mt-1 font-display text-2xl text-mahogany">
            Everything's set up.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your widget is on your store and shoppers are trying on wigs.
          </p>
        </div>
        <Link
          to="/portal/widget"
          className="inline-flex items-center gap-1.5 rounded-md bg-mahogany px-4 py-2 text-sm text-cream hover:bg-mahogany-soft"
        >
          View widget <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-mahogany">Get up and running</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {doneCount} of {steps.length} done.
          </p>
        </div>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-sand/50">
          <div
            className="h-full rounded-full bg-mahogany transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
              s.done
                ? "border-transparent bg-transparent"
                : i === activeIndex
                  ? "border-mahogany/30 bg-sand/40"
                  : "border-border bg-card"
            }`}
          >
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                s.done
                  ? "bg-gold text-mahogany"
                  : i === activeIndex
                    ? "bg-mahogany text-cream"
                    : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${
                  s.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {s.title}
              </p>
              {!s.done && i === activeIndex && (
                <p className="mt-0.5 text-xs text-muted-foreground">{s.helper}</p>
              )}
            </div>
            {!s.done && (
              <Link
                to={s.to}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${
                  i === activeIndex
                    ? "bg-mahogany text-cream hover:bg-mahogany-soft"
                    : "border border-border text-foreground hover:border-mahogany hover:text-mahogany"
                }`}
              >
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
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
