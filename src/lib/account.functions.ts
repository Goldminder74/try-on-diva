import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDeleteConfirmed, isOwnStoragePath, shouldCancelOnDelete } from "@/lib/account-deletion";

const BUCKET = "tryons";

async function assertShopper(supabase: any, userId: string) {
  for (const role of ["retailer", "admin"]) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data) throw new Error("This option is only available for shopper accounts.");
  }
}

/** List the caller's saved try-ons with short-lived image links. */
export const listMyTryOns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Same history window as opening a single saved look: Pro keeps
    // everything, other plans a rolling number of days.
    const { getMyPlanFeatures } = await import("@/lib/try-on.functions");
    const { historyDays } = await getMyPlanFeatures();
    let query = supabase
      .from("tryon_results")
      .select("id, wig_id, result_url, created_at")
      .eq("user_id", userId);
    if (historyDays) {
      query = query.gte("created_at", new Date(Date.now() - historyDays * 86400000).toISOString());
    }
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const list = rows ?? [];
    const paths = list.map((r) => r.result_url).filter((p) => isOwnStoragePath(p, userId));
    const signed = paths.length
      ? (await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)).data ?? []
      : [];
    const byPath = new Map(signed.map((s: any) => [s.path, s.signedUrl]));
    return list.map((r) => ({ id: r.id, createdAt: r.created_at, url: (byPath.get(r.result_url) as string) ?? null }));
  });

/** Delete one of the caller's try-ons: the database row and the stored image. */
export const deleteMyTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("tryon_results").select("id, user_id, result_url").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!row || row.user_id !== userId) throw new Error("Try-on not found.");
    if (isOwnStoragePath(row.result_url, userId)) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.result_url]);
      if (rmErr) throw rmErr;
    }
    const { error: delErr } = await supabase.from("tryon_results").delete().eq("id", row.id).eq("user_id", userId);
    if (delErr) throw delErr;
    return { ok: true };
  });

async function removeAllTryOns(client: any, userId: string) {
  const { data: rows, error } = await client.from("tryon_results").select("id, result_url").eq("user_id", userId);
  if (error) throw error;
  const paths = (rows ?? []).map((r: any) => r.result_url).filter((p: string) => isOwnStoragePath(p, userId));
  // Also sweep any stray files left in the user's folder.
  const { data: listed } = await client.storage.from(BUCKET).list(userId, { limit: 1000 });
  for (const f of listed ?? []) {
    const p = `${userId}/${f.name}`;
    if (!paths.includes(p)) paths.push(p);
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error: rmErr } = await client.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (rmErr) throw rmErr;
  }
  const { error: delErr } = await client.from("tryon_results").delete().eq("user_id", userId);
  if (delErr) throw delErr;
  return paths.length;
}

/** Delete every try-on the caller has saved, with their stored images. */
export const deleteAllMyTryOns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const removed = await removeAllTryOns(context.supabase, context.userId);
    return { ok: true, removed };
  });

/**
 * Permanently delete a shopper account. Runs server-side with the service role
 * after verifying the caller and the typed confirmation.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string; environment: "sandbox" | "live" }) =>
    z.object({ confirm: z.string(), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!isDeleteConfirmed(data.confirm)) throw new Error("Type DELETE to confirm.");
    await assertShopper(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeClient, deploymentStripeEnv, getStripeErrorMessage } = await import(
      "@/lib/stripe.server"
    );
    const admin: any = supabaseAdmin;

    // 1. Stripe: cancel subscriptions immediately and anonymise the customer.
    const { data: subs, error: subErr } = await admin
      .from("subscriptions")
      .select("id, status, environment, stripe_subscription_id, stripe_customer_id")
      .or(`user_id.eq.${userId},profile_id.eq.${userId}`);
    if (subErr) throw subErr;
    const customers = new Map<string, "sandbox" | "live">();
    try {
      for (const s of subs ?? []) {
        if (s.environment !== "sandbox" && s.environment !== "live") continue;
        const stripe = createStripeClient(s.environment);
        if (s.stripe_subscription_id && shouldCancelOnDelete(s.status)) {
          await stripe.subscriptions.cancel(s.stripe_subscription_id, { prorate: false, invoice_now: false });
        }
        if (s.stripe_customer_id) customers.set(s.stripe_customer_id, s.environment);
      }
      // Look in both payment modes, so a customer record is never left behind
      // because the browser named the wrong one. A mode with no key configured
      // is skipped.
      for (const env of ["live", "sandbox"] as const) {
        try {
          const found = await createStripeClient(env).customers.search({
            query: `metadata['userId']:'${userId}'`,
            limit: 20,
          });
          for (const c of found.data) customers.set(c.id, env);
        } catch (error) {
          if (env === deploymentStripeEnv()) throw error;
        }
      }
      for (const [id, env] of customers) {
        await createStripeClient(env).customers.update(id, {
          name: "", email: "", phone: "", description: "Deleted Wigsmi account",
          metadata: { userId: "", deleted_account: "true" },
        });
      }
    } catch (error) {
      console.error("[account:delete] payment provider step failed:", getStripeErrorMessage(error));
      return {
        error:
          "We could not close your billing record, so nothing was deleted. Please try again, or contact us if it keeps happening.",
      };
    }

    // 2. Try-ons and their images.
    await removeAllTryOns(admin, userId);

    // 3. Profile photos.
    const { data: photos } = await admin.storage.from("user-photos").list(userId, { limit: 1000 });
    const photoPaths = (photos ?? []).map((f: any) => `${userId}/${f.name}`);
    if (photoPaths.length) {
      const { error } = await admin.storage.from("user-photos").remove(photoPaths);
      if (error) throw error;
    }

    // 4. Personal data.
    for (const [table, col] of [["wishlist_items", "user_id"], ["consumer_profiles", "user_id"]] as const) {
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (error) throw error;
    }

    // 5. Keep financial records, unlinked from the person.
    const now = new Date().toISOString();
    {
      const { error } = await admin.from("subscriptions").update({ user_id: null, profile_id: null, status: "canceled", updated_at: now }).or(`user_id.eq.${userId},profile_id.eq.${userId}`);
      if (error) throw error;
    }
    {
      const { error } = await admin.from("try_on_credits").update({ user_id: null, updated_at: now }).eq("user_id", userId);
      if (error) throw error;
    }

    // 6. Profile and sign-in account (profile row cascades with the auth user).
    await admin.from("profiles").delete().eq("id", userId);
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;
    return { ok: true };
  });
