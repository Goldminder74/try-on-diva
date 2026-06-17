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

// ---------------------------------------------------------------------------
// Gemini try-on generation (Phase 1C)
// ---------------------------------------------------------------------------

// EDITABLE PROMPT — replace this placeholder with the real try-on prompt.
// The following tokens are substituted at call time with the selected wig's
// fields, so you can use them in the real prompt: {wigName}, {wigStyleType},
// {wigColour}. Tokens that are not present are simply left out.
const TRYON_PROMPT = `You are compositing a virtual hair try-on. You are given two images:
IMAGE 1 is a photograph of a real person.
IMAGE 2 is a wig product, named "{wigName}", style type "{wigStyleType}", colour "{wigColour}".

Task: produce a single photorealistic image of the SAME person from IMAGE 1 now wearing the EXACT wig shown in IMAGE 2.

Strict requirements, in priority order:
1. Preserve the person's identity completely: same face, same features, same expression, same body, same background.
2. Preserve the person's skin tone EXACTLY as it appears in IMAGE 1. Do not lighten, brighten, warm, cool, or otherwise alter the skin. Match the original luminance and undertone precisely. This is critical and non-negotiable.
3. Reproduce the wig from IMAGE 2 faithfully: the same length, shape, parting, colour, and texture, including the specific pattern of any braids, locs, or curls. Do not substitute a generic or stylised version. The customer is buying this exact product.
4. Fit the wig naturally with a realistic hairline and natural edges. Replace existing hair.
5. Match the lighting and shadow of IMAGE 1 so the wig looks photographed on this person.

Output only the final composited image.`;
// Gemini image-generation model candidates, tried in order until one returns an
// image. Swapping the backend later only touches callGeminiImageAPI below.
// Note: gemini-1.5-flash and imagen-3.0-generate-002 are unlikely to succeed via
// this generateContent call (1.5-flash returns text, not an inline image; Imagen
// uses a different :predict endpoint), so gemini-2.0-flash-exp is the real target.
const GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "imagen-3.0-generate-002",
] as const;

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

// Encode raw bytes (e.g. a fetched wig image) to base64 for a Gemini inline part.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Substitute the wig fields into TRYON_PROMPT. Unknown tokens are left untouched;
// the placeholder prompt has no tokens, so this is a no-op until you add them.
function buildTryOnPrompt(wig: { name: string; styleType: string; colour: string }): string {
  return TRYON_PROMPT.replaceAll("{wigName}", wig.name)
    .replaceAll("{wigStyleType}", wig.styleType)
    .replaceAll("{wigColour}", wig.colour);
}

/**
 * Single, swappable boundary around the image-generation backend.
 *
 * It takes a text prompt plus the user photo and wig product image (both as
 * base64 + mime type) and returns the generated image as base64. To move off
 * Gemini later, reimplement only this function — generateTryOn never references
 * the provider directly.
 *
 * GEMINI_API_KEY is read here from the server-side environment and is never
 * sent to or exposed in the client.
 */
async function callGeminiImageAPI(input: {
  prompt: string;
  userPhotoBase64: string;
  userPhotoMimeType: string;
  wigImageBase64: string;
  wigImageMimeType: string;
}): Promise<{ imageBase64: string; mimeType: string; model: string }> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in the server environment.");
  }

  const body = {
    contents: [
      {
        parts: [
          { text: input.prompt },
          { inline_data: { mime_type: input.userPhotoMimeType, data: input.userPhotoBase64 } },
          { inline_data: { mime_type: input.wigImageMimeType, data: input.wigImageBase64 } },
        ],
      },
    ],
    // Ask for an image modality in the response.
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  // Try each candidate model in order; return the first that yields an image.
  const failures: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        failures.push(`${model}: HTTP ${res.status} ${detail.slice(0, 200)}`);
        continue;
      }

      const json: any = await res.json();
      const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
      // REST responses use camelCase (inlineData); accept snake_case defensively too.
      const imagePart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);
      const data: string | undefined =
        imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
      const mimeType: string =
        imagePart?.inlineData?.mimeType ?? imagePart?.inline_data?.mime_type ?? "image/png";

      if (!data) {
        failures.push(`${model}: no image in response`);
        continue;
      }

      console.log(`[generateTryOn] image generated with model: ${model}`);
      return { imageBase64: data, mimeType, model };
    } catch (err) {
      failures.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All Gemini models failed. ${failures.join(" | ")}`);
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

/**
 * Generate a virtual try-on image, store it, and return a signed URL.
 *
 * Flow: fetch the wig product image -> call the image-generation backend
 * (callGeminiImageAPI) with the user photo, the wig image and the prompt ->
 * hand the generated base64 to uploadTryOnResult for storage + a signed URL ->
 * log the analytics event to try_on_events (without the result path).
 *
 * COST: every call incurs a Gemini image-generation fee (billed per generated
 * image). A billing cap is set on the Google Cloud / Gemini API project so a
 * traffic spike cannot run up an unbounded bill.
 */
export const generateTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      userPhotoBase64: string;
      userPhotoMimeType: string;
      wigId: string;
      wigImageUrl: string;
      wigName: string;
      wigStyleType: string;
      wigColour: string;
    }) =>
      z
        .object({
          userPhotoBase64: z.string().min(1),
          userPhotoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          wigId: z.string().uuid(),
          wigImageUrl: z.string().url(),
          wigName: z.string().min(1),
          wigStyleType: z.string().min(1),
          wigColour: z.string().min(1),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch the wig product image and encode it for an inline Gemini part.
    const wigRes = await fetch(data.wigImageUrl);
    if (!wigRes.ok) {
      throw new Error(`Could not fetch wig image (${wigRes.status}).`);
    }
    const wigImageMimeType = wigRes.headers.get("content-type") ?? "image/jpeg";
    const wigImageBase64 = arrayBufferToBase64(await wigRes.arrayBuffer());

    // 2. Generate the try-on image (provider hidden behind callGeminiImageAPI).
    const prompt = buildTryOnPrompt({
      name: data.wigName,
      styleType: data.wigStyleType,
      colour: data.wigColour,
    });
    const generated = await callGeminiImageAPI({
      prompt,
      userPhotoBase64: data.userPhotoBase64,
      userPhotoMimeType: data.userPhotoMimeType,
      wigImageBase64,
      wigImageMimeType,
    });

    // 3. Store the result and get a signed URL. uploadTryOnResult reads the same
    //    caller token from the request, so the upload + tryon_results insert run
    //    under this user's RLS.
    const stored = await uploadTryOnResult({
      data: {
        wigId: data.wigId,
        imageBase64: generated.imageBase64,
        contentType: generated.mimeType,
      },
    });

    // 4. Record the analytics event exactly like recordTryOn does — note that the
    //    result path is intentionally NOT written to try_on_events.
    const { data: wig } = await supabase
      .from("wigs")
      .select("retailer_id")
      .eq("id", data.wigId)
      .maybeSingle();
    const { error: evErr } = await supabase.from("try_on_events").insert({
      user_id: userId,
      wig_id: data.wigId,
      retailer_id: wig?.retailer_id ?? null,
      source: "app",
    });
    if (evErr) throw evErr;

    return {
      id: stored.id,
      path: stored.path,
      signedUrl: stored.signedUrl,
      expiresIn: stored.expiresIn,
      model: generated.model,
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
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const stillValid =
      subRow &&
      (subRow.status === "active" || subRow.status === "trialing") &&
      (!subRow.current_period_end || new Date(subRow.current_period_end) > today);
    const isPaid = Boolean(stillValid && (subRow!.plan === "plus" || subRow!.plan === "pro"));
    return {
      count,
      remaining: isPaid ? null : Math.max(0, FREE_QUOTA - count),
      limit: FREE_QUOTA,
      isPaid,
    };
  });



