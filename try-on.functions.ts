import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const FREE_QUOTA = 5;

// Signed URLs for stored try-on results last 7 days.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const TRYONS_BUCKET = "tryons";

// Build a Supabase client for use inside server functions.
// Lovable Cloud only exposes the publishable (anon) key server-side — there is no
// service-role key — so all access runs under the publishable key. When an access
// token is supplied the client carries the caller's JWT, so storage writes, row
// inserts and signed-URL generation all execute under that user's RLS. With no token
// the client operates in the anon context and the existing anon storage policy applies.
function makeSupabaseClient(accessToken?: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`,
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Decode a base64 (or data-URL) PNG into bytes for storage upload.
function decodeBase64Image(input: string): Uint8Array {
  const base64 = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Read the caller's bearer token from the request, if the client attached one
// (the global attachSupabaseAuth middleware adds it whenever a session exists).
function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
}

/**
 * Persist a generated try-on image.
 *
 * Signed-in caller: uploads to `tryons/<uid>/<uuid>.png`, inserts a tryon_results
 * row (user_id, wig_id, result_url = the storage PATH) and returns a fresh 7-day
 * signed URL. All three operations run under the caller's JWT so the existing
 * user-only RLS policies allow them.
 *
 * Anonymous caller (no valid auth uid): uploads to `tryons/anon/<uuid>.png` using
 * the anon storage policy, does NOT insert a row, and returns a 7-day signed URL
 * for use in this session only.
 */
export const uploadTryOnResult = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { wigId: string; imageBase64: string; contentType?: string }) =>
      z
        .object({
          wigId: z.string().min(1),
          imageBase64: z.string().min(1),
          contentType: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const contentType = data.contentType ?? "image/png";
    const bytes = decodeBase64Image(data.imageBase64);
    const objectId = crypto.randomUUID();

    // Resolve the caller's identity from their token (same verification path as
    // requireSupabaseAuth). Absent or invalid token => anonymous.
    const token = getBearerToken();
    let userId: string | null = null;
    let authedClient: ReturnType<typeof makeSupabaseClient> | null = null;
    if (token) {
      authedClient = makeSupabaseClient(token);
      const { data: claimsData } = await authedClient.auth.getClaims(token);
      userId = claimsData?.claims?.sub ?? null;
    }

    if (userId && authedClient) {
      const supabase = authedClient;
      const path = `${userId}/${objectId}.png`;

      const { error: uploadError } = await supabase.storage
        .from(TRYONS_BUCKET)
        .upload(path, bytes, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      // Store the storage PATH (not a signed URL) in result_url.
      const { data: row, error: insertError } = await supabase
        .from("tryon_results")
        .insert({ user_id: userId, wig_id: data.wigId, result_url: path })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { data: signed, error: signError } = await supabase.storage
        .from(TRYONS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signError) throw signError;

      return {
        authenticated: true as const,
        id: row.id,
        path,
        signedUrl: signed.signedUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
      };
    }

    // Anonymous path: anon client + anon/ folder. No row inserted.
    const supabase = makeSupabaseClient();
    const path = `anon/${objectId}.png`;

    const { error: uploadError } = await supabase.storage
      .from(TRYONS_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await supabase.storage
      .from(TRYONS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return {
      authenticated: false as const,
      id: null,
      path,
      signedUrl: signed.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    };
  });

/**
 * Return a fresh 7-day signed URL for a previously stored try-on result.
 * Requires an authenticated caller (requireSupabaseAuth rejects unauthenticated
 * requests with 401) and confirms the row belongs to the caller before signing.
 */
export const getTryOnSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("tryon_results")
      .select("id, user_id, result_url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;

    // RLS already restricts SELECT to the owner; verify explicitly as defence in depth.
    if (!row || row.user_id !== userId) {
      throw new Response("Not found", { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(TRYONS_BUCKET)
      .createSignedUrl(row.result_url, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return {
      id: row.id,
      path: row.result_url,
      signedUrl: signed.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    };
  });

export const recordTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { wigId: string }) =>
    z.object({ wigId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof, error: pErr } = await supabase
      .from("consumer_profiles")
      .select("try_on_count_this_month, try_on_month_reset")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw pErr;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    let count = 0;
    if (prof) {
      count = prof.try_on_month_reset && prof.try_on_month_reset >= monthStart
        ? prof.try_on_count_this_month
        : 0;
    }

    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("profile_id", userId)
      .eq("customer_type", "consumer")
      .order("created_at", { ascending: false })
      .limit(1);
    const subRow = subRows?.[0];
    const stillValid =
      !!subRow &&
      ((["active", "trialing", "past_due"].includes(subRow.status) &&
        (!subRow.current_period_end || new Date(subRow.current_period_end) > new Date())) ||
        (subRow.status === "canceled" &&
          subRow.current_period_end &&
          new Date(subRow.current_period_end) > new Date()));
    const isPaid = Boolean(stillValid && (subRow!.plan === "plus" || subRow!.plan === "pro"));

    if (!isPaid && count >= FREE_QUOTA) {
      return { allowed: false as const, reason: "quota", remaining: 0 };
    }

    const { data: wig } = await supabase
      .from("wigs")
      .select("retailer_id")
      .eq("id", data.wigId)
      .maybeSingle();

    const { error: insErr } = await supabase.from("try_on_events").insert({
      user_id: userId,
      wig_id: data.wigId,
      retailer_id: wig?.retailer_id ?? null,
      source: "app",
    });
    if (insErr) throw insErr;

    const newCount = count + 1;
    const { error: upErr } = await supabase
      .from("consumer_profiles")
      .update({
        try_on_count_this_month: newCount,
        try_on_month_reset: monthStart,
      })
      .eq("user_id", userId);
    if (upErr) throw upErr;

    return {
      allowed: true as const,
      remaining: isPaid ? null : Math.max(0, FREE_QUOTA - newCount),
    };
  });

export const getTryOnQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("consumer_profiles")
      .select("try_on_count_this_month, try_on_month_reset")
      .eq("user_id", userId)
      .maybeSingle();
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const count = prof && prof.try_on_month_reset >= monthStart ? prof.try_on_count_this_month : 0;

    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("profile_id", userId)
      .eq("customer_type", "consumer")
      .order("created_at", { ascending: false })
      .limit(1);
    const subRow = subRows?.[0];
    const stillValid =
      !!subRow &&
      ((["active", "trialing", "past_due"].includes(subRow.status) &&
        (!subRow.current_period_end || new Date(subRow.current_period_end) > new Date())) ||
        (subRow.status === "canceled" &&
          subRow.current_period_end &&
          new Date(subRow.current_period_end) > new Date()));
    const isPaid = Boolean(stillValid && (subRow!.plan === "plus" || subRow!.plan === "pro"));

    return {
      isPaid,
      used: count,
      quota: FREE_QUOTA,
      remaining: isPaid ? null : Math.max(0, FREE_QUOTA - count),
    };
  });
