import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_QUOTA = 5;

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
    const isPaid = stillValid && (subRow!.plan === "plus" || subRow!.plan === "pro");

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
      .select("plan, status")
      .eq("profile_id", userId)
      .eq("customer_type", "consumer")
      .in("status", ["active", "trialing"])
      .maybeSingle();
    const isPaid = !!subRow && (subRow.plan === "plus" || subRow.plan === "pro");

    return {
      isPaid,
      used: count,
      quota: FREE_QUOTA,
      remaining: isPaid ? null : Math.max(0, FREE_QUOTA - count),
    };
  });
