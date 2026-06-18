import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

const envSchema = z.enum(["sandbox", "live"]);
const customerTypeSchema = z.enum(["consumer", "retailer"]);

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
  .inputValidator((d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
    z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
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
  .inputValidator((d: { newPriceId: string; environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
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
      .select("paddle_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
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

/**
 * Preview what changing the plan will charge or credit the customer.
 */
export const previewPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { newPriceId: string; environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
    z.object({
      newPriceId: z.string().min(1).max(120),
      environment: envSchema,
      customerType: customerTypeSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_subscription_id) throw new Error("No active subscription.");

    const paddlePriceId = await resolvePaddlePriceId(data.environment, data.newPriceId);

    const r = await gatewayFetch(
      data.environment,
      `/subscriptions/${sub.paddle_subscription_id}/preview`,
      {
        method: "PATCH",
        body: JSON.stringify({
          items: [{ price_id: paddlePriceId, quantity: 1 }],
          proration_billing_mode: "prorated_immediately",
        }),
      },
    );
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.detail || "Preview failed");

    const immediate = j.data?.immediate_transaction;
    const next = j.data?.next_transaction;
    return {
      currency: j.data?.currency_code as string,
      immediateAmount: immediate?.details?.totals?.grand_total
        ? Number(immediate.details.totals.grand_total)
        : 0,
      nextAmount: next?.details?.totals?.grand_total
        ? Number(next.details.totals.grand_total)
        : 0,
      nextBilledAt: next?.billing_period?.starts_at ?? null,
    };
  });

/**
 * Cancel the user's current subscription at period end (keeps access until then).
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
    z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_subscription_id) throw new Error("No active subscription.");
    if (!["active", "trialing", "past_due"].includes(sub.status)) {
      throw new Error("Subscription is not active.");
    }
    const paddle = getPaddleClient(data.environment);
    await paddle.subscriptions.cancel(sub.paddle_subscription_id, {
      effectiveFrom: "next_billing_period",
    });
    return { ok: true };
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

/**
 * List the user's recent transactions (invoices) from Paddle.
 */
export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: "sandbox" | "live"; customerType: "consumer" | "retailer" }) =>
    z.object({ environment: envSchema, customerType: customerTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<InvoiceRow[]> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("customer_type", data.customerType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_customer_id) return [];

    const r = await gatewayFetch(
      data.environment,
      `/transactions?customer_id=${encodeURIComponent(sub.paddle_customer_id)}&per_page=12&order_by=billed_at[DESC]`,
    );
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.detail || "Failed to load invoices");

    const rows: InvoiceRow[] = (j.data ?? []).map((t: any) => ({
      id: t.id,
      number: t.invoice_number ?? null,
      status: t.status,
      currency: t.currency_code,
      total: Number(t.details?.totals?.grand_total ?? 0),
      billedAt: t.billed_at ?? t.created_at ?? null,
      invoiceUrl: null,
    }));

    await Promise.all(
      rows.map(async (row) => {
        if (row.status !== "completed" && row.status !== "billed" && row.status !== "paid") return;
        try {
          const ir = await gatewayFetch(data.environment, `/transactions/${row.id}/invoice`);
          const ij = await ir.json();
          if (ir.ok) row.invoiceUrl = ij.data?.url ?? null;
        } catch {
          /* ignore */
        }
      }),
    );
    return rows;
  });
