import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const envSchema = z.enum(["sandbox", "live"]);
const customerTypeSchema = z.enum(["consumer", "retailer"]);

async function resolvePriceByLookupKey(
  stripe: ReturnType<typeof createStripeClient>,
  lookupKey: string,
) {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
  if (!prices.data.length) throw new Error("Price not found: " + lookupKey);
  return prices.data[0];
}

/** Open the hosted billing portal so the user can manage their subscription. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
      z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("No subscription found.");

    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
      });
      return { url: portal.url };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });

/** Switch an existing subscription to a new price, prorated immediately. */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      newPriceId: string;
      environment: "sandbox" | "live";
      customerType: "consumer" | "retailer";
    }) =>
      z
        .object({
          newPriceId: z.string().min(1).max(120),
          environment: envSchema,
          customerType: customerTypeSchema,
        })
        .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No active subscription.");
    if (!["active", "trialing", "past_due"].includes(sub.status)) {
      throw new Error("Subscription not in a state that can be changed.");
    }

    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const price = await resolvePriceByLookupKey(stripe, data.newPriceId);
      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const itemId = current.items.data[0]?.id;
      if (!itemId) throw new Error("Subscription has no billable item.");

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: itemId, price: price.id, quantity: 1 }],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Preview what changing the plan will charge or credit the customer. */
export const previewPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      newPriceId: string;
      environment: "sandbox" | "live";
      customerType: "consumer" | "retailer";
    }) =>
      z
        .object({
          newPriceId: z.string().min(1).max(120),
          environment: envSchema,
          customerType: customerTypeSchema,
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id || !sub.stripe_customer_id) {
      throw new Error("No active subscription.");
    }

    const stripe = createStripeClient(data.environment as StripeEnv);
    const price = await resolvePriceByLookupKey(stripe, data.newPriceId);
    const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = current.items.data[0]?.id;
    if (!itemId) throw new Error("Subscription has no billable item.");

    const preview = await (stripe.invoices as any).createPreview({
      customer: sub.stripe_customer_id,
      subscription: sub.stripe_subscription_id,
      subscription_details: {
        items: [{ id: itemId, price: price.id, quantity: 1 }],
        proration_behavior: "always_invoice",
      },
    });

    const currentItem = current.items.data[0];
    const periodEnd =
      (currentItem as any)?.current_period_end ?? (current as any).current_period_end;

    return {
      currency: (preview.currency as string)?.toUpperCase() ?? "GBP",
      immediateAmount: Number(preview.amount_due ?? 0),
      nextAmount: Number(price.unit_amount ?? 0),
      nextBilledAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    };
  });

/** Cancel the user's subscription at period end (keeps access until then). */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
      z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No active subscription.");
    if (!["active", "trialing", "past_due"].includes(sub.status)) {
      throw new Error("Subscription is not active.");
    }

    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  currency: string;
  total: number;
  billedAt: string | null;
  invoiceUrl: string | null;
}

/** List the user's recent invoices. */
export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
      z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<InvoiceRow[]> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return [];

    const stripe = createStripeClient(data.environment as StripeEnv);
    const list = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 12,
    });

    return list.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: inv.status ?? "unknown",
      currency: (inv.currency ?? "gbp").toUpperCase(),
      total: Number(inv.total ?? 0),
      billedAt: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      invoiceUrl: inv.hosted_invoice_url ?? inv.invoice_pdf ?? null,
    }));
  });
