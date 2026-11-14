import { getPackByPriceId, packExpiresAt } from "@/lib/topup";

/**
 * Grants a purchased try-on pack to a shopper.
 *
 * Takes a Supabase client rather than creating one, so the same code runs from
 * the payment notification handler and from the app's own recovery path.
 * Idempotent: the checkout session id is unique, so a repeated notification
 * never doubles a shopper's balance.
 */
export interface PackGrantArgs {
  userId: string;
  /** Payment mode the pack was bought in; a test-mode pack never counts on the live site. */
  environment: "sandbox" | "live";
  priceId: string;
  sessionId: string;
  amountGbp?: number | null;
  currency?: string | null;
  purchasedAt?: Date;
}

export type PackGrantResult =
  | { ok: true; granted: boolean; credits: number }
  | { error: string };

export async function grantPackCredits(
  client: any,
  args: PackGrantArgs,
): Promise<PackGrantResult> {
  const pack = getPackByPriceId(args.priceId);
  if (!pack) return { error: `Unknown try-on pack: ${args.priceId}` };
  if (!args.userId) return { error: "Missing user for try-on pack" };
  if (!args.sessionId) return { error: "Missing checkout session for try-on pack" };

  const { data: existing } = await client
    .from("try_on_credits")
    .select("id")
    .eq("stripe_checkout_session_id", args.sessionId)
    .maybeSingle();
  if (existing) return { ok: true, granted: false, credits: 0 };

  const purchasedAt = args.purchasedAt ?? new Date();
  const { error } = await client.from("try_on_credits").insert({
    user_id: args.userId,
    credits_purchased: pack.credits,
    credits_used: 0,
    source: "topup",
    price_id: pack.priceId,
    amount_gbp: args.amountGbp ?? pack.amountGbp,
    currency: args.currency ?? pack.currency,
    stripe_checkout_session_id: args.sessionId,
    environment: args.environment,
    status: "active",
    expires_at: packExpiresAt(purchasedAt, pack.validMonths).toISOString(),
  });

  // A concurrent delivery of the same payment lost the race: already granted.
  if (error?.code === "23505") return { ok: true, granted: false, credits: 0 };
  if (error) return { error: error.message };

  return { ok: true, granted: true, credits: pack.credits };
}
