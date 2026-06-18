// Shared plan config for the retailer pricing page, /portal/billing,
// and the trial-expired paywall. Keep monthly/yearly priceIds in sync with
// the Paddle products created via create_product / create_price.

export type RetailerPlanId = "starter" | "growth" | "scale";
export type BillingInterval = "monthly" | "yearly";

export interface RetailerPlan {
  id: RetailerPlanId;
  name: string;
  tagline: string;
  prices: { monthly: string; yearly: string };
  priceIds: { monthly: string; yearly: string };
  features: string[];
  badge?: string;
}

export const RETAILER_PLANS: RetailerPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo founders.",
    prices: { monthly: "£49", yearly: "£382.20" },
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
    prices: { monthly: "£149", yearly: "£1,162.20" },
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
    prices: { monthly: "£399", yearly: "£3,112.20" },
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
