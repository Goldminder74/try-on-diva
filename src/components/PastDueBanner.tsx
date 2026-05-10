import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export function PastDueBanner() {
  const { subscription } = useSubscription();
  if (!subscription || subscription.status !== "past_due") return null;
  const isRetailer = subscription.customer_type === "retailer";
  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
      <AlertTriangle className="mr-1 inline h-4 w-4" />
      Your last payment failed.{" "}
      <Link
        to={isRetailer ? "/portal/billing" : "/pricing"}
        className="font-medium underline"
      >
        Update your card
      </Link>{" "}
      to keep your account active.
    </div>
  );
}
