/**
 * Single source of truth for every plan and pack amount shown on the site.
 * Amounts are in minor units (pence / cents) and must match the Stripe prices
 * (GBP is each price's default currency, USD is its `currency_options.usd`).
 */
export type PlanCurrency = "GBP" | "USD";
export const PLAN_CURRENCIES: PlanCurrency[] = ["GBP", "USD"];

export const PLAN_PRICES: Record<string, Record<PlanCurrency, number>> = {
  consumer_plus_monthly: { GBP: 499, USD: 666 },
  consumer_plus_yearly: { GBP: 3892, USD: 5196 },
  consumer_pro_monthly: { GBP: 999, USD: 1334 },
  consumer_pro_yearly: { GBP: 7792, USD: 10402 },
  tryon_pack_10: { GBP: 299, USD: 399 },
  retailer_starter_monthly: { GBP: 4900, USD: 6542 },
  retailer_starter_yearly: { GBP: 38220, USD: 51024 },
  retailer_growth_monthly: { GBP: 14900, USD: 19892 },
  retailer_growth_yearly: { GBP: 116220, USD: 155154 },
  retailer_scale_monthly: { GBP: 39900, USD: 53267 },
  retailer_scale_yearly: { GBP: 311220, USD: 415479 },
};

/** Countries whose visitors see and pay in USD. Everyone else sees GBP. */
export const USD_COUNTRIES = ["US", "NG"];

export function currencyForCountry(country?: string | null): PlanCurrency {
  return country && USD_COUNTRIES.includes(country.toUpperCase()) ? "USD" : "GBP";
}

export function formatMinor(amountMinor: number, currency: string): string {
  const c = currency.toUpperCase();
  return new Intl.NumberFormat(c === "USD" ? "en-US" : "en-GB", {
    style: "currency",
    currency: c,
  }).format(amountMinor / 100);
}

export function priceMinor(priceId: string, currency: PlanCurrency): number {
  const p = PLAN_PRICES[priceId];
  if (!p) throw new Error(`Unknown price ${priceId}`);
  return p[currency];
}

export function formatPlanPrice(priceId: string, currency: PlanCurrency): string {
  return formatMinor(priceMinor(priceId, currency), currency);
}

/** Zero amount in the chosen currency, e.g. "£0" or "$0". */
export function formatZero(currency: PlanCurrency): string {
  return currency === "USD" ? "$0" : "£0";
}
