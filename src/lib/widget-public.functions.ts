import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Monthly widget API call caps per plan tier. Scale = unlimited.
const WIDGET_CALL_CAPS: Record<string, number> = {
  starter: 5_000,
  growth: 50_000,
  scale: Number.POSITIVE_INFINITY,
};

export const getPublicWidgetData = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: widget } = await supabaseAdmin
      .from("widget_embeds")
      .select("id, retailer_id, widget_type, is_active, config, allowed_domains")
      .eq("embed_token", data.token)
      .maybeSingle();

    if (!widget) return { notFound: true as const };
    if (!widget.is_active) return { paused: true as const };

    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id, slug, display_name, brand_primary, widget_cta_text, logo_url, currency, plan, widget_calls_this_month, widget_calls_month_reset")
      .eq("id", widget.retailer_id)
      .maybeSingle();

    if (!retailer) return { notFound: true as const };

    // Roll the monthly counter forward if the stored reset date is older
    // than the current month boundary.
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const storedReset = (retailer as any).widget_calls_month_reset as string | null;
    let calls = ((retailer as any).widget_calls_this_month as number | null) ?? 0;
    if (!storedReset || storedReset < monthStart) {
      calls = 0;
      await supabaseAdmin
        .from("retailers")
        .update({
          widget_calls_this_month: 0,
          widget_calls_month_reset: monthStart,
        } as never)
        .eq("id", retailer.id);
    }

    const planId = ((retailer as any).plan as string) ?? "starter";
    const cap = WIDGET_CALL_CAPS[planId] ?? WIDGET_CALL_CAPS.starter;
    if (Number.isFinite(cap) && calls >= cap) {
      return { rateLimited: true as const, cap };
    }

    // Increment counter (fire-and-forget — we don't want a counter race to
    // block a legitimate impression).
    await supabaseAdmin
      .from("retailers")
      .update({ widget_calls_this_month: calls + 1 } as never)
      .eq("id", retailer.id);

    const { data: wigs } = await supabaseAdmin
      .from("wigs")
      .select("id, name, price, currency, images, product_url")
      .eq("retailer_id", widget.retailer_id)
      .eq("is_published", true)
      .eq("in_stock", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);

    return {
      ok: true as const,
      widget: {
        widget_type: widget.widget_type,
        accent_color:
          (widget.config as { accent_color?: string } | null)?.accent_color ||
          retailer?.brand_primary ||
          "#3D1C02",
      },
      retailer: retailer
        ? {
            id: retailer.id,
            slug: retailer.slug,
            display_name: retailer.display_name,
            cta_text: retailer.widget_cta_text || "Try it on",
            logo_url: retailer.logo_url,
            brand_primary: retailer.brand_primary,
            currency: retailer.currency,
          }
        : null,
      wigs: wigs ?? [],
    };
  });
