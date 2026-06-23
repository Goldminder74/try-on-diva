import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import {
  RETAILER_PLANS,
  type BillingInterval,
  type RetailerPlanId,
} from "@/lib/retailer-plans";
import { toast } from "sonner";

interface RetailerPlanCardsProps {
  /** Currently active paid plan, if any - used to render a "Current plan" pill. */
  currentPlanId?: RetailerPlanId | null;
  /** Where to redirect after successful Paddle checkout. */
  successUrl?: string;
  /** Label override for the action button (e.g. "Switch to"). */
  ctaLabel?: (planName: string) => string;
  /** When true and the user isn't signed in, send them to retailer signup
   * with a return URL instead of opening checkout. */
  requireSignup?: boolean;
  /** Path to send unauthenticated users to for the trial signup. */
  signupHref?: string;
  /** Called when a signed-in user with an existing subscription clicks a
   * different plan. Lets the parent show a prorated preview dialog and
   * call changeSubscriptionPlan instead of opening a new checkout. */
  onSwitch?: (planId: RetailerPlanId, priceId: string, planName: string) => void;
}

/**
 * Reusable retailer plan grid with monthly/yearly toggle and working
 * Paddle checkout buttons. Used on /retailer (public marketing),
 * /portal/billing (signed-in management), and inside TrialExpiredPaywall.
 */
export function RetailerPlanCards({
  currentPlanId,
  successUrl,
  ctaLabel,
  requireSignup,
  signupHref = "/retailer/signup",
  onSwitch,
}: RetailerPlanCardsProps) {
  const { user } = useAuth();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<string | null>(null);

  const onChoose = async (planId: RetailerPlanId, priceId: string, planName: string) => {
    if (requireSignup || !user) {
      // Marketing page flow - send to retailer signup with the chosen plan.
      const url = `${signupHref}?plan=${planId}&interval=${interval}`;
      window.location.href = url;
      return;
    }
    // Existing subscription → delegate to prorated in-place switch flow.
    if (currentPlanId && onSwitch) {
      onSwitch(planId, priceId, planName);
      return;
    }
    setBusy(planId);
    try {
      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id, plan: planId },
        successUrl:
          successUrl ||
          `${window.location.origin}/checkout/success?type=retailer`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            interval === "monthly"
              ? "bg-mahogany text-cream"
              : "text-foreground/70"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("yearly")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            interval === "yearly"
              ? "bg-mahogany text-cream"
              : "text-foreground/70"
          }`}
        >
          Yearly <span className="ml-1 text-gold">-35%</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {RETAILER_PLANS.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const priceId = p.priceIds[interval];
          const busyHere = busy === p.id || (busy === null && checkoutLoading);
          const periodLabel = interval === "monthly" ? "per month" : "per year";
          return (
            <div
              key={p.id}
              className={`relative rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] ${
                p.badge ? "border-gold ring-1 ring-gold" : "border-border"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">
                  {p.badge}
                </span>
              )}
              <p className="font-display text-xl text-mahogany">{p.name}</p>
              <p className="mt-3 font-mono text-3xl">{p.prices[interval]}</p>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="mt-6 rounded-md border border-mahogany/20 bg-mahogany/5 py-2 text-center font-mono text-xs uppercase tracking-wider text-mahogany">
                  Current plan
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onChoose(p.id, priceId, p.name)}
                  disabled={busyHere}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-mahogany py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
                >
                  {busyHere ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {ctaLabel
                    ? ctaLabel(p.name)
                    : requireSignup || !user
                      ? "Start free trial"
                      : currentPlanId
                        ? `Switch to ${p.name}`
                        : `Subscribe - ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(requireSignup || !user) && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          All plans start with a 1-month free trial. No card required upfront.{" "}
          <Link to="/retailer/login" className="text-mahogany underline">
            Already have an account?
          </Link>
        </p>
      )}
    </div>
  );
}
