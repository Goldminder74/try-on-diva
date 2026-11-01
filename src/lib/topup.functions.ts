import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { TRYON_PACKS, getPackByPriceId } from "@/lib/topup";
import { grantPackCredits } from "@/lib/topup.grant";

export interface TryOnCreditRow {
  id: string;
  credits_purchased: number;
  credits_used: number;
  price_id: string | null;
  amount_gbp: number | null;
  currency: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface TryOnCreditsSummary {
  /** Try-ons still available across every unexpired pack. */
  remaining: number;
  packs: Array<TryOnCreditRow & { credits_remaining: number }>;
}

/** The shopper's purchased try-on balance and the packs behind it. */
export const getMyTryOnCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TryOnCreditsSummary> => {
    const { supabase, userId } = context;

    const { data: balance } = await supabase.rpc("get_try_on_credit_balance");

    const { data: rows, error } = await supabase
      .from("try_on_credits")
      .select(
        "id, credits_purchased, credits_used, price_id, amount_gbp, currency, status, expires_at, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const now = Date.now();
    const packs = (rows ?? [])
      .map((r) => ({
        ...r,
        amount_gbp: r.amount_gbp === null ? null : Number(r.amount_gbp),
        credits_remaining:
          r.status === "active" && new Date(r.expires_at).getTime() > now
            ? r.credits_purchased - r.credits_used
            : 0,
      }))
      .filter((r) => r.credits_remaining > 0 || new Date(r.expires_at).getTime() > now);

    return { remaining: balance ?? 0, packs };
  });

/**
 * Pull the shopper's completed one-off purchases straight from the payment
 * provider and grant any pack we have not recorded yet.
 *
 * The provider's notification normally lands first; this is the self-healing
 * path used by the success page so a missed notification never costs a shopper
 * a pack they already paid for.
 */
export const syncMyTopUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ synced: number; error?: string }> => {
    const { userId } = context;
    try {
      const stripe = createStripeClient(data.environment);
      const customers = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      const customer = customers.data[0];
      if (!customer) return { synced: 0 };

      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 20,
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let synced = 0;

      for (const session of sessions.data) {
        if (session.mode !== "payment") continue;
        if (!["paid", "no_payment_required"].includes(session.payment_status)) continue;
        if (session.metadata?.userId && session.metadata.userId !== userId) continue;

        const lookupKey = session.metadata?.packPriceId ?? null;
        const pack = getPackByPriceId(lookupKey);
        if (!pack) continue;

        const result = await grantPackCredits(supabaseAdmin, {
          userId,
          priceId: pack.priceId,
          sessionId: session.id,
          amountGbp: session.amount_total ? session.amount_total / 100 : null,
          currency: session.currency?.toUpperCase() ?? "GBP",
          purchasedAt: session.created
            ? new Date(session.created * 1000)
            : new Date(),
        });
        if ("ok" in result && result.ok && result.granted) synced += 1;
      }

      return { synced };
    } catch (error) {
      console.error("syncMyTopUps failed:", getStripeErrorMessage(error));
      return { synced: 0, error: "sync-failed" };
    }
  });

/** Pack definitions the UI can render (price, size, expiry). */
export const getTryOnPacks = createServerFn({ method: "GET" }).handler(async () =>
  TRYON_PACKS.map((p) => ({
    priceId: p.priceId,
    credits: p.credits,
    amountGbp: p.amountGbp,
    currency: p.currency,
    validMonths: p.validMonths,
    label: p.label,
    blurb: p.blurb,
  })),
);
