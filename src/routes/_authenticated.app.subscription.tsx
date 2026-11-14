import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { getMyConsumerProfile } from "@/lib/consumer-profile.functions";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/lib/subscription.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { planFeatures } from "@/lib/entitlements";
import { useCheckout } from "@/hooks/useCheckout";
import { getMyTryOnCredits } from "@/lib/topup.functions";
import { TRYON_PACKS, formatPackPrice } from "@/lib/topup";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:title", content: "Your subscription | Wigsmi" },
      { property: "og:description", content: "Manage your Wigsmi plan and billing." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Subscription - Wigsmi" },
      { name: "description", content: "Manage your Wigsmi plan, try-on quota, and billing." },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const fetchProfile = useServerFn(getMyConsumerProfile);
  const portal = useServerFn(createPortalSession);
  const { subscription, isActive, loading: subLoading } = useSubscription();

  const [consumer, setConsumer] = useState<{
    try_on_count_this_month: number;
    try_on_month_reset: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const creditsFn = useServerFn(getMyTryOnCredits);
  const { openCheckout } = useCheckout();
  const [creditCount, setCreditCount] = useState(0);
  const [packBusy, setPackBusy] = useState(false);

  // Purchased top-up packs sit on top of the monthly allowance.
  useEffect(() => {
    let on = true;
    creditsFn()
      .then((r) => on && setCreditCount(r.remaining))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [creditsFn]);

  const onBuyPack = async () => {
    setPackBusy(true);
    try {
      await openCheckout({
        priceId: TRYON_PACKS[0].priceId,
        successUrl: `${window.location.origin}/checkout/success?type=topup`,
      });
      // The provider's notification lands a moment later; re-read the balance.
      setTimeout(() => {
        creditsFn()
          .then((r) => setCreditCount(r.remaining))
          .catch(() => {});
      }, 4000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start checkout");
    } finally {
      setPackBusy(false);
    }
  };

  useEffect(() => {
    let on = true;
    fetchProfile()
      .then((r) => {
        if (!on) return;
        setConsumer(
          r.consumer
            ? {
                try_on_count_this_month: r.consumer.try_on_count_this_month ?? 0,
                try_on_month_reset: r.consumer.try_on_month_reset ?? "",
              }
            : null,
        );
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [fetchProfile]);

  const planLabel = useMemo(() => {
    if (isActive && subscription?.customer_type === "consumer") {
      const interval =
        subscription.billing_interval === "year"
          ? "Yearly"
          : subscription.billing_interval === "month"
            ? "Monthly"
            : "";
      return `${subscription.plan[0].toUpperCase()}${subscription.plan.slice(1)}${interval ? ` · ${interval}` : ""}`;
    }
    return "Free";
  }, [isActive, subscription]);

  const isFree = !isActive || subscription?.customer_type !== "consumer";
  const used = consumer?.try_on_count_this_month ?? 0;
  const quotaCap = planFeatures(
    isFree ? "free" : subscription?.plan === "pro" ? "pro" : "plus",
  ).monthlyTryOns;
  const pct = quotaCap ? Math.min(100, Math.round((used / quotaCap) * 100)) : 0;

  // Next reset = 1st of next month
  const nextReset = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }, []);

  const onManage = async () => {
    setPortalBusy(true);
    try {
      const result = await portal({
        data: { environment: getStripeEnvironment(), customerType: "consumer" },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open billing portal");
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Account</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">Your subscription</h1>

      {/* Current plan */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <p className="mt-1 font-display text-3xl text-mahogany">{planLabel}</p>
            {subscription?.cancel_at_period_end && subscription.current_period_end && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cancels on{" "}
                {new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          {!isFree && (
            <button
              onClick={onManage}
              disabled={portalBusy}
              className="inline-flex items-center gap-2 rounded-md border border-mahogany bg-card px-3 py-2 text-xs font-medium text-mahogany hover:bg-mahogany hover:text-cream disabled:opacity-50"
            >
              {portalBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage billing
            </button>
          )}
        </div>

        {isFree && (
          <Link
            to="/pricing"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to Plus
          </Link>
        )}
      </section>

      {/* Usage */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          This month
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="font-display text-2xl text-mahogany">
            {loading ? "…" : used} <span className="text-base text-foreground/70">try-ons</span>
          </p>
          <p className="text-sm text-muted-foreground">{`of ${quotaCap}`}</p>
        </div>
        {quotaCap !== null && (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sand/60">
              <div
                className={`h-full transition-[width] ${pct >= 100 ? "bg-error" : "bg-mahogany"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct >= 100 && (
              <p className="mt-3 text-xs text-error">
                {isFree
                  ? "You've hit your free limit. Upgrade to Plus for 35 try-ons a month."
                  : "You've reached this month's fair-use allowance. It resets on the date below."}
              </p>
            )}
          </>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Resets on{" "}
          {nextReset.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>

        {/* Purchased top-ups: tried after the monthly allowance runs out. */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-sand/40 p-4">
          <div>
            <p className="text-sm font-medium text-mahogany">
              {creditCount > 0
                ? `${creditCount} extra try-on${creditCount === 1 ? "" : "s"} ready to use`
                : "No extra try-ons yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              One-off pack, used only after this month's allowance. No renewal.
            </p>
          </div>
          <button
            onClick={onBuyPack}
            disabled={packBusy}
            className="inline-flex items-center gap-2 rounded-md bg-mahogany px-4 py-2 text-xs font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            {packBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add {TRYON_PACKS[0].credits} for {formatPackPrice(TRYON_PACKS[0])}
          </button>
        </div>
      </section>

      {/* Compare plans */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="font-display text-lg text-mahogany">Want more?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          See all plans, including yearly savings on Plus and Pro.
        </p>
        <Link
          to="/pricing"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-mahogany underline-offset-4 hover:underline"
        >
          Compare plans →
        </Link>
      </section>

      {/* Account links */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="font-display text-lg text-mahogany">Account</p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link to="/app/profile" className="text-mahogany underline-offset-4 hover:underline">
              Edit your profile →
            </Link>
          </li>
          <li>
            <Link to="/app/style-quiz" className="text-mahogany underline-offset-4 hover:underline">
              Retake the style quiz →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
