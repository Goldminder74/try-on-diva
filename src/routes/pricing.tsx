import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { useCheckout } from "@/hooks/useCheckout";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useServerFn } from "@tanstack/react-start";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createPortalSession,
  previewPlanChange,
} from "@/lib/subscription.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { TRYON_PACKS, formatPackPrice } from "@/lib/topup";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { formatMinor, formatPlanPrice, formatZero, priceMinor, type PlanCurrency } from "@/lib/plan-prices";
import { CurrencySwitch, usePlanCurrency } from "@/hooks/usePlanCurrency";

/** Price lines for a paid plan, read from the shared Stripe-matching config. */
function planDisplay(ids: PriceMap, currency: PlanCurrency) {
  if (!ids.monthly || !ids.yearly) {
    const z = formatZero(currency);
    return { monthly: z, yearly: z, monthlyEquivYearly: undefined, yearlySavings: undefined };
  }
  const m = priceMinor(ids.monthly, currency);
  const y = priceMinor(ids.yearly, currency);
  return {
    monthly: formatPlanPrice(ids.monthly, currency),
    yearly: formatPlanPrice(ids.yearly, currency),
    monthlyEquivYearly: formatMinor(Math.round(y / 12), currency),
    yearlySavings: formatMinor(m * 12 - y, currency),
  };
}

export const Route = createFileRoute("/pricing")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://wigsmi.com/pricing" }],
    meta: [
      { property: "og:url", content: "https://wigsmi.com/pricing" },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Pricing - Wigsmi" },
      { name: "description", content: "Wigsmi pricing for consumers. Start free with 5 try-ons a month, or get 35 a month from £4.99/month." },
      { property: "og:title", content: "Pricing - Wigsmi" },
      { property: "og:description", content: "Free, Plus and Pro plans for Wigsmi consumers." },
    ],
  }),
  component: Pricing,
});

type PriceMap = { monthly: string | null; yearly: string | null };

const PLANS: {
  name: string;
  desc: string;
  badge?: string;
  priceIds: PriceMap;
  features: readonly (readonly [boolean, string])[];
  planKey: "free" | "plus" | "pro";
}[] = [
  {
    name: "Free",
    desc: "Browse the full catalog and try out the AI.",
    priceIds: { monthly: null, yearly: null },
    planKey: "free",
    features: [
      [true, "5 try-ons per month (2 without an account)"],
      [true, "Full catalog access"],
      [true, "Save up to 10 wigs"],
      [false, "35+ try-ons per month"],
      [false, "Style quiz personalisation"],
      [false, "Early access to new drops"],
    ] as const,
  },
  {
    name: "Plus",
    desc: "35 try-ons a month and personalised picks.",
    badge: "Most popular",
    priceIds: { monthly: "consumer_plus_monthly", yearly: "consumer_plus_yearly" },
    planKey: "plus",
    features: [
      [true, "35 try-ons per month"],
      [true, "Full catalog access"],
      [true, "Unlimited wishlist"],
      [true, "Style quiz personalisation"],
      [true, "Save your selfie"],
      [true, "30 days of try-on history"],
      [false, "Watermark-free downloads"],
    ] as const,
  },
  {
    name: "Pro",
    desc: "Watermark-free downloads, full history and priority quality.",
    priceIds: { monthly: "consumer_pro_monthly", yearly: "consumer_pro_yearly" },
    planKey: "pro",
    features: [
      [true, "100 try-ons per month"],
      [true, "Everything in Plus"],
      [true, "Downloads with no watermark"],
      [true, "Full try-on history kept forever"],
      [true, "Priority, highest quality try-ons"],
      [true, "Early access to new drops"],
      [true, "Priority support"],
    ] as const,
  },
];

interface PreviewState {
  planKey: string;
  planName: string;
  priceId: string;
  currency: string;
  immediateAmount: number;
  nextAmount: number;
  nextBilledAt: string | null;
}

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, loading: checkoutLoading } = useCheckout();
  const { subscription, isActive } = useSubscription();
  const changePlan = useServerFn(changeSubscriptionPlan);
  const portal = useServerFn(createPortalSession);
  const preview = useServerFn(previewPlanChange);
  const cancelSub = useServerFn(cancelSubscription);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { currency } = usePlanCurrency();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [confirmingSwitch, setConfirmingSwitch] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const currentPlanKey =
    isActive && subscription?.customer_type === "consumer" ? subscription.plan : "free";
  const isConsumerSub =
    isActive &&
    subscription?.customer_type === "consumer" &&
    subscription.stripe_subscription_id !== null;

  const onChoose = async (priceId: string | null, planName: string, planKey: string) => {
    if (!priceId) {
      navigate({ to: "/auth/signup" });
      return;
    }
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    setBusyId(planKey);
    try {
      if (isConsumerSub) {
        const env = getStripeEnvironment();
        const p = await preview({
          data: { newPriceId: priceId, environment: env, customerType: "consumer" },
        });
        if ("error" in p) throw new Error(p.error);
        setPreviewState({
          planKey,
          planName,
          priceId,
          currency: p.currency,
          immediateAmount: p.immediateAmount,
          nextAmount: p.nextAmount,
          nextBilledAt: p.nextBilledAt,
        });
        return;
      }
      await openCheckout({
        priceId,
        currency,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id, plan: planName },
        successUrl: `${window.location.origin}/checkout/success?type=consumer`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const onBuyPack = async () => {
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    const pack = TRYON_PACKS[0];
    setBusyId("pack");
    try {
      await openCheckout({
        priceId: pack.priceId,
        currency,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/checkout/success?type=topup`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const onConfirmSwitch = async () => {
    if (!previewState) return;
    setConfirmingSwitch(true);
    try {
      const res = (await changePlan({
        data: {
          newPriceId: previewState.priceId,
          environment: getStripeEnvironment(),
          customerType: "consumer",
        },
      })) as { error?: string } | undefined;
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Plan updated. Your account will refresh in a few seconds.");
      setPreviewState(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update plan");
    } finally {
      setConfirmingSwitch(false);
    }
  };

  const onConfirmCancel = async () => {
    setBusyId("cancel");
    try {
      const res = (await cancelSub({
        data: { environment: getStripeEnvironment(), customerType: "consumer" },
      })) as { error?: string } | undefined;
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Subscription cancelled. You keep access until the end of your billing period.");
      setConfirmCancel(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel subscription");
    } finally {
      setBusyId(null);
    }
  };

  const onManage = async () => {
    setBusyId("portal");
    try {
      const result = await portal({
        data: { environment: getStripeEnvironment(), customerType: "consumer" },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open portal");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Pricing</p>
          <h1 className="mt-2 font-display text-5xl text-mahogany md:text-6xl">Simple. Warm. Yours.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Start free. Upgrade only if Wigsmi becomes part of your routine.</p>

          <div className="mt-7 inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                interval === "monthly" ? "bg-mahogany text-cream" : "text-foreground/70"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                interval === "yearly" ? "bg-mahogany text-cream" : "text-foreground/70"
              }`}
            >
              Yearly <span className="ml-1 text-gold">-35%</span>
            </button>
          </div>
          <div className="mt-3">
            <CurrencySwitch />
          </div>

          {isActive && subscription?.customer_type === "consumer" && (
            <p className="mt-4 text-xs text-muted-foreground">
              You're on{" "}
              <span className="capitalize text-foreground">
                {subscription.plan}
                {subscription.billing_interval === "year" ? " · Yearly" : subscription.billing_interval === "month" ? " · Monthly" : ""}
              </span>
              .{" "}
              <button onClick={onManage} className="text-mahogany underline" disabled={busyId === "portal"}>
                Manage subscription
              </button>
              {isConsumerSub && subscription?.status !== "canceled" && (
                <>
                  {" · "}
                  <button onClick={() => setConfirmCancel(true)} className="text-mahogany underline">
                    Cancel
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map(p => {
            const priceId = p.priceIds[interval];
            const isCurrent = currentPlanKey === p.planKey;
            const busy = busyId === p.planKey || (busyId === null && checkoutLoading);
            const d = planDisplay(p.priceIds, currency);
            const showYearly = interval === "yearly" && p.planKey !== "free";
            return (
              <div
                key={p.name}
                className={`relative rounded-xl border bg-card p-7 shadow-[var(--shadow-card)] ${
                  p.badge ? "border-gold ring-1 ring-gold" : "border-border"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">
                    {p.badge}
                  </span>
                )}
                <p className="font-display text-2xl text-mahogany">{p.name}</p>
                {showYearly && d.monthlyEquivYearly ? (
                  <>
                    <p className="mt-3 font-mono text-4xl text-foreground">{d.monthlyEquivYearly}</p>
                    <p className="text-xs text-muted-foreground">per month, billed annually ({d.yearly}/yr)</p>
                    {d.yearlySavings && (
                      <p className="mt-1 text-xs font-medium text-gold-dark">Save {d.yearlySavings}/yr</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-mono text-4xl text-foreground">{d[interval]}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.planKey === "free" ? "forever" : "per month"}
                    </p>
                  </>
                )}
                <p className="mt-4 text-sm text-foreground/80">{p.desc}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map(([on, label], i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {on
                        ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />}
                      <span className={on ? "text-foreground" : "text-muted-foreground line-through"}>{label}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-7 rounded-md border border-mahogany/20 bg-mahogany/5 py-2 text-center text-xs font-mono uppercase tracking-wider text-mahogany">
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => onChoose(priceId, p.name, p.planKey)}
                    disabled={busy}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-center text-sm font-medium transition-all disabled:opacity-50 ${
                      p.badge
                        ? "bg-mahogany text-cream hover:bg-mahogany-soft"
                        : "border border-mahogany text-mahogany hover:bg-mahogany hover:text-cream"
                    }`}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {p.planKey === "free"
                      ? "Start free"
                      : isConsumerSub
                        ? `Switch to ${p.name}`
                        : `Choose ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-gold/40 bg-gold/10 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="font-display text-2xl text-mahogany">
              Need more this month?
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              {TRYON_PACKS[0].label} for {formatPackPrice(TRYON_PACKS[0], currency)} - a one-off
              top-up on any plan, yours to use for {TRYON_PACKS[0].validMonths} months.
              Your monthly allowance is always used first.
            </p>
          </div>
          <button
            onClick={onBuyPack}
            disabled={busyId === "pack"}
            className="mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50 md:mt-0"
          >
            {busyId === "pack" && <Loader2 className="h-4 w-4 animate-spin" />}
            Add {TRYON_PACKS[0].credits} try-ons
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Wigsmi is not VAT registered, so no VAT is added to our prices. Payments processed securely by Stripe.
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Are you a wig retailer? <Link to="/retailer" className="text-mahogany underline">See retailer plans →</Link>
        </p>
      </div>

      <AlertDialog
        open={!!previewState}
        onOpenChange={(open) => !open && setPreviewState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {previewState?.planName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {previewState && previewState.immediateAmount > 0 && (
                  <p>
                    You'll be charged{" "}
                    <span className="font-medium text-foreground">
                      {formatMinor(previewState.immediateAmount, previewState.currency)}
                    </span>{" "}
                    today (prorated).
                  </p>
                )}
                {previewState && previewState.immediateAmount < 0 && (
                  <p>
                    You'll receive a credit of{" "}
                    <span className="font-medium text-foreground">
                      {formatMinor(Math.abs(previewState.immediateAmount), previewState.currency)}
                    </span>{" "}
                    toward your next invoice.
                  </p>
                )}
                {previewState && previewState.immediateAmount === 0 && (
                  <p>No charge today.</p>
                )}
                {previewState?.nextBilledAt && (
                  <p className="text-muted-foreground">
                    Next renewal: {formatMinor(previewState.nextAmount, previewState.currency)} on{" "}
                    {new Date(previewState.nextBilledAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSwitch} disabled={confirmingSwitch}>
              {confirmingSwitch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep your current plan until{" "}
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })
                : "the end of this billing period"}
              , then move to Free. You can resubscribe any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === "cancel"}>Keep my plan</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCancel} disabled={busyId === "cancel"}>
              {busyId === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
