/**
 * Shared subscription/entitlement rules.
 *
 * Grace policy (product decision): when a renewal payment fails, or a
 * subscription is cancelled, access continues only until the end of the
 * period the customer already paid for. A row with no period end and a
 * non-active status grants nothing.
 */

export type ConsumerTier = "free" | "plus" | "pro";

export interface SubscriptionLike {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
}

/** True while the subscription still grants access. */
export function subscriptionIsValid(sub?: SubscriptionLike | null): boolean {
  if (!sub?.status) return false;
  const endsAt = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const withinPaidPeriod = !!endsAt && endsAt.getTime() > Date.now();

  // Healthy states keep access for the whole period (an open-ended active
  // subscription is still valid).
  if (sub.status === "active" || sub.status === "trialing") {
    return !endsAt || withinPaidPeriod;
  }

  // Dunning and cancellation: paid period only, never open-ended.
  if (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "canceled") {
    return withinPaidPeriod;
  }

  return false;
}

/** Resolve the consumer tier a subscription row grants right now. */
export function consumerTier(sub?: SubscriptionLike | null): ConsumerTier {
  if (!subscriptionIsValid(sub)) return "free";
  return sub?.plan === "pro" ? "pro" : sub?.plan === "plus" ? "plus" : "free";
}

export interface PlanFeatures {
  tier: ConsumerTier;
  /** Unlimited try-on sets per month. */
  unlimitedTryOns: boolean;
  /** Downloads and shares come without the Wigsmi watermark. */
  watermarkFree: boolean;
  /** How long saved looks stay retrievable; null = forever. */
  historyDays: number | null;
  /** Use the highest-fidelity model for every angle. */
  priorityGeneration: boolean;
}

export function planFeatures(tier: ConsumerTier): PlanFeatures {
  switch (tier) {
    case "pro":
      return {
        tier,
        unlimitedTryOns: true,
        watermarkFree: true,
        historyDays: null,
        priorityGeneration: true,
      };
    case "plus":
      return {
        tier,
        unlimitedTryOns: true,
        watermarkFree: false,
        historyDays: 30,
        priorityGeneration: false,
      };
    default:
      return {
        tier: "free",
        unlimitedTryOns: false,
        watermarkFree: false,
        historyDays: 30,
        priorityGeneration: false,
      };
  }
}

/** True when a retailer subscription row still grants a paid retailer plan. */
export function retailerPlanFromSub(sub?: SubscriptionLike | null): string | null {
  if (!subscriptionIsValid(sub)) return null;
  const plan = sub?.plan ?? "";
  return ["starter", "growth", "scale", "enterprise"].includes(plan) ? plan : null;
}
