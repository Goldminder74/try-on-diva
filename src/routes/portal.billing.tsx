import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useServerFn } from "@tanstack/react-start";
import { changeSubscriptionPlan, createPortalSession } from "@/lib/subscription.functions";
import { CheckCircle2, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/billing")({
  component: BillingPage,
});

const RETAILER_PLANS = [
  {
    id: "starter",
    name: "Starter (Trial)",
    price: "Free",
    period: "for 3 months",
    priceId: null as string | null,
    desc: "Get started with up to 30 wigs.",
    features: ["Up to 30 wigs", "Basic analytics", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "£149",
    period: "per month",
    priceId: "retailer_growth_monthly" as string | null,
    desc: "Up to 150 wigs and full analytics.",
    badge: "Most popular",
    features: ["Up to 150 wigs", "Full analytics", "Priority email"],
  },
  {
    id: "scale",
    name: "Scale",
    price: "£399",
    period: "per month",
    priceId: "retailer_scale_monthly" as string | null,
    desc: "Unlimited wigs, premium support.",
    features: ["Unlimited wigs", "Multi-store", "Priority phone support"],
  },
];

interface CurrentSub {
  plan: string;
  status: string;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
}

function BillingPage() {
  const { user } = useAuth();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const changePlan = useServerFn(changeSubscriptionPlan);
  const portal = useServerFn(createPortalSession);
  const [sub, setSub] = useState<CurrentSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refetch = () => {
    if (!user) return;
    const env = getPaddleEnvironment();
    supabase
      .from("subscriptions")
      .select("plan, status, paddle_subscription_id, current_period_end")
      .eq("user_id", user.id)
      .eq("customer_type", "retailer")
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSub((data as CurrentSub | null) ?? null));
  };

  useEffect(() => {
    refetch();
    if (!user) return;
    const channel = supabase
      .channel(`retailer-subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isPaidActive =
    !!sub &&
    ["active", "trialing", "past_due"].includes(sub.status) &&
    (sub.plan === "growth" || sub.plan === "scale");

  const currentPlanId = isPaidActive ? sub!.plan : "starter";

  const onChoose = async (priceId: string | null, planId: string) => {
    if (!priceId || !user) return;
    setBusy(planId);
    try {
      if (isPaidActive && sub?.paddle_subscription_id) {
        await changePlan({
          data: { newPriceId: priceId, environment: getPaddleEnvironment() },
        });
        toast.success("Plan updated.");
        return;
      }
      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id, plan: planId },
        successUrl: `${window.location.origin}/portal/billing`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  };

  const onManage = async () => {
    setBusy("portal");
    try {
      const { url } = await portal({ data: { environment: getPaddleEnvironment() } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open portal");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Billing</p>
        <h1 className="mt-1 font-display text-3xl text-mahogany">Your plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Current plan: <span className="font-medium capitalize text-foreground">{currentPlanId}</span>
          {sub?.status && (
            <>
              {" "}· Status: <span className="capitalize">{sub.status}</span>
            </>
          )}
        </p>
        {sub?.status === "past_due" && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Your last payment failed. Please update your card to keep your account active.
          </div>
        )}
        {isPaidActive && (
          <button
            onClick={onManage}
            disabled={busy === "portal"}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-mahogany px-3 py-1.5 text-xs text-mahogany hover:bg-mahogany hover:text-cream disabled:opacity-50"
          >
            {busy === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Manage subscription
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {RETAILER_PLANS.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const busyHere = busy === p.id || (busy === null && checkoutLoading);
          return (
            <div
              key={p.id}
              className={`relative rounded-xl border bg-card p-6 ${
                p.badge ? "border-gold ring-1 ring-gold" : "border-border"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">
                  {p.badge}
                </span>
              )}
              <p className="font-display text-xl text-mahogany">{p.name}</p>
              <p className="mt-3 font-mono text-3xl">{p.price}</p>
              <p className="text-xs text-muted-foreground">{p.period}</p>
              <p className="mt-3 text-sm">{p.desc}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="mt-6 rounded-md border border-mahogany/20 bg-mahogany/5 py-2 text-center text-xs font-mono uppercase tracking-wider text-mahogany">
                  Current plan
                </div>
              ) : p.priceId ? (
                <button
                  onClick={() => onChoose(p.priceId, p.id)}
                  disabled={busyHere}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-mahogany py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
                >
                  {busyHere ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isPaidActive ? `Switch to ${p.name}` : "Upgrade"}
                </button>
              ) : (
                <div className="mt-6 text-center text-xs text-muted-foreground">
                  Free trial active
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Need a custom plan?{" "}
        <Link to="/retailer" className="text-mahogany underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
