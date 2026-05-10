import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useServerFn } from "@tanstack/react-start";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createPortalSession,
  previewPlanChange,
} from "@/lib/subscription.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
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

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Wigsmi" },
      { name: "description", content: "Wigsmi pricing for consumers. Start free with 5 try-ons a month, or go unlimited from £4.99/month." },
      { property: "og:title", content: "Pricing — Wigsmi" },
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
  prices: { monthly: string; yearly: string };
  priceIds: PriceMap;
  features: readonly (readonly [boolean, string])[];
  planKey: "free" | "plus" | "pro";
}[] = [
  {
    name: "Free",
    desc: "Browse the full catalog and try out the AI.",
    prices: { monthly: "£0", yearly: "£0" },
    priceIds: { monthly: null, yearly: null },
    planKey: "free",
    features: [
      [true, "5 try-ons per month"],
      [true, "Full catalog access"],
      [true, "Save up to 10 wigs"],
      [false, "Unlimited try-ons"],
      [false, "Style quiz personalisation"],
      [false, "Early access to new drops"],
    ] as const,
  },
  {
    name: "Plus",
    desc: "Unlimited try-ons and personalised picks.",
    badge: "Most popular",
    prices: { monthly: "£4.99", yearly: "£38.92" },
    priceIds: { monthly: "consumer_plus_monthly", yearly: "consumer_plus_yearly" },
    planKey: "plus",
    features: [
      [true, "Unlimited try-ons"],
      [true, "Full catalog access"],
      [true, "Unlimited wishlist"],
      [true, "Style quiz personalisation"],
      [true, "Save your selfie"],
      [false, "Early access to new drops"],
    ] as const,
  },
  {
    name: "Pro",
    desc: "Everything, plus first-look at new arrivals.",
    prices: { monthly: "£9.99", yearly: "£77.92" },
    priceIds: { monthly: "consumer_pro_monthly", yearly: "consumer_pro_yearly" },
    planKey: "pro",
    features: [
      [true, "Everything in Plus"],
      [true, "Early access to new drops"],
      [true, "Priority support"],
      [true, "Exclusive style edits"],
    ] as const,
  },
];

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const { subscription, isActive } = useSubscription();
  const changePlan = useServerFn(changeSubscriptionPlan);
  const portal = useServerFn(createPortalSession);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const currentPlanKey =
    isActive && subscription?.customer_type === "consumer" ? subscription.plan : "free";

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
      // If user already has an active consumer subscription, switch instead of new checkout.
      if (
        isActive &&
        subscription?.customer_type === "consumer" &&
        subscription.paddle_subscription_id !== null
      ) {
        await changePlan({
          data: { newPriceId: priceId, environment: getPaddleEnvironment() },
        });
        toast.success("Plan updated. Your account will refresh in a few seconds.");
        return;
      }
      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id, plan: planName },
        successUrl: `${window.location.origin}/checkout/success`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const onManage = async () => {
    setBusyId("portal");
    try {
      const { url } = await portal({ data: { environment: getPaddleEnvironment() } });
      window.open(url, "_blank", "noopener");
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

          {isActive && subscription?.customer_type === "consumer" && (
            <p className="mt-4 text-xs text-muted-foreground">
              You're on <span className="capitalize text-foreground">{subscription.plan}</span>.{" "}
              <button onClick={onManage} className="text-mahogany underline" disabled={busyId === "portal"}>
                Manage subscription
              </button>
            </p>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map(p => {
            const priceId = p.priceIds[interval];
            const isCurrent = currentPlanKey === p.planKey;
            const busy = busyId === p.planKey || (busyId === null && checkoutLoading);
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
                <p className="mt-3 font-mono text-4xl text-foreground">{p.prices[interval]}</p>
                <p className="text-xs text-muted-foreground">
                  {p.planKey === "free" ? "forever" : interval === "monthly" ? "per month" : "per year"}
                </p>
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
                      : isActive && subscription?.customer_type === "consumer"
                        ? `Switch to ${p.name}`
                        : `Choose ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Are you a wig retailer? <Link to="/retailer" className="text-mahogany underline">See retailer plans →</Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
