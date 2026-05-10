import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

const envSchema = z.enum(["sandbox", "live"]);

async function resolvePaddlePriceId(env: PaddleEnv, externalId: string): Promise<string> {
  const r = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(externalId)}`);
  const j = await r.json();
  if (!j.data?.length) throw new Error("Price not found: " + externalId);
  return j.data[0].id as string;
}

/**
 * Open a Paddle customer-portal session so the user can cancel,
 * update payment method or download invoices.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: "sandbox" | "live" }) =>
    z.object({ environment: envSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_customer_id) throw new Error("No subscription found.");

    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id,
      sub.paddle_subscription_id ? [sub.paddle_subscription_id] : [],
    );
    return { url: session.urls.general.overview };
  });

/**
 * Switch an existing subscription to a new price (upgrade/downgrade) with
 * prorated_immediately billing. Returns the updated paddle subscription.
 */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { newPriceId: string; environment: "sandbox" | "live" }) =>
    z
      .object({
        newPriceId: z.string().min(1).max(120),
        environment: envSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_subscription_id) throw new Error("No active subscription.");
    if (!["active", "trialing", "past_due"].includes(sub.status)) {
      throw new Error("Subscription not in a state that can be changed.");
    }

    const paddle = getPaddleClient(data.environment);
    const paddlePriceId = await resolvePaddlePriceId(data.environment, data.newPriceId);

    await paddle.subscriptions.update(sub.paddle_subscription_id, {
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      prorationBillingMode: "prorated_immediately",
    });
    return { ok: true };
  });
