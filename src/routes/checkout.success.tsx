import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

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
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-5 font-display text-4xl text-mahogany">You're in.</h1>
        <p className="mt-3 text-muted-foreground">
          Your subscription is active. It may take a few seconds to update.
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
