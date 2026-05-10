import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyEntitlement, getMyRetailerContext } from "@/lib/retailer.functions";

export interface RetailerStatus {
  isLoading: boolean;
  hasRetailer: boolean;
  trialDaysLeft: number | null; // null when no trial / already subscribed
  isPaywalled: boolean; // true when trial expired AND no paid subscription
  isTrialEndingSoon: boolean; // ≤3 days left
  effectivePlan: string;
  trialActive: boolean;
  hasPaidSub: boolean;
}

/**
 * Reads the retailer's current lifecycle status — trial countdown, paywall
 * gating, plan. Used by the portal layout to swap in a paywall card when
 * a trial has ended without a paid subscription.
 */
export function useRetailerStatus(): RetailerStatus {
  const getEnt = useServerFn(getMyEntitlement);
  const getCtx = useServerFn(getMyRetailerContext);

  const entQ = useQuery({
    queryKey: ["retailer-entitlement"],
    queryFn: () => getEnt(),
    staleTime: 60_000,
  });
  const ctxQ = useQuery({
    queryKey: ["retailer-context"],
    queryFn: () => getCtx(),
    staleTime: 60_000,
  });

  const isLoading = entQ.isLoading || ctxQ.isLoading;
  const retailer = ctxQ.data?.retailer;
  const ent = entQ.data;

  const trialEndsAt = retailer?.trial_ends_at
    ? new Date(retailer.trial_ends_at as string)
    : null;
  const now = Date.now();
  const trialDaysLeft =
    trialEndsAt && trialEndsAt.getTime() > now
      ? Math.ceil((trialEndsAt.getTime() - now) / 86400000)
      : trialEndsAt
        ? 0
        : null;

  const hasPaidSub = !!ent?.hasPaidSub;
  const trialActive = !!ent?.trialActive;
  const isPaywalled = !!retailer && !trialActive && !hasPaidSub;
  const isTrialEndingSoon =
    !hasPaidSub && trialActive && trialDaysLeft !== null && trialDaysLeft <= 3;

  return {
    isLoading,
    hasRetailer: !!retailer,
    trialDaysLeft: hasPaidSub ? null : trialDaysLeft,
    isPaywalled,
    isTrialEndingSoon,
    effectivePlan: ent?.plan ?? "none",
    trialActive,
    hasPaidSub,
  };
}
