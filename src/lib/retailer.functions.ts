import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `r-${Math.random().toString(36).slice(2, 8)}`;

export const getMyRetailerContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isRetailer = (roles ?? []).some((r) => r.role === "retailer");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const { data: retailer } = await supabase
      .from("retailers")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    return { isRetailer, isAdmin, retailer };
  });

const onboardingSchema = z.object({
  business_name: z.string().min(2).max(120),
  display_name: z.string().min(2).max(120),
  website: z.string().url().optional().or(z.literal("")),
  country: z.string().max(80).optional(),
  contact_name: z.string().max(120).optional(),
  currency: z.enum(["GBP", "USD", "EUR", "NGN", "ZAR", "CAD"]).default("GBP"),
  brand_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  referral_source: z.string().max(120).optional(),
});

export const saveRetailerOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof onboardingSchema>) => onboardingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure user has retailer role
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const hasRole = (existingRoles ?? []).some((r) => r.role === "retailer");
    if (!hasRole) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "retailer" });
    }

    const { data: existing } = await supabase
      .from("retailers")
      .select("id, slug")
      .eq("owner_id", userId)
      .maybeSingle();

    const payload = {
      owner_id: userId,
      business_name: data.business_name,
      display_name: data.display_name,
      website: data.website || null,
      country: data.country || null,
      contact_name: data.contact_name || null,
      currency: data.currency,
      brand_primary: data.brand_primary || "#3D1C02",
      referral_source: data.referral_source || null,
      onboarding_completed: true,
    };

    if (existing) {
      const { error } = await supabase
        .from("retailers")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      return { id: existing.id };
    }

    let slug = slugify(data.display_name);
    const { data: clash } = await supabase
      .from("retailers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error } = await supabase
      .from("retailers")
      .insert({ ...payload, slug })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

const updateRetailerSchema = z.object({
  display_name: z.string().min(2).optional(),
  business_name: z.string().min(2).optional(),
  website: z.string().url().nullable().optional(),
  country: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  currency: z.string().optional(),
  brand_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  widget_cta_text: z.string().max(60).optional(),
  logo_url: z.string().url().nullable().optional(),
});

export const updateRetailer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof updateRetailerSchema>) =>
    updateRetailerSchema.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("retailers")
      .update(data)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- Wigs ----------------

export const listMyWigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) return { wigs: [] };
    const { data, error } = await supabase
      .from("wigs")
      .select("*")
      .eq("retailer_id", retailer.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { wigs: data ?? [] };
  });

export const getMyWig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("owner_id", userId)
      .single();
    const { data: wig, error } = await supabase
      .from("wigs")
      .select("*")
      .eq("id", data.id)
      .eq("retailer_id", retailer!.id)
      .single();
    if (error) throw error;
    return { wig };
  });

const wigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  currency: z.string().length(3),
  style_type: z.string().min(1),
  hair_texture: z.string().min(1),
  hair_origin: z.string().optional(),
  hair_length: z.string().optional(),
  colors: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  product_url: z.string().url().optional().or(z.literal("")),
  in_stock: z.boolean().default(true),
  is_published: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const saveMyWig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof wigSchema>) => wigSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id, currency")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) throw new Error("Finish onboarding first.");

    const row = {
      retailer_id: retailer.id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency,
      style_type: data.style_type,
      hair_texture: data.hair_texture,
      hair_origin: data.hair_origin || null,
      hair_length: data.hair_length || null,
      colors: data.colors,
      images: data.images,
      product_url: data.product_url || null,
      in_stock: data.in_stock,
      is_published: data.is_published,
      is_featured: data.is_featured,
    };

    if (data.id) {
      const { error } = await supabase
        .from("wigs")
        .update(row)
        .eq("id", data.id)
        .eq("retailer_id", retailer.id);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await supabase
      .from("wigs")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteMyWig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("owner_id", userId)
      .single();
    const { error } = await supabase
      .from("wigs")
      .delete()
      .eq("id", data.id)
      .eq("retailer_id", retailer!.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- Metrics ----------------

export const getRetailerMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id, trial_ends_at, plan")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer)
      return { wigs: 0, tryOns30d: 0, clicks30d: 0, published: 0, retailer: null };

    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [wigs, published, tryOns, clicks] = await Promise.all([
      supabase.from("wigs").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id),
      supabase.from("wigs").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id).eq("is_published", true),
      supabase.from("try_on_events").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id).gte("created_at", since),
      supabase.from("wig_clicks").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id).gte("created_at", since),
    ]);

    return {
      retailer,
      wigs: wigs.count ?? 0,
      published: published.count ?? 0,
      tryOns30d: tryOns.count ?? 0,
      clicks30d: clicks.count ?? 0,
    };
  });
