import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CLICK_TTL_DAYS,
  commissionFor,
  isAllowedRateBps,
  isClickToken,
  type SaleStatus,
} from "@/lib/commission";

const RETAILER_FIELDS =
  "id, owner_id, website, currency, commission_enabled, commission_rate_bps, commission_terms_accepted_at";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

async function myRetailer(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("retailers")
    .select(RETAILER_FIELDS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CommissionOverview {
  retailer: {
    id: string;
    website: string | null;
    currency: string;
    commission_enabled: boolean;
    commission_rate_bps: number;
    commission_terms_accepted_at: string | null;
  } | null;
  isAdmin: boolean;
  totals: {
    clicks30d: number;
    salesLogged: number;
    commissionOwed: number;
    commissionSettled: number;
  };
  sales: Array<{
    id: string;
    order_reference: string;
    sale_gbp: number;
    commission_gbp: number;
    commission_bps: number;
    status: string;
    sale_date: string;
    currency: string;
    notes: string | null;
    wig_name: string | null;
    click_token: string | null;
    created_at: string;
  }>;
  clicks: Array<{
    id: string;
    token: string;
    wig_name: string | null;
    created_at: string;
    expires_at: string;
  }>;
}

/** Everything the retailer's commission page shows. */
export const getMyCommission = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommissionOverview> => {
    const { supabase, userId } = context;
    const retailer = await myRetailer(supabase, userId);
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!retailer) {
      return {
        retailer: null,
        isAdmin: !!adminRow,
        totals: { clicks30d: 0, salesLogged: 0, commissionOwed: 0, commissionSettled: 0 },
        sales: [],
        clicks: [],
      };
    }

    const since = new Date(Date.now() - CLICK_TTL_DAYS * 86400000).toISOString();

    const [clicksRes, salesRes] = await Promise.all([
      supabase
        .from("affiliate_clicks")
        .select("id, token, created_at, expires_at, wigs(name)")
        .eq("retailer_id", retailer.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("affiliate_sales")
        .select(
          "id, order_reference, sale_gbp, commission_gbp, commission_bps, status, sale_date, currency, notes, created_at, wig_id, click_id, wigs(name), affiliate_clicks(token)",
        )
        .eq("retailer_id", retailer.id)
        .order("sale_date", { ascending: false })
        .limit(100),
    ]);
    if (clicksRes.error) throw clicksRes.error;
    if (salesRes.error) throw salesRes.error;

    const sales = (salesRes.data ?? []).map((s: any) => ({
      id: s.id,
      order_reference: s.order_reference,
      sale_gbp: Number(s.sale_gbp),
      commission_gbp: Number(s.commission_gbp),
      commission_bps: s.commission_bps,
      status: s.status,
      sale_date: s.sale_date,
      currency: s.currency,
      notes: s.notes ?? null,
      wig_name: s.wigs?.name ?? null,
      click_token: s.affiliate_clicks?.token ?? null,
      created_at: s.created_at,
    }));

    return {
      retailer: {
        id: retailer.id,
        website: retailer.website ?? null,
        currency: retailer.currency ?? "GBP",
        commission_enabled: !!retailer.commission_enabled,
        commission_rate_bps: retailer.commission_rate_bps ?? 0,
        commission_terms_accepted_at: retailer.commission_terms_accepted_at ?? null,
      },
      isAdmin: !!adminRow,
      totals: {
        clicks30d: (clicksRes.data ?? []).length,
        salesLogged: sales.length,
        commissionOwed: sales
          .filter((s) => s.status === "pending" || s.status === "confirmed")
          .reduce((sum, s) => sum + s.commission_gbp, 0),
        commissionSettled: sales
          .filter((s) => s.status === "settled")
          .reduce((sum, s) => sum + s.commission_gbp, 0),
      },
      sales,
      clicks: (clicksRes.data ?? []).map((c: any) => ({
        id: c.id,
        token: c.token,
        wig_name: c.wigs?.name ?? null,
        created_at: c.created_at,
        expires_at: c.expires_at,
      })),
    };
  });

/** Turn commission on or off and set the rate the retailer agrees to pay. */
export const saveCommissionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean; rateBps: number; acceptTerms: boolean }) =>
    z
      .object({
        enabled: z.boolean(),
        rateBps: z.number().int().min(0).max(2500),
        acceptTerms: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const retailer = await myRetailer(supabase, userId);
    if (!retailer) return { error: "No retailer account found." };

    if (data.enabled) {
      if (!isAllowedRateBps(data.rateBps)) {
        return { error: "Choose a commission rate between 8% and 15%." };
      }
      if (!retailer.website) {
        return { error: "Add your shop's website in Settings before turning commission on." };
      }
      const alreadyAccepted = !!retailer.commission_terms_accepted_at;
      if (!data.acceptTerms && !alreadyAccepted) {
        return { error: "Tick the commission agreement to turn it on." };
      }
    }

    const { error } = await supabase
      .from("retailers")
      .update({
        commission_enabled: data.enabled,
        commission_rate_bps: data.enabled ? data.rateBps : 0,
        ...(data.enabled && data.acceptTerms && !retailer.commission_terms_accepted_at
          ? { commission_terms_accepted_at: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", retailer.id);
    if (error) return { error: error.message };
    return { ok: true };
  });

/** Record an order that came from a tracked Wigsmi visit. */
export const logCommissionSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orderReference: string;
      saleGbp: number;
      wigId?: string;
      clickToken?: string;
      saleDate?: string;
      notes?: string;
    }) =>
      z
        .object({
          orderReference: z.string().trim().min(1).max(120),
          saleGbp: z.number().positive().max(1000000),
          wigId: z.string().uuid().optional(),
          clickToken: z.string().trim().max(64).optional(),
          saleDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          notes: z.string().max(500).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const retailer = await myRetailer(supabase, userId);
    if (!retailer) return { error: "No retailer account found." };
    if (!retailer.commission_enabled || !retailer.commission_terms_accepted_at) {
      return { error: "Turn commission on first." };
    }
    const rateBps = retailer.commission_rate_bps ?? 0;
    if (!isAllowedRateBps(rateBps)) return { error: "Set a commission rate between 8% and 15%." };

    if (data.wigId) {
      const { data: wig } = await supabase
        .from("wigs")
        .select("id")
        .eq("id", data.wigId)
        .eq("retailer_id", retailer.id)
        .maybeSingle();
      if (!wig) return { error: "That wig is not in your catalogue." };
    }

    let clickId: string | null = null;
    if (data.clickToken) {
      if (!isClickToken(data.clickToken)) {
        return { error: "That Wigsmi reference code is not valid." };
      }
      const { data: click } = await supabase
        .from("affiliate_clicks")
        .select("id")
        .eq("token", data.clickToken)
        .eq("retailer_id", retailer.id)
        .maybeSingle();
      if (!click) return { error: "No tracked visit found for that reference code." };
      clickId = click.id;
    }

    const { error } = await supabase.from("affiliate_sales").insert({
      retailer_id: retailer.id,
      wig_id: data.wigId ?? null,
      click_id: clickId,
      order_reference: data.orderReference,
      sale_gbp: data.saleGbp,
      commission_bps: rateBps,
      commission_gbp: commissionFor(data.saleGbp, rateBps),
      currency: retailer.currency ?? "GBP",
      status: "pending",
      sale_date: data.saleDate ?? new Date().toISOString().slice(0, 10),
      notes: data.notes ?? null,
      created_by: userId,
    });
    if (error?.code === "23505") {
      return { error: "That order reference is already logged." };
    }
    if (error) return { error: error.message };
    return { ok: true };
  });

/**
 * Move a logged sale along. Retailers can confirm or void their own entries;
 * only Wigsmi staff can mark one settled.
 */
export const setCommissionSaleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { saleId: string; status: SaleStatus }) =>
    z
      .object({
        saleId: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "settled", "void"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;

    if (data.status === "settled") {
      await assertAdmin(supabase, userId);
    } else {
      const retailer = await myRetailer(supabase, userId);
      if (!retailer) return { error: "No retailer account found." };
      const { data: sale } = await supabase
        .from("affiliate_sales")
        .select("id, status")
        .eq("id", data.saleId)
        .eq("retailer_id", retailer.id)
        .maybeSingle();
      if (!sale) return { error: "That sale is not yours." };
      if (sale.status === "settled") {
        return { error: "A settled sale can't be changed. Ask Wigsmi to reopen it." };
      }
    }

    const { error } = await supabase
      .from("affiliate_sales")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.saleId);
    if (error) return { error: error.message };
    return { ok: true };
  });

/** Wigsmi-side view: every retailer's logged sales, for reconciliation. */
export const listAllCommissionSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data, error } = await supabase
      .from("affiliate_sales")
      .select(
        "id, retailer_id, order_reference, sale_gbp, commission_gbp, commission_bps, status, sale_date, currency, notes, created_at, wigs(name), retailers(display_name, business_name)",
      )
      .order("sale_date", { ascending: false })
      .limit(500);
    if (error) throw error;

    const rows = (data ?? []).map((s: any) => ({
      id: s.id,
      retailer_id: s.retailer_id,
      retailer_name: s.retailers?.display_name ?? s.retailers?.business_name ?? "Unknown",
      order_reference: s.order_reference,
      sale_gbp: Number(s.sale_gbp),
      commission_gbp: Number(s.commission_gbp),
      commission_bps: s.commission_bps,
      status: s.status,
      sale_date: s.sale_date,
      currency: s.currency,
      notes: s.notes ?? null,
      wig_name: s.wigs?.name ?? null,
    }));

    const owed = rows
      .filter((r) => r.status === "pending" || r.status === "confirmed")
      .reduce((sum, r) => sum + r.commission_gbp, 0);
    const settled = rows
      .filter((r) => r.status === "settled")
      .reduce((sum, r) => sum + r.commission_gbp, 0);

    return { rows, totals: { owed, settled, count: rows.length } };
  });
