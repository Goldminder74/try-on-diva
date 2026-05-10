import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId };
  });

// ---------- Overview ----------

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [retailers, consumers, wigs, tryOns, clicks, subs] = await Promise.all([
      supabaseAdmin.from("retailers").select("id, is_active, trial_ends_at, plan, created_at"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("wigs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("try_on_events").select("created_at").gte("created_at", since30),
      supabaseAdmin.from("wig_clicks").select("id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("subscriptions").select("plan, status, billing_interval, current_period_end").in("status", ["active", "trialing"]),
    ]);

    const retailerRows = retailers.data ?? [];
    const now = Date.now();
    const activeRetailers = retailerRows.filter(
      (r: any) => r.is_active && (new Date(r.trial_ends_at || 0).getTime() > now || r.plan !== "starter"),
    ).length;

    // MRR — convert yearly to monthly equivalent.
    const planMonthly: Record<string, number> = { growth: 149, scale: 399, enterprise: 999 };
    let mrr = 0;
    for (const s of subs.data ?? []) {
      const base = planMonthly[s.plan as string] ?? 0;
      mrr += s.billing_interval === "year" ? base * 0.65 : base; // yearly discounted ~35%
    }

    // Daily buckets for try-ons over last 30 days
    const buckets = new Map<string, number>();
    for (const e of tryOns.data ?? []) {
      const d = e.created_at.slice(0, 10);
      buckets.set(d, (buckets.get(d) ?? 0) + 1);
    }
    const timeseries: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      timeseries.push({ date: d, count: buckets.get(d) ?? 0 });
    }

    return {
      totalRetailers: retailerRows.length,
      activeRetailers,
      totalConsumers: consumers.count ?? 0,
      totalWigs: wigs.count ?? 0,
      tryOns30d: tryOns.data?.length ?? 0,
      clicks30d: clicks.count ?? 0,
      mrr: Math.round(mrr),
      timeseries,
    };
  });

export const getRecentSignups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [retailers, consumers] = await Promise.all([
      supabaseAdmin.from("retailers").select("id, business_name, slug, country, created_at").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, email, country, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return { retailers: retailers.data ?? [], consumers: consumers.data ?? [] };
  });

// ---------- Retailers ----------

export const listRetailers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("retailers")
      .select("id, business_name, slug, country, plan, trial_ends_at, is_active, created_at, owner_id")
      .order("created_at", { ascending: false });
    if (data.search) q = q.ilike("business_name", `%${data.search}%`);
    const { data: rows } = await q;
    if (!rows?.length) return [];

    // Wig counts + 30d try-on counts
    const ids = rows.map((r: any) => r.id);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [wigsAgg, tryAgg] = await Promise.all([
      supabaseAdmin.from("wigs").select("retailer_id").in("retailer_id", ids),
      supabaseAdmin.from("try_on_events").select("retailer_id").in("retailer_id", ids).gte("created_at", since),
    ]);
    const wigCount = new Map<string, number>();
    for (const w of wigsAgg.data ?? []) wigCount.set(w.retailer_id, (wigCount.get(w.retailer_id) ?? 0) + 1);
    const tryCount = new Map<string, number>();
    for (const t of tryAgg.data ?? []) tryCount.set(t.retailer_id, (tryCount.get(t.retailer_id) ?? 0) + 1);

    return rows.map((r: any) => ({
      ...r,
      wig_count: wigCount.get(r.id) ?? 0,
      try_ons_30d: tryCount.get(r.id) ?? 0,
    }));
  });

export const setRetailerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("retailers").update({ is_active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const extendRetailerTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; days: number }) => z.object({ id: z.string().uuid(), days: z.number().int().min(1).max(365) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: r } = await supabaseAdmin.from("retailers").select("trial_ends_at").eq("id", data.id).maybeSingle();
    const base = r?.trial_ends_at ? new Date(r.trial_ends_at) : new Date();
    const next = new Date(Math.max(base.getTime(), Date.now()) + data.days * 86400000).toISOString();
    const { error } = await supabaseAdmin.from("retailers").update({ trial_ends_at: next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { trial_ends_at: next };
  });

// ---------- Consumers ----------

export const listConsumers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, country, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) q = q.ilike("email", `%${data.search}%`);
    const { data: profiles } = await q;
    if (!profiles?.length) return [];
    const ids = profiles.map((p: any) => p.id);

    const [cps, wishes] = await Promise.all([
      supabaseAdmin.from("consumer_profiles").select("user_id, try_on_count_this_month, quiz_completed_at").in("user_id", ids),
      supabaseAdmin.from("wishlist_items").select("user_id").in("user_id", ids),
    ]);
    const cpMap = new Map<string, any>();
    for (const c of cps.data ?? []) cpMap.set(c.user_id, c);
    const wishCount = new Map<string, number>();
    for (const w of wishes.data ?? []) wishCount.set(w.user_id, (wishCount.get(w.user_id) ?? 0) + 1);

    return profiles.map((p: any) => ({
      ...p,
      try_ons_month: cpMap.get(p.id)?.try_on_count_this_month ?? 0,
      quiz_completed: !!cpMap.get(p.id)?.quiz_completed_at,
      wishlist_count: wishCount.get(p.id) ?? 0,
    }));
  });

// ---------- Catalog ----------

const catalogFilters = z.object({
  retailerId: z.string().uuid().optional(),
  style: z.string().optional(),
  texture: z.string().optional(),
  published: z.enum(["any", "yes", "no"]).default("any"),
  featured: z.enum(["any", "yes", "no"]).default("any"),
  page: z.number().int().min(1).default(1),
});

export const listAdminCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof catalogFilters>) => catalogFilters.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const pageSize = 60;
    let q = supabaseAdmin
      .from("wigs")
      .select("id, name, retailer_id, images, price, currency, style_type, hair_texture, is_published, is_featured, featured_rank, in_stock, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((data.page - 1) * pageSize, data.page * pageSize - 1);

    if (data.retailerId) q = q.eq("retailer_id", data.retailerId);
    if (data.style) q = q.eq("style_type", data.style);
    if (data.texture) q = q.eq("hair_texture", data.texture);
    if (data.published !== "any") q = q.eq("is_published", data.published === "yes");
    if (data.featured !== "any") q = q.eq("is_featured", data.featured === "yes");

    const { data: wigs, count } = await q;
    if (!wigs?.length) return { wigs: [], retailers: [], total: 0 };

    const retailerIds = Array.from(new Set(wigs.map((w: any) => w.retailer_id)));
    const { data: retailers } = await supabaseAdmin
      .from("retailers")
      .select("id, business_name, slug")
      .in("id", retailerIds);

    return { wigs, retailers: retailers ?? [], total: count ?? 0 };
  });

export const setWigPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; published: boolean }) => z.object({ id: z.string().uuid(), published: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("wigs").update({ is_published: data.published }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("wigs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Featured ----------

export const getFeaturedWigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("wigs")
      .select("id, name, images, retailer_id, featured_rank")
      .eq("is_featured", true)
      .order("featured_rank", { ascending: true });
    const retailerIds = Array.from(new Set((data ?? []).map((w: any) => w.retailer_id)));
    const { data: retailers } = retailerIds.length
      ? await supabaseAdmin.from("retailers").select("id, business_name").in("id", retailerIds)
      : { data: [] as any[] };
    return { wigs: data ?? [], retailers: retailers ?? [] };
  });

export const setFeaturedWigs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => z.object({ ids: z.array(z.string().uuid()).max(5) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    // Clear old featured set
    await supabaseAdmin.from("wigs").update({ is_featured: false, featured_rank: null }).eq("is_featured", true);
    // Re-mark in order
    for (let i = 0; i < data.ids.length; i++) {
      await supabaseAdmin.from("wigs").update({ is_featured: true, featured_rank: i + 1 }).eq("id", data.ids[i]);
    }
    return { ok: true };
  });

export const searchPublishedWigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("wigs")
      .select("id, name, images, retailer_id")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows } = await q;
    return rows ?? [];
  });
