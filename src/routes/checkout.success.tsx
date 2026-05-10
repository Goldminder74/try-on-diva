import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const { isActive, subscription } = useSubscription();
  const [waited, setWaited] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-redirect once the webhook has landed (or after 15s).
  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => {
        if (subscription?.customer_type === "retailer") {
          navigate({ to: "/portal/billing" });
        } else {
          navigate({ to: "/app" });
        }
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [isActive, subscription, navigate]);

  const stillWaiting = !!user && !isActive && waited < 15;

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
          ) : (
            "Your subscription is being processed. It may take a few seconds to update."
          )}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/app"
            className="rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
          >
            Go to my app
          </Link>
          <Link
            to="/portal"
            className="rounded-md border border-mahogany px-5 py-2.5 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream"
          >
            Retailer portal
          </Link>
        </div>
      </div>
    </div>
  );
}
