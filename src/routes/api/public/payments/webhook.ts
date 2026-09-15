import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
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

function customerType(productId?: string | null): "consumer" | "retailer" {
  if (!productId) return "consumer";
  return productId.startsWith("retailer_") ? "retailer" : "consumer";
}

function planFromProduct(productId?: string | null): string {
  if (!productId) return "free";
  return productId.replace(/^(consumer_|retailer_)/, "");
}

/**
 * Our human-readable price ids look like `retailer_growth_monthly`.
 * Derive the product id (`retailer_growth`) and billing interval from it.
 */
function idsFromItem(item: any): {
  priceId: string | null;
  productId: string | null;
  interval: string | null;
} {
  const priceId: string | null =
    item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? null;
  let productId: string | null = null;
  if (priceId) productId = priceId.replace(/_(monthly|yearly)$/, "");
  const recurring = item?.price?.recurring?.interval ?? null;
  const interval =
    recurring ??
    (priceId?.endsWith("_yearly") ? "year" : priceId?.endsWith("_monthly") ? "month" : null);
  return { priceId, productId, interval };
}

function iso(seconds?: number | null): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Mark an event id as processed. Returns false when we have already handled it,
 * so retries and duplicate deliveries cannot send a second email or double-apply
 * a plan change.
 */
async function claimEvent(eventId: string, type: string): Promise<boolean> {
  if (!eventId) return true;
  const { error } = await getSupabase()
    .from("payment_webhook_events")
    .insert({ event_id: eventId, event_type: type });
  if (error) {
    console.log("Duplicate payment event ignored:", eventId, error.message);
    return false;
  }
  return true;
}

/**
 * Release a claim so the provider's retry of a failed delivery can be applied.
 */
async function releaseEvent(eventId: string) {
  if (!eventId) return;
  await getSupabase().from("payment_webhook_events").delete().eq("event_id", eventId);
}

async function syncRetailerPlanFromSub(subId: string, env: StripeEnv) {
  const { data: row } = await getSupabase()
    .from("subscriptions")
    .select("user_id, plan, status, customer_type, current_period_end")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (!row || row.customer_type !== "retailer" || !row.user_id) return;
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const inGrace = periodEnd ? periodEnd > new Date() : false;
  const ended = ["canceled", "unpaid", "incomplete_expired"].includes(row.status) && !inGrace;
  const sb = getSupabase();

  await sb
    .from("retailers")
    .update({
      // Once the paid period is over the retailer loses paid access entirely
      // rather than silently falling back to Starter.
      plan: ended ? "none" : row.plan,
      ...(ended && { is_active: false, trial_ends_at: null }),
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", row.user_id);

  if (!ended) return;

  // Pause their listings so nothing paid-for stays live after access ends.
  const { data: retailer } = await sb
    .from("retailers")
    .select("id")
    .eq("owner_id", row.user_id)
    .maybeSingle();
  if (retailer?.id) {
    await sb
      .from("wigs")
      .update({
        is_published: false,
        auto_unpublished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("retailer_id", retailer.id)
      .eq("is_published", true);
  }
}

async function handleSubscriptionCreated(sub: any, env: StripeEnv) {
  const userId = sub?.metadata?.userId;
  if (!userId) {
    console.error("Webhook: no userId in subscription metadata");
    return;
  }
  const item = sub.items?.data?.[0];
  const { priceId, productId, interval } = idsFromItem(item);
  const plan = planFromProduct(productId);
  const ctype = customerType(productId);
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        profile_id: userId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        product_id: productId ?? item?.price?.product ?? "unknown_product",
        price_id: priceId ?? item?.price?.id ?? "unknown_price",
        plan,
        customer_type: ctype,
        status: sub.status,
        billing_interval: interval,
        current_period_start: iso(periodStart),
        current_period_end: iso(periodEnd),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (ctype === "consumer") {
    const sb = getSupabase();
    const { data: profile } = await sb
      .from("profiles")
      .select("email, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.email) {
      await serverSendTransactionalEmail({
        baseUrl: "https://wigsmi.com",
        templateName: "consumer-subscribed",
        recipientEmail: profile.email,
        idempotencyKey: `consumer-subscribed-${sub.id}`,
        templateData: {
          name: profile.display_name,
          plan,
          appUrl: "https://wigsmi.com/app/try-on",
        },
      });
    }
  }

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
          idempotencyKey: `subscribed-${sub.id}`,
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

async function handleSubscriptionUpdated(sub: any, env: StripeEnv) {
  const item = sub.items?.data?.[0];
  const { priceId, productId, interval } = idsFromItem(item);
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  const update: Record<string, unknown> = {
    status: sub.status,
    current_period_start: iso(periodStart),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };
  if (priceId) update.price_id = priceId;
  if (productId) {
    update.product_id = productId;
    update.plan = planFromProduct(productId);
    update.customer_type = customerType(productId);
  }
  if (interval) update.billing_interval = interval;

  const sb = getSupabase();
  const { data: existing } = await sb
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env)
    .maybeSingle();

  if (!existing) {
    // The created event may have been missed; write the full row instead.
    await handleSubscriptionCreated(sub, env);
    return;
  }

  await sb
    .from("subscriptions")
    .update(update)
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(sub.id, env);
}

async function handleSubscriptionDeleted(sub: any, env: StripeEnv) {
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const update: Record<string, unknown> = {
    status: "canceled",
    updated_at: new Date().toISOString(),
  };
  if (periodEnd) update.current_period_end = iso(periodEnd);
  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
  await syncRetailerPlanFromSub(sub.id, env);
}

async function handlePaymentFailed(invoice: any, env: StripeEnv) {
  const subId =
    typeof invoice?.subscription === "string"
      ? invoice.subscription
      : invoice?.subscription?.id ??
        invoice?.parent?.subscription_details?.subscription ??
        null;
  if (!subId) return;
  const sb = getSupabase();
  const { data: row } = await sb
    .from("subscriptions")
    .select("user_id, customer_type")
    .eq("stripe_subscription_id", subId)
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
      idempotencyKey: `payment-failed-${invoice?.id ?? subId}`,
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
      idempotencyKey: `payment-failed-${invoice?.id ?? subId}`,
      templateData: {
        name: profile.display_name,
        billingUrl: "https://wigsmi.com/pricing",
      },
    });
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = (await verifyWebhook(req, env)) as {
    id?: string;
    type: string;
    data: { object: any };
  };
  if (!(await claimEvent(event.id ?? "", event.type))) return;
  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, env);
        break;
      default:
        console.log("Unhandled payment event:", event.type);
    }
  } catch (err) {
    // Processing failed: drop the claim so the provider's retry is applied
    // instead of being discarded as a duplicate.
    await releaseEvent(event.id ?? "");
    throw err;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
