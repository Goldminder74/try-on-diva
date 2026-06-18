import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
      .select("id, slug, display_name, brand_primary, widget_cta_text, logo_url, currency")
      .eq("id", widget.retailer_id)
      .maybeSingle();

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
            display_name: retailer.display_name,
            cta_text: retailer.widget_cta_text || "Try it on",
            logo_url: retailer.logo_url,
            currency: retailer.currency,
          }
        : null,
      wigs: wigs ?? [],
    };
  });
