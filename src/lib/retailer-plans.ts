import { formatPlanPrice, type PlanCurrency } from "@/lib/plan-prices";
// Shared plan config for the retailer pricing page, /portal/billing,
// and the trial-expired paywall. Keep monthly/yearly priceIds in sync with
// the payment provider products created via create_product / create_price.

export type RetailerPlanId = "starter" | "growth" | "scale";
export type BillingInterval = "monthly" | "yearly";

/** Display price for a plan, read from the shared Stripe-matching config. */
export function formatRetailerPlanPrice(
  plan: RetailerPlan,
  interval: BillingInterval,
  currency: PlanCurrency,
): string {
  return formatPlanPrice(plan.priceIds[interval], currency);
}

export interface RetailerPlan {
  id: RetailerPlanId;
  name: string;
  tagline: string;
  priceIds: { monthly: string; yearly: string };
  features: string[];
  badge?: string;
}

export const RETAILER_PLANS: RetailerPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo founders.",
    priceIds: {
      monthly: "retailer_starter_monthly",
      yearly: "retailer_starter_yearly",
    },
    features: ["Up to 30 wigs", "Virtual try-on widget", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Growing brands.",
    priceIds: {
      monthly: "retailer_growth_monthly",
      yearly: "retailer_growth_yearly",
    },
    badge: "Most popular",
    features: ["Up to 150 wigs", "Full analytics", "Priority email support"],
  },
  {
    id: "scale",
    name: "Pro",
    tagline: "Multi-store retailers.",
    priceIds: {
      monthly: "retailer_scale_monthly",
      yearly: "retailer_scale_yearly",
    },
    features: ["Unlimited wigs", "Multi-store", "Priority phone support"],
  },
];

export function getPlanById(id: string): RetailerPlan | undefined {
  return RETAILER_PLANS.find((p) => p.id === id);
}

/** Display name for a stored plan id (e.g. "scale" -> "Pro"). */
export function getPlanDisplayName(id?: string | null): string {
  if (!id) return "";
  return getPlanById(id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
}
