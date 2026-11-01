import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { syncMySubscription } from "@/lib/payments.functions";
import { syncMyTopUps, getMyTryOnCredits } from "@/lib/topup.functions";
import { TRYON_PACKS } from "@/lib/topup";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/success")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ name: "description", content: "Your Wigsmi payment is confirmed and your plan is being activated." }, { property: "og:title", content: "Payment successful - Wigsmi" }, { property: "og:description", content: "Your Wigsmi payment is confirmed and your plan is being activated." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { title: "Payment successful - Wigsmi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutSuccess,
});

type CheckoutKind = "consumer" | "retailer" | "topup";

function CheckoutSuccess() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // What was bought is passed through the success URL so we don't have to
  // guess from a row that may not have been written yet.
  const kind = useMemo<CheckoutKind>(() => {
    if (typeof window === "undefined") return "consumer";
    const t = new URLSearchParams(window.location.search).get("type");
    return t === "retailer" ? "retailer" : t === "topup" ? "topup" : "consumer";
  }, []);

  const { isActive } = useSubscription({
    customerType: kind === "retailer" ? "retailer" : "consumer",
  });
  const [waited, setWaited] = useState(0);
  // Try-ons left after a one-off pack purchase (null until we've read them).
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Don't rely solely on the provider's notification: pull the subscription
  // ourselves a few seconds in, and again if it still hasn't landed.
  useEffect(() => {
    if (kind === "topup" || !user || isActive) return;
    if (waited !== 3 && waited !== 9) return;
    syncMySubscription({ data: { environment: getStripeEnvironment() } }).catch(() => {});
  }, [user, isActive, waited, kind]);

  // A one-off pack: read the balance, and if the notification hasn't landed
  // yet, ask the provider what this customer has paid for and grant it.
  useEffect(() => {
    if (kind !== "topup" || !user) return;
    let on = true;
    getMyTryOnCredits()
      .then((r) => on && setCredits(r.remaining))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [kind, user]);

  useEffect(() => {
    if (kind !== "topup" || !user) return;
    if (waited !== 3 && waited !== 9) return;
    void syncMyTopUps({ data: { environment: getStripeEnvironment() } }).catch(() => {});
    getMyTryOnCredits()
      .then((r) => setCredits(r.remaining))
      .catch(() => {});
  }, [kind, user, waited]);

  const destination = kind === "retailer" ? "/portal/billing" : kind === "topup" ? "/app/try-on" : "/app";
  const packCredited = kind === "topup" && (credits ?? 0) > 0;
  const settled = kind === "topup" ? packCredited : isActive;

  // Auto-redirect once the purchase has landed.
  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(() => navigate({ to: destination }), 1200);
    return () => clearTimeout(t);
  }, [settled, destination, navigate]);

  const stillWaiting = !!user && !settled && waited < 15;
  const timedOut = !!user && !settled && waited >= 15;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-5 font-display text-4xl text-mahogany">
          {kind === "topup" ? (packCredited ? "You're all set." : "Payment received.") : "You're in."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {kind === "topup" ? (
            packCredited ? (
              `${TRYON_PACKS[0].credits} extra try-ons are on your account. Redirecting…`
            ) : timedOut ? (
              "Your payment went through and your extra try-ons are being added. We'll email you the moment they're live - you can head to your account in the meantime."
            ) : (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Adding your extra try-ons…
              </span>
            )
          ) : stillWaiting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Activating your subscription…
            </span>
          ) : isActive ? (
            "Your subscription is active. Redirecting…"
          ) : timedOut ? (
            "Your payment was received and your subscription is being set up. We'll email you the moment it's live - you can head to your account in the meantime."
          ) : (
            "Your subscription is being processed. It may take a few seconds to update."
          )}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {kind === "retailer" ? (
            <Link
              to="/portal/billing"
              className="rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
            >
              Go to billing
            </Link>
          ) : kind === "topup" ? (
            <Link
              to="/app/try-on"
              search={{ wig: undefined }}
              className="rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
            >
              Start a try-on
            </Link>
          ) : (
            <Link
              to="/app"
              className="rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
            >
              Go to my app
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
