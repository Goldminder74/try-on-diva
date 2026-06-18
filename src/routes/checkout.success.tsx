import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/useSubscription";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Payment successful — Wigsmi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // The customer type is passed through the success URL so we don't have
  // to guess from the (possibly not-yet-written) subscription row.
  const customerType = useMemo<"consumer" | "retailer">(() => {
    if (typeof window === "undefined") return "consumer";
    const t = new URLSearchParams(window.location.search).get("type");
    return t === "retailer" ? "retailer" : "consumer";
  }, []);

  const { isActive } = useSubscription({ customerType });
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const destination = customerType === "retailer" ? "/portal/billing" : "/app";

  // Auto-redirect once the webhook has landed.
  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => navigate({ to: destination }), 1200);
      return () => clearTimeout(t);
    }
  }, [isActive, destination, navigate]);

  const stillWaiting = !!user && !isActive && waited < 15;
  const timedOut = !!user && !isActive && waited >= 15;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-5 font-display text-4xl text-mahogany">You're in.</h1>
        <p className="mt-3 text-muted-foreground">
          {stillWaiting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Activating your subscription…
            </span>
          ) : isActive ? (
            "Your subscription is active. Redirecting…"
          ) : timedOut ? (
            "Your payment was received and your subscription is being set up. We'll email you the moment it's live — you can head to your account in the meantime."
          ) : (
            "Your subscription is being processed. It may take a few seconds to update."
          )}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to={destination}
            className="rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
          >
            {customerType === "retailer" ? "Go to billing" : "Go to my app"}
          </Link>
        </div>
      </div>
    </div>
  );
}
