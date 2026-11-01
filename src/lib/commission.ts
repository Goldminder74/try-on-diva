/**
 * Commission rules for tracked wig sales.
 *
 * A shopper leaves Wigsmi for a retailer's shop through a tracked link. When
 * the retailer tells us that visit became an order, we record the sale and the
 * commission the retailer owes Wigsmi for it.
 *
 * Rates are stored in basis points so nothing is ever rounded mid-calculation:
 * 1000 bps = 10%.
 */

export const COMMISSION_MIN_BPS = 800; // 8%
export const COMMISSION_MAX_BPS = 1500; // 15%
export const COMMISSION_DEFAULT_BPS = 1000; // 10%

/** How long a tracked click can still be matched to an order. */
export const CLICK_TTL_DAYS = 30;

export const SALE_STATUSES = ["pending", "confirmed", "settled", "void"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export function isAllowedRateBps(bps: unknown): bps is number {
  return (
    typeof bps === "number" &&
    Number.isInteger(bps) &&
    bps >= COMMISSION_MIN_BPS &&
    bps <= COMMISSION_MAX_BPS
  );
}

export function rateLabel(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

/**
 * Commission owed on a sale, in pounds and pence.
 * Done in whole pence so a £19.99 sale at 10% is exactly £2.00, never £1.999.
 */
export function commissionFor(saleGbp: number, rateBps: number): number {
  const salePence = Math.round(saleGbp * 100);
  const commissionPence = Math.round((salePence * rateBps) / 10000);
  return commissionPence / 100;
}

/** £-formatted, always two decimals. */
export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

/** Click tokens are UUIDs handed to the retailer's shop as `wigsmi_ref`. */
export function isClickToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
  );
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Where a tracked click may send a shopper.
 *
 * The destination has to be an http(s) page on the retailer's own site: their
 * website host, or a subdomain of it. Anything else (another brand's domain,
 * a `javascript:` URL, an empty value) is refused so a listing can never be
 * used to bounce shoppers somewhere they did not ask to go.
 */
export function safeRetailerTarget(
  productUrl: string | null | undefined,
  retailerWebsite: string | null | undefined,
): string | null {
  if (!productUrl || !retailerWebsite) return null;
  let target: URL;
  try {
    target = new URL(productUrl);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;

  const retailerHost = hostOf(retailerWebsite);
  const targetHost = hostOf(target.href);
  if (!retailerHost || !targetHost) return null;
  if (targetHost !== retailerHost && !targetHost.endsWith(`.${retailerHost}`)) {
    return null;
  }
  return target.href;
}

/**
 * The retailer's shop URL with our click reference attached, so the order
 * lands in their own system carrying the code they quote back to us.
 */
export function withClickRef(url: string, token: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("wigsmi_ref", token);
    return u.href;
  } catch {
    return url;
  }
}
