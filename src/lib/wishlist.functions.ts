import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wishlist_items")
      .select(
        `wig_id, created_at,
         wigs ( id, name, price, currency, style_type, hair_texture, hair_length,
                hair_origin, colors, images, is_featured, in_stock, try_on_count,
                product_url, created_at, retailer_id, ar_asset_url, description, is_published,
                retailers ( display_name ) )`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { items: data ?? [] };
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { wigId: string }) =>
    z.object({ wigId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("wishlist_items")
      .select("wig_id")
      .eq("user_id", userId)
      .eq("wig_id", data.wigId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", userId)
        .eq("wig_id", data.wigId);
      if (error) throw error;
      return { saved: false };
    }

    const { error } = await supabase
      .from("wishlist_items")
      .insert({ user_id: userId, wig_id: data.wigId });
    if (error) throw error;
    return { saved: true };
  });

export const getWishlistIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("wig_id")
      .eq("user_id", userId);
    if (error) throw error;
    return { ids: (data ?? []).map((r) => r.wig_id) };
  });
