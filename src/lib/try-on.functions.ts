import { utmFromCookieHeader } from "@/lib/utm";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type ConsumerTier, consumerTier, planFeatures } from "@/lib/entitlements";
import { deploymentStripeEnv } from "@/lib/stripe.server";

// A "try-on" is one set of three angles (front, side, back) generated together
// and charged as a single unit against the free monthly allowance.
const ALL_VIEWS = ["front", "side", "back"] as const;

/** Resolve the consumer's current tier from their latest consumer subscription. */
async function getConsumerTier(supabase: any, userId: string): Promise<ConsumerTier> {
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("profile_id", userId)
    .eq("customer_type", "consumer")
    // A test-mode subscription never unlocks a plan on the live site.
    .eq("environment", deploymentStripeEnv())
    .order("created_at", { ascending: false })
    .limit(1);
  return consumerTier(subRows?.[0]);
}

/** Purchased try-ons still available to this shopper in this payment mode. */
async function getCreditBalance(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any).rpc("try_on_credit_balance_as", {
    _user_id: userId,
    _environment: deploymentStripeEnv(),
  });
  return typeof data === "number" ? data : 0;
}

/** What the signed-in shopper's plan unlocks (quota, watermark, history). */
export const getMyPlanFeatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return planFeatures(await getConsumerTier(supabase, userId));
  });

// Signed URLs for stored try-on results last 7 days.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const TRYONS_BUCKET = "tryons";

// ---------------------------------------------------------------------------
// Gemini try-on generation (Phase 1C)
// ---------------------------------------------------------------------------

// EDITABLE PROMPT. The product photographs are the sole visual source of truth:
// no catalogue text (name, style type, colour) is sent to the generator, so a
// mislabelled listing can never influence the generated result.
const TRYON_PROMPT = `You are compositing a virtual hair try-on. You are given:
IMAGE 1 is a photograph of a real person.
The REMAINING images are photographs of ONE single wig product. They are different photographs of the SAME product; use all of them together as the ground truth for how the wig looks.

Task: produce a single photorealistic image of the SAME person from IMAGE 1 now wearing the EXACT wig shown in the product images.

Strict requirements, in priority order:
1. Product fidelity is the highest priority after identity. The wig in the product images is the ground truth. Copy its exact length, silhouette, volume, density, parting position, hairline shape, curl or braid or loc pattern and pattern scale, ends (blunt, layered, tapered), and colour including every highlight, ombre, balayage or multi-tone section. Never invent, simplify, restyle or substitute a similar-looking wig. Never default to plain black or a generic straight/wavy texture. If the product is braids, locs, twists, a bob, a pixie or a fringe style, the output MUST be that same style, not an approximation.
2. Preserve the person's identity completely: same face, same features, same expression, same body, same background.
3. Preserve the person's skin tone EXACTLY as it appears in IMAGE 1. Do not lighten, brighten, warm, cool, or otherwise alter the skin. Match the original luminance and undertone precisely. This is critical and non-negotiable.
4. Fit the wig to the correct anatomical position, with a realistic hairline and natural edges. Replace existing hair. The hairline must sit at the natural hairline position on the forehead, approximately 5 to 7cm above the eyebrows. The wig must never cover the eyebrows or sit above the natural hairline. For bob styles and styles with a fringe, the fringe must fall between mid-forehead and just above the eyebrows, not over them. The wig should sit flush to the head with natural volume, not raised or floating above the scalp.
5. Match the lighting and shadow of IMAGE 1 so the wig looks photographed on this person.

Before you output, compare your result against the product images: if the length, texture pattern or colour differs, correct it. Output only the final composited image.`;

// Gemini image-generation model candidates, tried in order until one returns an
// image. Swapping the backend later only touches callGeminiImageAPI below.
// Current Nano Banana image models, verified against
// https://ai.google.dev/gemini-api/docs/image-generation:
//   gemini-nano-banana-2.1 = Nano Banana 2.1
//   gemini-3-pro-image     = Nano Banana Pro (stable)
const GEMINI_MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image"] as const;

// The front view is the one the shopper judges the product by, so it runs on the
// higher-fidelity Pro model first and falls back to Nano Banana 2.1. Side and back views
// keep the faster ordering; all three still run in parallel.
const FRONT_MODELS = ["gemini-3-pro-image", "gemini-nano-banana-2.1"] as const;

function modelsForView(view: TryOnView): readonly string[] {
  return view === "front" ? FRONT_MODELS : GEMINI_MODELS;
}

// Largest image accepted from a shopper or fetched for a product: 10 MB.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// The same limit expressed as base64 characters (4 characters per 3 bytes).
const MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64;

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/** What the leading bytes say a file is, whatever the sender declared. */
function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

// Decode a base64 (or data-URL) image into bytes for storage upload.
function decodeBase64Image(input: string): Uint8Array {
  const base64 = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The browser checks a selfie's size and type before sending it, but a direct
 * request skips the browser. Check again here, from the bytes themselves, and
 * return the real type so a mislabelled file is never forwarded as an image.
 */
function checkedSelfie(base64Input: string): { base64: string; mimeType: ImageMime } {
  const base64 = base64Input.includes(",")
    ? base64Input.slice(base64Input.indexOf(",") + 1)
    : base64Input;
  let head: Uint8Array;
  try {
    head = decodeBase64Image(base64.slice(0, 32));
  } catch {
    throw new Error("That photo could not be read. Please upload a JPG, PNG or WebP.");
  }
  const mimeType = sniffImageMime(head);
  if (!mimeType) throw new Error("That photo could not be read. Please upload a JPG, PNG or WebP.");
  return { base64, mimeType };
}

/**
 * A product image address the server is willing to fetch: a public https page,
 * never an internal or loopback address.
 */
function isFetchableImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal"))
    return false;
  if (host.endsWith(".local") || !host.includes(".")) return false;
  // Literal IP addresses (v4 or v6) are never a shop's image host.
  if (/^[0-9.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  return true;
}

// Encode raw bytes (e.g. a fetched wig image) to base64 for a Gemini inline part.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Fetch up to `max` photographs of the same wig product and encode them as
 * inline Gemini parts. More reference angles means the model has far less room
 * to invent a different-looking wig. The first URL is required; extra ones are
 * best-effort.
 */
async function fetchWigReferenceImages(
  urls: string[],
  max = 3,
): Promise<{ base64: string; mimeType: string }[]> {
  const unique = Array.from(new Set(urls.filter(isFetchableImageUrl))).slice(0, max);
  if (unique.length === 0) throw new Error("This wig has no product image.");

  const settled = await Promise.allSettled(
    unique.map(async (url) => {
      const res = await fetch(url, { redirect: "error" });
      if (!res.ok) throw new Error(`Could not fetch wig image (${res.status}).`);
      if (Number(res.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) {
        throw new Error("Wig image is too large.");
      }
      const mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      // A missing image often returns an HTML error page with a 200, which would
      // silently be sent to the model as "the product" and produce a wig that
      // looks nothing like the catalogue photo. Reject anything that is not an image.
      if (!mimeType.startsWith("image/")) {
        throw new Error(`Wig image URL did not return an image (${mimeType || "unknown type"}).`);
      }
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1024) throw new Error("Wig image is empty or corrupt.");
      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Wig image is too large.");
      return { mimeType, base64: arrayBufferToBase64(bytes) };
    }),
  );

  const images = settled
    .filter(
      (s): s is PromiseFulfilledResult<{ base64: string; mimeType: string }> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);

  if (images.length === 0) {
    const reason = settled.find((s) => s.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    throw new Error(
      reason?.reason instanceof Error ? reason.reason.message : "Could not fetch wig image.",
    );
  }
  return images;
}

/**
 * The catalogue record is the only source for what the shopper selected. The
 * product's own photographs are read from the database by id; addresses sent
 * by the browser are never fetched, so the server cannot be pointed at an
 * arbitrary address and a try-on is always built from a real listing.
 */
async function resolveWigReferenceImages(
  client: { from: (t: string) => any },
  wigId: string,
  /** Set when the lookup runs with full access, so drafts stay private. */
  publishedOnly = false,
): Promise<{ base64: string; mimeType: string }[]> {
  const origin = (() => {
    try {
      const req = getRequest();
      return req?.url ? new URL(req.url).origin : "";
    } catch {
      return "";
    }
  })();

  let lookup = client.from("wigs").select("images").eq("id", wigId).is("deleted_at", null);
  if (publishedOnly) lookup = lookup.eq("is_published", true);
  const { data: row } = await lookup.maybeSingle();
  const images: string[] = Array.isArray(row?.images) ? row.images : [];
  const dbUrls = images
    .filter(Boolean)
    .map((u) => (u.startsWith("http") ? u : origin ? new URL(u, origin).href : ""))
    .filter(Boolean);
  return fetchWigReferenceImages(dbUrls);
}

// The prompt carries no catalogue text: only the camera-angle instruction is
// appended. Photographs are the sole visual source of truth.
export type TryOnView = "front" | "side" | "back";

// Extra camera-angle instruction appended for the optional side/back views.
const VIEW_INSTRUCTIONS: Record<TryOnView, string> = {
  front: "",
  side: `
Camera angle: render this as a THREE-QUARTER / SIDE profile view of the same person wearing the same wig. Rotate the head roughly 60 degrees so one side of the face and the full side of the hair are visible. Keep the same person, same skin tone, same wig product, same lighting and same background.`,
  back: `
Camera angle: render this as a BACK view of the same person wearing the same wig, photographed from behind. The face is not visible. Show the full back of the hair: length, density, parting or braid pattern exactly as in IMAGE 2. Keep the same person's head shape, skin tone on the neck and ears, same lighting and same background.`,
};

function buildTryOnPrompt(view: TryOnView = "front"): string {
  return TRYON_PROMPT + VIEW_INSTRUCTIONS[view];
}

/**
 * Single, swappable boundary around the image-generation backend.
 *
 * It takes a text prompt plus the user photo and wig product image (both as
 * base64 + mime type) and returns the generated image as base64. To move off
 * Gemini later, reimplement only this function - generateTryOn never references
 * the provider directly.
 *
 * GEMINI_API_KEY is read here from the server-side environment and is never
 * sent to or exposed in the client.
 */
async function callGeminiImageAPI(input: {
  prompt: string;
  userPhotoBase64: string;
  userPhotoMimeType: string;
  /** One or more photographs of the SAME wig product, used as ground truth. */
  wigImages: { base64: string; mimeType: string }[];
  models?: readonly string[];
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
          ...input.wigImages.map((img) => ({
            inline_data: { mime_type: img.mimeType, data: img.base64 },
          })),
        ],
      },
    ],
    // Ask for an image modality in the response.
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  // Try each candidate model in order; return the first that yields an image.
  const failures: string[] = [];
  for (const model of input.models ?? GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

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
      const data: string | undefined = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
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
 * Persist a generated try-on image for a signed-in shopper.
 *
 * Uploads to `tryons/<uid>/<uuid>.png`, inserts a tryon_results row (result_url
 * holds the storage PATH) and returns a fresh 7-day signed URL. All three run
 * under the shopper's own session, so the user-only storage and table rules
 * apply. This is deliberately not a server function: it used to be callable by
 * anyone, with any content, and is now reachable only from generateTryOn with
 * an image the generator produced.
 */
async function storeTryOnResult(
  supabase: any,
  userId: string,
  input: { wigId: string; imageBase64: string },
) {
  const bytes = decodeBase64Image(input.imageBase64);
  const contentType = sniffImageMime(bytes);
  if (!contentType || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("The generated image could not be stored.");
  }
  const path = `${userId}/${crypto.randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage
    .from(TRYONS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  // Store the storage PATH (not a signed URL) in result_url.
  const { data: row, error: insertError } = await supabase
    .from("tryon_results")
    .insert({ user_id: userId, wig_id: input.wigId, result_url: path })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { data: signed, error: signError } = await supabase.storage
    .from(TRYONS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError) throw signError;

  return { id: row.id as string, path, signedUrl: signed.signedUrl as string };
}

/**
 * Return a fresh 7-day signed URL for a previously stored try-on result.
 * Requires an authenticated caller (requireSupabaseAuth rejects unauthenticated
 * requests with 401) and confirms the row belongs to the caller before signing.
 */
export const getTryOnSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("tryon_results")
      .select("id, user_id, result_url, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;

    // RLS already restricts SELECT to the owner; verify explicitly as defence in depth.
    if (!row || row.user_id !== userId) {
      throw new Response("Not found", { status: 404 });
    }

    // History retention: Pro keeps saved looks forever, everyone else keeps a
    // rolling window.
    const features = planFeatures(await getConsumerTier(supabase, userId));
    if (features.historyDays && row.created_at) {
      const ageDays = (Date.now() - new Date(row.created_at).getTime()) / 86400000;
      if (ageDays > features.historyDays) {
        throw new Error(
          `Saved looks are kept for ${features.historyDays} days on your plan. Upgrade to Pro to keep your full history.`,
        );
      }
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
export const FRIENDLY_GENERATION_ERROR =
  "Something went wrong generating your try-on. Please try again in a moment.";

// Logs the full technical error on the server only and sends the client a
// single friendly message, so model, provider and billing details never leak.
function safeGeneration<A extends unknown[], R>(flow: string, fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof Response) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/limit reached/i.test(msg)) throw new Error("Free try-on limit reached this month.");
      console.error(`[try-on:${flow}] generation failed`, err);
      throw new Error(FRIENDLY_GENERATION_ERROR);
    }
  };
}

export const generateTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      userPhotoBase64: string;
      userPhotoMimeType: string;
      wigId: string;
      wigImageUrl: string;
      /** Extra photographs of the same product, used as reference. */
      wigImageUrls?: string[];

      wigName: string;
      wigStyleType: string;
      wigColour: string;
      /** Ignored: all three angles are always generated together. */
      view?: TryOnView;
    }) =>
      z
        .object({
          userPhotoBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
          userPhotoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          wigId: z.string().uuid(),
          // Sent by older pages; ignored. Product photos come from the catalogue.
          wigImageUrl: z.string().max(2048).optional(),
          wigImageUrls: z.array(z.string().max(2048)).max(4).optional(),

          wigName: z.string().max(300).optional(),
          wigStyleType: z.string().max(300).optional(),
          wigColour: z.string().max(300).optional(),
          view: z.enum(["front", "side", "back"]).optional(),
        })
        .parse(d),
  )
  .handler(
    safeGeneration("authenticated", async ({ data, context }) => {
      const { supabase, userId } = context;
      const selfie = checkedSelfie(data.userPhotoBase64);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 0. Reserve the quota slot atomically BEFORE spending money on generation.
      //    consume_try_on() increments in a single statement guarded by the free
      //    limit, so parallel tabs cannot both slip past the last free try-on.
      const tier = await getConsumerTier(supabase, userId);
      const features = planFeatures(tier);
      //    The server spends on the shopper's behalf: the spend and refund
      //    functions are not callable with a browser key.
      const { data: reservation, error: reserveErr } = await (supabaseAdmin as any).rpc(
        "consume_try_on_as",
        {
          _user_id: userId,
          _limit: features.monthlyTryOns,
          _environment: deploymentStripeEnv(),
        },
      );

      if (reserveErr) throw reserveErr;
      const reserved = Array.isArray(reservation) ? reservation[0] : reservation;
      if (!reserved?.allowed) {
        throw new Error(
          tier === "free"
            ? "Free try-on limit reached this month. Buy a 10 try-on pack for £2.99, or it resets on the 1st."
            : `Monthly try-on limit reached (${features.monthlyTryOns} on your plan). Buy a 10 try-on pack for £2.99, or it resets on the 1st.`,
        );
      }

      // Which bucket paid for this try-on: the plan's monthly allowance or a
      // purchased pack. A refund has to go back to the same one.
      const paidFrom: string = reserved.source ?? "quota";
      const creditId: string | null = reserved.credit_id ?? null;

      // Any failure past this point refunds the reserved try-on.
      const refund = async () => {
        try {
          await (supabaseAdmin as any).rpc("refund_try_on_as", {
            _user_id: userId,
            _source: paidFrom,
            _credit_id: creditId,
          });
        } catch {
          /* best effort */
        }
      };

      try {
        // 1. Fetch every available photograph of this product as reference.
        const wigImages = await resolveWigReferenceImages(supabase as any, data.wigId);

        // 2. Generate all three camera angles in parallel, so the full set comes
        //    back in roughly the time one image used to take.
        const settled = await Promise.allSettled(
          ALL_VIEWS.map(async (view) => {
            const generated = await callGeminiImageAPI({
              prompt: buildTryOnPrompt(view),
              userPhotoBase64: selfie.base64,
              userPhotoMimeType: selfie.mimeType,
              wigImages,
              models: features.priorityGeneration ? FRONT_MODELS : modelsForView(view),
            });

            const stored = await storeTryOnResult(supabase, userId, {
              wigId: data.wigId,
              imageBase64: generated.imageBase64,
            });
            return { view, generated, stored };
          }),
        );

        const views: Record<TryOnView, string | null> = { front: null, side: null, back: null };
        let front: { id: string | null; path: string; signedUrl: string; model: string } | null =
          null;
        for (const outcome of settled) {
          if (outcome.status !== "fulfilled") continue;
          const { view, stored, generated } = outcome.value;
          views[view] = stored.signedUrl;
          if (view === "front") {
            front = {
              id: stored.id,
              path: stored.path,
              signedUrl: stored.signedUrl,
              model: generated.model,
            };
          }
        }

        // The front view is the headline result: without it, the try-on failed.
        if (!front) {
          const reason = settled.find((s) => s.status === "rejected") as
            | PromiseRejectedResult
            | undefined;
          throw new Error(
            reason?.reason instanceof Error ? reason.reason.message : "Try-on generation failed.",
          );
        }
        const stored = front;

        // 4. Record the single analytics event for this try-on.
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
          expiresIn: SIGNED_URL_TTL_SECONDS,
          model: stored.model,
          views,
        };
      } catch (err) {
        await refund();
        throw err;
      }
    }),
  );

export const recordTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { wigId: string }) => z.object({ wigId: z.string().uuid() }).parse(d))
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
      count =
        prof.try_on_month_reset && prof.try_on_month_reset >= monthStart
          ? prof.try_on_count_this_month
          : 0;
    }

    const cap = planFeatures(await getConsumerTier(supabase, userId)).monthlyTryOns;
    const credits = await getCreditBalance(userId);

    // The plan's monthly allowance is spent first; a purchased pack covers
    // anything beyond it.
    if (count >= cap && credits <= 0) {
      return { allowed: false as const, reason: "quota", remaining: 0 };
    }

    // NOTE: the analytics event and the quota increment are committed by
    // generateTryOn only after an image is actually produced, so a failed
    // generation neither inflates retailer analytics nor burns a free try-on.
    return {
      allowed: true as const,
      remaining: Math.max(0, cap - (count + 1)) + credits,
    };
  });

export const getTryOnQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment?: "sandbox" | "live" }) =>
    z.object({ environment: z.enum(["sandbox", "live"]).optional() }).parse(d ?? {}),
  )
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
    // The payment mode is the deployment's; the value a browser sends is ignored.
    const tier = await getConsumerTier(supabase, userId);
    const features = planFeatures(tier);
    const isPaid = tier !== "free";
    const credits = await getCreditBalance(userId);
    const planRemaining = Math.max(0, features.monthlyTryOns - count);
    return {
      count,
      // What the shopper can still do this month: plan allowance plus packs.
      remaining: planRemaining + credits,
      limit: features.monthlyTryOns,
      planRemaining,
      creditsRemaining: credits,
      isPaid,
      tier,
      features,
    };
  });

// ---------------------------------------------------------------------------
// Anonymous free try-ons (no account required)
//
// Lets a first-time visitor complete ANON_FREE_QUOTA full try-on sets, then
// prompts for signup. Enforcement combines a client-issued deviceId
// (localStorage) with a browser fingerprint hash and a server-hashed IP.
// Rows in `anonymous_tryons` are counted per device_id OR fingerprint_hash,
// so clearing cookies is not an escape hatch. Authenticated try-ons are
// unaffected.
// ---------------------------------------------------------------------------

const ANON_FREE_QUOTA = 2;
// Safety net so cycling browsers / private windows on one connection can't
// mint unlimited free sets. Generous enough for households and offices.
const ANON_IP_MONTHLY_CAP = 8;
// Ceiling on free try-ons across ALL visitors in one UTC day. The device id and
// fingerprint are made up by the browser and an address can be rotated, so this
// is what bounds the generation bill if someone scripts the endpoint. Raise it
// with the ANON_TRYON_DAILY_CAP setting as real traffic grows.
const ANON_GLOBAL_DAILY_CAP = Number(process.env.ANON_TRYON_DAILY_CAP) || 60;
// Placeholder stored while a reserved try-on is still generating.
const ANON_PENDING_PATH = "pending";

// Browser-issued identifiers are a UUID and a hex digest. Anything else is
// refused, so they can be used safely in a filter.
const anonId = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);

function currentMonthStart(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${m}-01`;
}

// A failed count is an error, never a zero: the limits fail closed.
async function countAnonymousTryOns(
  supabaseAdmin: { from: (t: string) => any },
  deviceId: string,
  fingerprintHash: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("anonymous_tryons")
    .select("id", { count: "exact", head: true })
    .eq("month_start", currentMonthStart())
    .or(`device_id.eq.${deviceId},fingerprint_hash.eq.${fingerprintHash}`);
  if (error || count === null) throw new Error("Could not check the free try-on allowance.");
  return count;
}

async function countAnonymousTryOnsByIp(
  supabaseAdmin: { from: (t: string) => any },
  ipHash: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("anonymous_tryons")
    .select("id", { count: "exact", head: true })
    .eq("month_start", currentMonthStart())
    .eq("ip_hash", ipHash);
  if (error || count === null) throw new Error("Could not check the free try-on allowance.");
  return count;
}

async function countAnonymousTryOnsToday(supabaseAdmin: {
  from: (t: string) => any;
}): Promise<number> {
  const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  const { count, error } = await supabaseAdmin
    .from("anonymous_tryons")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dayStart);
  if (error || count === null) throw new Error("Could not check the free try-on allowance.");
  return count;
}

async function sha256HexServer(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The address the edge network saw. The forwarded-for header is only a last
// resort because its first entry is whatever the caller chose to send.
function getClientIPServer(): string {
  const h = getRequest()?.headers;
  if (!h) return "unknown";
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown"
  );
}

// Stored so one connection cannot mint unlimited free sets. Mixed with a
// server-only secret, so the stored value cannot be turned back into an
// address by trying every address in turn.
async function hashedClientIp(): Promise<string> {
  const secret = process.env.ANON_IP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return sha256HexServer(`${secret}:${getClientIPServer()}`);
}

export const getAnonymousTryOnStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string; fingerprintHash: string }) =>
    z.object({ deviceId: anonId, fingerprintHash: anonId }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const used = await countAnonymousTryOns(
      supabaseAdmin as any,
      data.deviceId,
      data.fingerprintHash,
    );
    const ipUsed = await countAnonymousTryOnsByIp(supabaseAdmin as any, await hashedClientIp());
    const deviceBlocked = used >= ANON_FREE_QUOTA;
    const networkBlocked =
      ipUsed >= ANON_IP_MONTHLY_CAP ||
      (await countAnonymousTryOnsToday(supabaseAdmin as any)) >= ANON_GLOBAL_DAILY_CAP;
    return {
      used: deviceBlocked || networkBlocked,
      reason: networkBlocked && !deviceBlocked ? ("network" as const) : ("device" as const),
      usedCount: Math.min(used, ANON_FREE_QUOTA),
      limit: ANON_FREE_QUOTA,
      remaining: networkBlocked ? 0 : Math.max(0, ANON_FREE_QUOTA - used),
    };
  });

export const generateAnonymousTryOn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      deviceId: string;
      fingerprintHash: string;
      userPhotoBase64: string;
      userPhotoMimeType: string;
      wigId: string;
      wigImageUrl?: string;
      wigImageUrls?: string[];

      wigName?: string;
      wigStyleType?: string;
      wigColour?: string;
    }) =>
      z
        .object({
          deviceId: anonId,
          fingerprintHash: anonId,
          userPhotoBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
          userPhotoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          wigId: z.string().uuid(),
          // Sent by older pages; ignored. Product photos come from the catalogue.
          wigImageUrl: z.string().max(2048).optional(),
          wigImageUrls: z.array(z.string().max(2048)).max(4).optional(),

          wigName: z.string().max(300).optional(),
          wigStyleType: z.string().max(300).optional(),
          wigColour: z.string().max(300).optional(),
        })
        .parse(d),
  )
  .handler(
    safeGeneration("anonymous", async ({ data }) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as any;
      const selfie = checkedSelfie(data.userPhotoBase64);

      // 1. Refuse once this device/fingerprint has used its monthly free sets,
      //    once this network has hit the monthly abuse cap, or once the day's
      //    ceiling across all visitors is reached.
      const usedCount = await countAnonymousTryOns(admin, data.deviceId, data.fingerprintHash);
      if (usedCount >= ANON_FREE_QUOTA) {
        return { alreadyUsed: true as const, reason: "device" as const };
      }
      const ipHash = await hashedClientIp();
      if ((await countAnonymousTryOnsByIp(admin, ipHash)) >= ANON_IP_MONTHLY_CAP) {
        return { alreadyUsed: true as const, reason: "network" as const };
      }
      if ((await countAnonymousTryOnsToday(admin)) >= ANON_GLOBAL_DAILY_CAP) {
        return { alreadyUsed: true as const, reason: "network" as const };
      }

      // 2. Reserve the try-on BEFORE spending anything on generation. The unique
      //    index on (device_id, month_start, seq) makes two concurrent attempts
      //    from one device collide.
      const request = getRequest();
      const { data: reservation, error: reserveErr } = await admin
        .from("anonymous_tryons")
        .insert({
          device_id: data.deviceId,
          fingerprint_hash: data.fingerprintHash,
          ip_hash: ipHash,
          wig_id: data.wigId,
          result_path: ANON_PENDING_PATH,
          user_agent: request?.headers?.get("user-agent")?.slice(0, 300) ?? null,
          seq: usedCount + 1,
          ...utmFromCookieHeader(request?.headers?.get("cookie")),
        })
        .select("id")
        .single();
      if (reserveErr || !reservation) {
        // Race lost - treat as already used.
        return { alreadyUsed: true as const, reason: "device" as const };
      }
      const release = async () => {
        try {
          await admin.from("anonymous_tryons").delete().eq("id", reservation.id);
        } catch {
          /* best effort */
        }
      };

      try {
        // Requests racing in parallel all pass the checks above. Count again now
        // that this one is recorded, and back out if the caps were overshot.
        if (
          (await countAnonymousTryOns(admin, data.deviceId, data.fingerprintHash)) >
            ANON_FREE_QUOTA ||
          (await countAnonymousTryOnsByIp(admin, ipHash)) > ANON_IP_MONTHLY_CAP ||
          (await countAnonymousTryOnsToday(admin)) > ANON_GLOBAL_DAILY_CAP
        ) {
          await release();
          return { alreadyUsed: true as const, reason: "network" as const };
        }

        // 3. Fetch the product's own photographs as reference (published only).
        const wigImages = await resolveWigReferenceImages(admin, data.wigId, true);

        // 4. Generate all three angles in parallel and upload each to the anon
        //    folder in the `tryons` bucket via the service-role client.
        const settled = await Promise.allSettled(
          ALL_VIEWS.map(async (view) => {
            const generated = await callGeminiImageAPI({
              prompt: buildTryOnPrompt(view),
              userPhotoBase64: selfie.base64,
              userPhotoMimeType: selfie.mimeType,
              wigImages,
              models: modelsForView(view),
            });

            const bytes = decodeBase64Image(generated.imageBase64);
            const contentType = sniffImageMime(bytes);
            if (!contentType || bytes.length > MAX_IMAGE_BYTES) {
              throw new Error("The generated image could not be stored.");
            }
            const viewPath = `anon/${crypto.randomUUID()}.png`;
            const { error: upErr } = await supabaseAdmin.storage
              .from(TRYONS_BUCKET)
              .upload(viewPath, bytes, { contentType, upsert: false });
            if (upErr) throw upErr;
            return { view, viewPath, model: generated.model };
          }),
        );

        const viewPaths: Record<TryOnView, string | null> = { front: null, side: null, back: null };
        let model = "";
        for (const outcome of settled) {
          if (outcome.status !== "fulfilled") continue;
          viewPaths[outcome.value.view] = outcome.value.viewPath;
          if (outcome.value.view === "front") model = outcome.value.model;
        }
        if (!viewPaths.front) {
          // Do not leave side or back images behind for a try-on that failed.
          const orphans = Object.values(viewPaths).filter((p): p is string => !!p);
          if (orphans.length) await supabaseAdmin.storage.from(TRYONS_BUCKET).remove(orphans);
          const reason = settled.find((s) => s.status === "rejected") as
            | PromiseRejectedResult
            | undefined;
          throw new Error(
            reason?.reason instanceof Error ? reason.reason.message : "Try-on generation failed.",
          );
        }
        const path = viewPaths.front;

        // 5. Complete the reservation with every stored image, so the retention
        //    job can find and delete all of them.
        const extraPaths = [viewPaths.side, viewPaths.back].filter((p): p is string => !!p);
        const { error: finishErr } = await admin
          .from("anonymous_tryons")
          .update({ result_path: [path, ...extraPaths].join(",") })
          .eq("id", reservation.id);
        if (finishErr) throw finishErr;

        // 6. Analytics event (mirrors recordTryOn shape, source = "anon").
        const { data: wig } = await supabaseAdmin
          .from("wigs")
          .select("retailer_id")
          .eq("id", data.wigId)
          .maybeSingle();
        await supabaseAdmin.from("try_on_events").insert({
          user_id: null,
          wig_id: data.wigId,
          retailer_id: wig?.retailer_id ?? null,
          source: "anon",
        });

        // 7. Signed URLs for every angle that generated.
        const views: Record<TryOnView, string | null> = { front: null, side: null, back: null };
        for (const view of ALL_VIEWS) {
          const p = viewPaths[view];
          if (!p) continue;
          const { data: signed } = await supabaseAdmin.storage
            .from(TRYONS_BUCKET)
            .createSignedUrl(p, SIGNED_URL_TTL_SECONDS);
          views[view] = signed?.signedUrl ?? null;
        }
        if (!views.front) throw new Error("Could not sign the try-on result.");

        return {
          alreadyUsed: false as const,
          path,
          signedUrl: views.front,
          expiresIn: SIGNED_URL_TTL_SECONDS,
          model,
          views,
          remaining: Math.max(0, ANON_FREE_QUOTA - (usedCount + 1)),
        };
      } catch (err) {
        await release();
        throw err;
      }
    }),
  );
