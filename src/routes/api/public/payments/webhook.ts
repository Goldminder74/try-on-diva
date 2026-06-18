import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookAutoEnv, EventName, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";
import { serverSendTransactionalEmail } from "@/lib/email/server-send";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function customerType(productId?: string): "consumer" | "retailer" {
  if (!productId) return "consumer";
  return productId.startsWith("retailer_") ? "retailer" : "consumer";
}

function planFromProduct(productId?: string): string {
  if (!productId) return "free";
  return productId.replace(/^(consumer_|retailer_)/, "");
}

function intervalFromItem(item: any): string | null {
  const i = item?.price?.billingCycle?.interval;
  if (i === "month" || i === "year" || i === "week" || i === "day") return i;
  const ext: string | undefined = item?.price?.importMeta?.externalId;
  if (ext?.endsWith("_yearly")) return "year";
  if (ext?.endsWith("_monthly")) return "month";
  return null;
}

/**
 * Resolve external_id for price + product. If the event payload omits
 * importMeta.externalId, fall back to fetching the price/product from the
 * Paddle API directly. This makes the webhook resilient to event-payload
 * inconsistencies between Paddle environments.
 */
async function resolveExternalIds(
  item: any,
  env: PaddleEnv,
): Promise<{ priceId: string | null; productId: string | null }> {
  let priceId: string | null = item?.price?.importMeta?.externalId ?? null;
  let productId: string | null = item?.product?.importMeta?.externalId ?? null;

  if (!priceId && item?.price?.id) {
    try {
      const r = await gatewayFetch(env, `/prices/${item.price.id}`);
      const j = await r.json();
      priceId = j?.data?.import_meta?.external_id ?? null;
    } catch (e) {
      console.warn("Webhook: failed to resolve price external_id", e);
    }
  }
  if (!productId && item?.product?.id) {
    try {
      const r = await gatewayFetch(env, `/products/${item.product.id}`);
      const j = await r.json();
      productId = j?.data?.import_meta?.external_id ?? null;
    } catch (e) {
      console.warn("Webhook: failed to resolve product external_id", e);
    }
  }
  // If the price API call gave us a product id and we still don't have one, try fetching product via price.product_id
  if (!productId && item?.price?.productId) {
    try {
      const r = await gatewayFetch(env, `/products/${item.price.productId}`);
      const j = await r.json();
      productId = j?.data?.import_meta?.external_id ?? null;
    } catch {
      /* ignore */
    }
  }
  return { priceId, productId };
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("Webhook: no userId in customData");
    return;
  }
  const item = items?.[0];
  let { priceId, productId } = await resolveExternalIds(item, env);

  if (!priceId || !productId) {
    // Last-resort: write the row anyway using the raw Paddle IDs so the user
    // still gets gated correctly. Better than a phantom paid user. Use the
    // raw IDs as both product_id and plan placeholder; ops can repair later.
    console.warn(
      "Webhook: missing external_id, writing fallback row",
      { rawPriceId: item?.price?.id, rawProductId: item?.product?.id },
    );
    productId = productId ?? item?.product?.id ?? "unknown_product";
    priceId = priceId ?? item?.price?.id ?? "unknown_price";
  }

  const plan = planFromProduct(productId ?? undefined);
  const ctype = customerType(productId ?? undefined);
  const billing_interval = intervalFromItem(item);
  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        profile_id: userId,
        paddle_subscription_id: id,
        paddle_customer_id: customerId,
        product_id: productId,
        price_id: priceId,
        plan,
        customer_type: ctype,
        status,
        billing_interval,
        current_period_start: currentBillingPeriod?.startsAt,
        current_period_end: currentBillingPeriod?.endsAt,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_subscription_id" },
    );

  // Mirror retailer plan onto retailers row so portal UI reflects it.
  if (ctype === "retailer") {
    const sb = getSupabase();
    await sb
      .from("retailers")
      .update({ plan, is_active: true, updated_at: new Date().toISOString() })
      .eq("owner_id", userId);

    const { data: retailer } = await sb
      .from("retailers")
      .select("id, business_name, display_name")
      .eq("owner_id", userId)
      .maybeSingle();

    if (retailer?.id) {
      await sb
        .from("wigs")
        .update({
          is_published: true,
          auto_unpublished_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("retailer_id", retailer.id)
        .not("auto_unpublished_at", "is", null);

      await sb
        .from("retailer_lifecycle_events")
        .delete()
        .eq("retailer_id", retailer.id)
        .in("event_type", ["trial_ended", "trial_ending_3d"]);

      const { data: profile } = await sb
        .from("profiles")
        .select("email, display_name")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.email) {
        await serverSendTransactionalEmail({
          baseUrl: "https://wigsmi.com",
          templateName: "retailer-subscribed",
          recipientEmail: profile.email,
          idempotencyKey: `subscribed-${id}`,
          templateData: {
            name: profile.display_name ?? retailer.display_name,
            businessName: retailer.business_name,
            plan,
            portalUrl: "https://wigsmi.com/portal",
          },
        });
      }
    }
  }
}

async function syncRetailerPlanFromSub(subId: string, env: PaddleEnv) {
  const { data: row } = await getSupabase()
    .from("subscriptions")
    .select("user_id, plan, status, customer_type, current_period_end")
    .eq("paddle_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (!row || row.customer_type !== "retailer" || !row.user_id) return;
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const inGrace = periodEnd ? periodEnd > new Date() : false;
  const newPlan = row.status === "canceled" && !inGrace ? "starter" : row.plan;
  await getSupabase()
    .from("retailers")
    .update({ plan: newPlan, updated_at: new Date().toISOString() })
    .eq("owner_id", row.user_id);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const item = items?.[0];
  const { priceId, productId } = await resolveExternalIds(item, env);
  const update: Record<string, unknown> = {
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === "cancel",
    updated_at: new Date().toISOString(),
  };
  if (priceId) update.price_id = priceId;
  if (productId) {
    update.product_id = productId;
    update.plan = planFromProduct(productId);
    update.customer_type = customerType(productId);
  }
  const interval = intervalFromItem(item);
  if (interval) update.billing_interval = interval;
  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(id, env);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const { id, currentBillingPeriod } = data;
  const update: Record<string, unknown> = {
    status: "canceled",
    updated_at: new Date().toISOString(),
  };
  // Defensively write period_end from the event payload so the grace-period
  // logic works even if subscription.updated did not arrive first.
  if (currentBillingPeriod?.endsAt) {
    update.current_period_end = currentBillingPeriod.endsAt;
  }
  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(id, env);
}


async function handlePaymentFailed(data: any, env: PaddleEnv) {
  const subId = data?.subscriptionId;
  if (!subId) return;
  const sb = getSupabase();
  const { data: row } = await sb
    .from("subscriptions")
    .select("user_id, customer_type")
    .eq("paddle_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (!row?.user_id) return;

  const { data: profile } = await sb
    .from("profiles")
    .select("email, display_name")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!profile?.email) return;

  if (row.customer_type === "retailer") {
    const { data: retailer } = await sb
      .from("retailers")
      .select("id, business_name, display_name")
      .eq("owner_id", row.user_id)
      .maybeSingle();
    await serverSendTransactionalEmail({
      baseUrl: "https://wigsmi.com",
      templateName: "retailer-payment-failed",
      recipientEmail: profile.email,
      idempotencyKey: `payment-failed-${data?.id ?? subId}-${Date.now().toString(36)}`,
      templateData: {
        name: profile.display_name ?? retailer?.display_name,
        businessName: retailer?.business_name,
        billingUrl: "https://wigsmi.com/portal/billing",
      },
    });
  } else {
    await serverSendTransactionalEmail({
      baseUrl: "https://wigsmi.com",
      templateName: "consumer-payment-failed",
      recipientEmail: profile.email,
      idempotencyKey: `payment-failed-${data?.id ?? subId}-${Date.now().toString(36)}`,
      templateData: {
        name: profile.display_name,
        billingUrl: "https://wigsmi.com/pricing",
      },
    });
  }
}

async function handleWebhook(req: Request) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const { event, env } = await verifyWebhookAutoEnv(signature, body);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handlePaymentFailed(event.data, env);
      break;
    default:
      console.log("Unhandled Paddle event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await handleWebhook(request);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Paddle webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
