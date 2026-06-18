import { Link } from "@tanstack/react-router";
import { Clock, Lock } from "lucide-react";
import { useRetailerStatus } from "@/hooks/use-retailer-status";
import { RetailerPlanCards } from "@/components/retailer/RetailerPlanCards";

/**
 * Banner shown above the portal when the retailer's trial is ending in
 * ≤3 days and they haven't subscribed yet. Renders nothing otherwise.
 */
export function TrialEndingBanner() {
  const { isTrialEndingSoon, trialDaysLeft, hasPaidSub } = useRetailerStatus();
  if (hasPaidSub || !isTrialEndingSoon || trialDaysLeft === null) return null;
  const dayLabel = trialDaysLeft === 1 ? "1 day" : `${trialDaysLeft} days`;
  return (
    <div className="border-b border-gold/40 bg-gold/15 px-4 py-2 text-center text-sm text-mahogany">
      <Clock className="mr-1 inline h-4 w-4" />
      Your trial ends in <strong>{dayLabel}</strong>.{" "}
      <Link to="/portal/billing" className="font-medium underline underline-offset-4">
        Choose a plan
      </Link>{" "}
      to keep your store live.
    </div>
  );
}

/**
 * Full-screen paywall shown inside the portal main area when a retailer's
 * trial has expired and they have no active subscription. Their wigs are
 * already auto-unpublished by the daily cron; this paywall replaces the
 * normal portal UI to make resubscribing the only meaningful action.
 */
export function TrialExpiredPaywall() {
  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)] md:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mahogany/10 text-mahogany">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-mahogany md:text-4xl">
          Your trial has ended.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Your wigs and widget are paused for now. Pick a plan and we'll
          republish everything automatically — no re-uploading, no
          reconfiguration.
        </p>
      </div>

      <div className="mt-8">
        <RetailerPlanCards
          successUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}/portal?checkout=success`
              : undefined
          }
        />
      </div>

      <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Your catalog is safe — nothing is deleted.{" "}
        <Link to="/portal/billing" className="text-mahogany underline">
          Manage billing
        </Link>
      </p>
    </div>
  );
}

