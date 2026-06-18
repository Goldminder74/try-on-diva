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
  legal_business_name: z.string().min(2).max(200),
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
      legal_business_name: data.legal_business_name,
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

const PLAN_WIG_CAPS: Record<string, number> = {
  starter: 30,
  growth: 150,
  scale: Number.POSITIVE_INFINITY,
};

async function getRetailerEntitlement(
  supabase: any,
  userId: string,
): Promise<{ retailerId: string; effectivePlan: string; cap: number; trialActive: boolean; hasPaidSub: boolean }> {
  const { data: retailer } = await supabase
    .from("retailers")
    .select("id, plan, trial_ends_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!retailer) throw new Error("Finish onboarding first.");

  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .eq("customer_type", "retailer")
    .order("created_at", { ascending: false })
    .limit(1);
  const sub = subRows?.[0];
  const subValid =
    !!sub &&
    ((["active", "trialing", "past_due"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date())) ||
      (sub.status === "canceled" &&
        sub.current_period_end &&
        new Date(sub.current_period_end) > new Date()));
  const hasPaidSub = !!subValid && (sub!.plan === "starter" || sub!.plan === "growth" || sub!.plan === "scale");
  const trialActive =
    !!retailer.trial_ends_at && new Date(retailer.trial_ends_at) > new Date();
  const effectivePlan = hasPaidSub ? sub!.plan : trialActive ? "starter" : "expired";
  const cap = PLAN_WIG_CAPS[effectivePlan] ?? 0;
  return { retailerId: retailer.id, effectivePlan, cap, trialActive, hasPaidSub };
}

export const getMyEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const ent = await getRetailerEntitlement(supabase, userId);
      const { count } = await supabase
        .from("wigs")
        .select("id", { count: "exact", head: true })
        .eq("retailer_id", ent.retailerId);
      return {
        plan: ent.effectivePlan,
        cap: Number.isFinite(ent.cap) ? ent.cap : null,
        used: count ?? 0,
        trialActive: ent.trialActive,
        hasPaidSub: ent.hasPaidSub,
      };
    } catch {
      return { plan: "none", cap: 0, used: 0, trialActive: false, hasPaidSub: false };
    }
  });

export const saveMyWig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof wigSchema>) => wigSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ent = await getRetailerEntitlement(supabase, userId);

    if (ent.effectivePlan === "expired") {
      throw new Error("Your trial has ended. Upgrade to a paid plan to manage your catalog.");
    }

    // For new wigs, enforce the cap.
    if (!data.id) {
      const { count } = await supabase
        .from("wigs")
        .select("id", { count: "exact", head: true })
        .eq("retailer_id", ent.retailerId);
      if ((count ?? 0) >= ent.cap) {
        throw new Error(
          `You've reached the ${ent.effectivePlan} plan limit of ${ent.cap} wigs. Upgrade to add more.`,
        );
      }
    }

    const row = {
      retailer_id: ent.retailerId,
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
        .eq("retailer_id", ent.retailerId);
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

// ---------------- Activation ----------------

export const getActivationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id, onboarding_completed")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) {
      return {
        profileDone: false,
        hasWig: false,
        hasPublished: false,
        hasWidget: false,
        hasFirstTryOn: false,
      };
    }
    const [wigs, published, widget, tryOn] = await Promise.all([
      supabase.from("wigs").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id),
      supabase.from("wigs").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id).eq("is_published", true),
      supabase.from("widget_embeds").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id),
      supabase.from("try_on_events").select("id", { count: "exact", head: true }).eq("retailer_id", retailer.id),
    ]);
    return {
      profileDone: !!retailer.onboarding_completed,
      hasWig: (wigs.count ?? 0) > 0,
      hasPublished: (published.count ?? 0) > 0,
      hasWidget: (widget.count ?? 0) > 0,
      hasFirstTryOn: (tryOn.count ?? 0) > 0,
    };
  });

// ---------------- Widget ----------------

export const getMyWidget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id, brand_primary, widget_cta_text, display_name")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) return { widget: null, retailer: null };
    const { data: widget } = await supabase
      .from("widget_embeds")
      .select("*")
      .eq("retailer_id", retailer.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return { widget, retailer };
  });

export const createMyWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id, brand_primary")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) throw new Error("Finish onboarding first.");
    const { data: existing } = await supabase
      .from("widget_embeds")
      .select("id")
      .eq("retailer_id", retailer.id)
      .maybeSingle();
    if (existing) return { id: existing.id };
    const { data, error } = await supabase
      .from("widget_embeds")
      .insert({
        retailer_id: retailer.id,
        widget_type: "full",
        is_active: true,
        allowed_domains: [],
        config: { accent_color: retailer.brand_primary || "#3D1C02" },
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  });

const widgetUpdateSchema = z.object({
  widget_type: z.enum(["full", "button"]).optional(),
  is_active: z.boolean().optional(),
  allowed_domains: z.array(z.string().min(1).max(253)).max(20).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  cta_text: z.string().min(1).max(60).optional(),
});

export const updateMyWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof widgetUpdateSchema>) => widgetUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) throw new Error("No retailer found.");
    const { data: widget } = await supabase
      .from("widget_embeds")
      .select("id, config")
      .eq("retailer_id", retailer.id)
      .maybeSingle();
    if (!widget) throw new Error("No widget found. Create one first.");

    const patch: Record<string, unknown> = {};
    if (data.widget_type !== undefined) patch.widget_type = data.widget_type;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.allowed_domains !== undefined) {
      patch.allowed_domains = data.allowed_domains.map((d) =>
        d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
      );
    }
    if (data.accent_color !== undefined) {
      const cfg = (widget.config as Record<string, unknown>) || {};
      patch.config = { ...cfg, accent_color: data.accent_color };
    }

    const { error } = await supabase
      .from("widget_embeds")
      .update(patch as never)
      .eq("id", widget.id);
    if (error) throw error;

    if (data.cta_text !== undefined) {
      await supabase
        .from("retailers")
        .update({ widget_cta_text: data.cta_text })
        .eq("id", retailer.id);
    }
    return { ok: true };
  });

export const rotateMyWidgetToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!retailer) throw new Error("No retailer found.");
    // Generate a new uuid client-side; uuid v4 via crypto.
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from("widget_embeds")
      .update({ embed_token: newToken })
      .eq("retailer_id", retailer.id);
    if (error) throw error;
    return { embed_token: newToken };
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
