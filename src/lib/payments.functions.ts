import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      priceId: string;
      customerEmail?: string;
      userId?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found: " + data.priceId);
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const customerId =
        data.customerEmail || data.userId
          ? await resolveOrCreateCustomer(stripe, {
              email: data.customerEmail,
              userId: data.userId,
            })
          : undefined;

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId =
          typeof stripePrice.product === "string"
            ? stripePrice.product
            : (stripePrice.product as { id: string }).id;
        const product = await stripe.products.retrieve(productId);
        productDescription = (product as Stripe.Product).name;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        managed_payments: { enabled: true },
        ...(customerId && { customer: customerId }),
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        ...(data.userId && {
          metadata: { userId: data.userId, managed_payments: "true" },
          ...(isRecurring && {
            subscription_data: { metadata: { userId: data.userId } },
          }),
        }),
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Pull the caller's latest subscription straight from the payment provider and
 * write it into our subscriptions table.
 *
 * The provider's notification usually lands first, but it can be delayed. The
 * success page calls this so the customer never sees "activating" forever.
 */
export const syncMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => {
    if (d?.environment !== "sandbox" && d?.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return d;
  })
  .handler(async ({ data, context }): Promise<{ synced: boolean }> => {
    const { userId } = context;
    try {
      const stripe = createStripeClient(data.environment);
      const customers = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      const customer = customers.data[0];
      if (!customer) return { synced: false };

      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 5,
      });
      const sub = subs.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      );
      if (!sub) return { synced: false };

      const item = sub.items.data[0];
      const lookupKey = (item?.price as any)?.lookup_key as string | undefined;
      const priceId = lookupKey ?? item?.price?.id ?? "unknown_price";
      const productId = lookupKey
        ? lookupKey.replace(/_(monthly|yearly)$/, "")
        : "unknown_product";
      const plan = productId.replace(/^(consumer_|retailer_)/, "");
      const ctype = productId.startsWith("retailer_") ? "retailer" : "consumer";
      const periodStart = (item as any)?.current_period_start ?? (sub as any).current_period_start;
      const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).from("subscriptions").upsert(
        {
          user_id: userId,
          profile_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customer.id,
          product_id: productId,
          price_id: priceId,
          plan,
          customer_type: ctype,
          status: sub.status,
          billing_interval: item?.price?.recurring?.interval ?? null,
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          environment: data.environment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );

      if (ctype === "retailer") {
        await (supabaseAdmin as any)
          .from("retailers")
          .update({ plan, is_active: true, updated_at: new Date().toISOString() })
          .eq("owner_id", userId);
      }

      return { synced: true };
    } catch (error) {
      console.error("syncMySubscription failed:", getStripeErrorMessage(error));
      return { synced: false };
    }
  });
