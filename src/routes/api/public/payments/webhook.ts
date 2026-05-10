import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

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
  // consumer_plus -> plus, retailer_growth -> growth
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

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("Webhook: no userId in customData");
    return;
  }
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId");
    return;
  }
  const plan = planFromProduct(productId);
  const ctype = customerType(productId);
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
    await getSupabase()
      .from("retailers")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("owner_id", userId);
  }
}

async function syncRetailerPlanFromSub(subId: string, env: PaddleEnv) {
  const { data: row } = await getSupabase()
    .from("subscriptions")
    .select("user_id, plan, status, customer_type")
    .eq("paddle_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (!row || row.customer_type !== "retailer" || !row.user_id) return;
  const newPlan = row.status === "canceled" ? "starter" : row.plan;
  await getSupabase()
    .from("retailers")
    .update({ plan: newPlan, updated_at: new Date().toISOString() })
    .eq("owner_id", row.user_id);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
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
  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(id, env);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(data.id, env);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
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
    default:
      console.log("Unhandled Paddle event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Paddle webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
