/**
 * One-off try-on top-up packs.
 *
 * A pack is a single, non-recurring purchase that adds try-on sets on top of
 * whatever the shopper's plan already allows each month. The monthly allowance
 * is always spent first; only once it is gone does a try-on come out of a
 * purchased pack.
 *
 * `priceId` must match the payment-provider price id created for the pack.
 */
export interface TryOnPack {
  /** Payment-provider price id (also the checkout lookup key). */
  priceId: string;
  /** Try-on sets granted by one purchase. */
  credits: number;
  /** Charge in the currency's major unit (pounds). */
  amountGbp: number;
  currency: string;
  /** How long a purchased pack stays usable, from the day it is bought. */
  validMonths: number;
  label: string;
  blurb: string;
}

export const TRYON_PACKS: TryOnPack[] = [
  {
    priceId: "tryon_pack_10",
    credits: 10,
    amountGbp: 2.99,
    currency: "GBP",
    validMonths: 12,
    label: "10 extra try-ons",
    blurb: "One-off pack. No subscription, no renewal.",
  },
];

export const PACK_PRICE_IDS = TRYON_PACKS.map((p) => p.priceId);

export function getPackByPriceId(priceId?: string | null): TryOnPack | undefined {
  if (!priceId) return undefined;
  return TRYON_PACKS.find((p) => p.priceId === priceId);
}

/** True when a checkout session's price id is one of our top-up packs. */
export function isPackPriceId(priceId?: string | null): boolean {
  return !!getPackByPriceId(priceId);
}

/**
 * Plan price ids accepted by the shared checkout entry point. Kept here so the
 * server-side validator and the client-side buttons agree on one list.
 */
export const CHECKOUT_PRICE_ID_PATTERN =
  /^(consumer_(plus|pro)|retailer_(starter|growth|scale))_(monthly|yearly)$|^tryon_pack_10$/;

export function isCheckoutPriceId(priceId?: string | null): boolean {
  return !!priceId && CHECKOUT_PRICE_ID_PATTERN.test(priceId);
}

/** When a pack bought on `purchasedAt` stops being usable. */
export function packExpiresAt(purchasedAt: Date, validMonths: number): Date {
  const d = new Date(purchasedAt.getTime());
  d.setUTCMonth(d.getUTCMonth() + validMonths);
  return d;
}

/** £-formatted pack price, e.g. "£2.99". */
export function formatPackPrice(pack: TryOnPack): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: pack.currency,
  }).format(pack.amountGbp);
}
