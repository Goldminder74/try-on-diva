import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getOwnedRetailerId(supabase: any, userId: string): Promise<string> {
  const { data: retailer } = await supabase
    .from("retailers")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!retailer) throw new Error("Finish onboarding first.");
  return retailer.id as string;
}

export const listMyApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const retailerId = await getOwnedRetailerId(supabase, userId);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, last4, created_at, last_used_at, revoked_at")
      .eq("retailer_id", retailerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { keys: data ?? [] };
  });

export const createMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string }) =>
    z.object({ name: z.string().min(1).max(40).default("Default") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const retailerId = await getOwnedRetailerId(supabase, userId);

    // Generate a 32-byte url-safe random key, prefixed for recognisability.
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const body = Array.from(raw)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const plain = `wsk_live_${body}`;
    const hash = await sha256Hex(plain);
    const last4 = plain.slice(-4);

    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        retailer_id: retailerId,
        name: data.name,
        key_hash: hash,
        last4,
      })
      .select("id, name, last4, created_at")
      .single();
    if (error) throw error;

    // Return the plain key ONLY here. We never store or re-display it.
    return { key: row, plain };
  });

export const revokeMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const retailerId = await getOwnedRetailerId(supabase, userId);
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("retailer_id", retailerId);
    if (error) throw error;
    return { ok: true };
  });
