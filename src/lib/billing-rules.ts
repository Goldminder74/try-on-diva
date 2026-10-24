export const PLAN_WIG_CAPS: Record<string, number> = {
  starter: 30,
  growth: 150,
  scale: Number.POSITIVE_INFINITY,
};

export function planChangeError(priceId: string, customerType: string, published: number): string | null {
  const match = /^(consumer_(?:plus|pro)|retailer_(?:starter|growth|scale))_(monthly|yearly)$/.exec(priceId);
  if (!match || !priceId.startsWith(`${customerType}_`)) return "Choose a plan for this account type.";
  if (customerType !== "retailer") return null;
  const plan = match[1].replace("retailer_", "");
  const cap = PLAN_WIG_CAPS[plan];
  return published > cap
    ? `Unpublish ${published - cap} wigs before switching: this plan allows ${cap} published wigs.`
    : null;
}

export function subscriptionIdFromPayment(object: any): string | null {
  const value = object?.subscription ?? object?.parent?.subscription_details?.subscription;
  return typeof value === "string" ? value : value?.id ?? null;
}

export function paymentCanSync(type: string, object: any): boolean {
  return type === "invoice.paid" || type === "checkout.session.async_payment_succeeded" ||
    (type === "checkout.session.completed" && ["paid", "no_payment_required"].includes(object?.payment_status));
}