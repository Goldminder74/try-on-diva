import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Plan-gated history (in days). null = unlimited.
const PLAN_HISTORY_DAYS: Record<string, number | null> = {
  starter: 30,
  growth: 90,
  scale: null,
  enterprise: null,
};

const rangeSchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

type Range = z.infer<typeof rangeSchema>["range"];

function rangeToDays(range: Range): number | null {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return null;
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function loadRetailerForUser(supabase: any, userId: string) {
  const { data: retailer } = await supabase
    .from("retailers")
    .select("id, plan, trial_ends_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!retailer) throw new Error("No retailer found. Finish onboarding first.");

  // Effective plan mirrors retailer.functions: paid sub overrides plan field; trial = starter.
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
  const trialActive =
    !!retailer.trial_ends_at && new Date(retailer.trial_ends_at) > new Date();
  const effectivePlan = subValid
    ? sub!.plan
    : trialActive
      ? "starter"
      : retailer.plan || "starter";

  return { retailerId: retailer.id, effectivePlan };
}

export const getRetailerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: Range }) => rangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { retailerId, effectivePlan } = await loadRetailerForUser(supabase, userId);

    const planLimitDays = PLAN_HISTORY_DAYS[effectivePlan] ?? 30;
    const canExport = effectivePlan === "growth" || effectivePlan === "scale" || effectivePlan === "enterprise";
    const canSeeGeography = effectivePlan === "scale" || effectivePlan === "enterprise";

    // Clamp requested range to plan window.
    let days = rangeToDays(data.range);
    if (planLimitDays !== null) {
      days = days === null ? planLimitDays : Math.min(days, planLimitDays);
    }

    const now = new Date();
    const since = days === null ? new Date(0) : new Date(now.getTime() - days * 86400_000);
    const prevSince =
      days === null ? null : new Date(since.getTime() - days * 86400_000);

    // Fetch try-on events for current + previous periods in one query when bounded.
    const tryOnSel = supabase
      .from("try_on_events")
      .select("id, wig_id, user_id, anonymous_session, device, source, country, created_at")
      .eq("retailer_id", retailerId)
      .gte("created_at", (prevSince ?? since).toISOString())
      .order("created_at", { ascending: true })
      .limit(50000);
    const clicksSel = supabase
      .from("wig_clicks")
      .select("id, wig_id, user_id, created_at")
      .eq("retailer_id", retailerId)
      .gte("created_at", (prevSince ?? since).toISOString())
      .limit(50000);

    const [{ data: tryOns }, { data: clicks }] = await Promise.all([tryOnSel, clicksSel]);

    const tryOnsArr = tryOns ?? [];
    const clicksArr = clicks ?? [];

    const inCurrent = (iso: string) => new Date(iso) >= since;
    const inPrev = (iso: string) =>
      prevSince !== null && new Date(iso) >= prevSince && new Date(iso) < since;

    const curTryOns = tryOnsArr.filter((r) => inCurrent(r.created_at));
    const prevTryOns = tryOnsArr.filter((r) => inPrev(r.created_at));
    const curClicks = clicksArr.filter((r) => inCurrent(r.created_at));
    const prevClicks = clicksArr.filter((r) => inPrev(r.created_at));

    const uniq = (rows: typeof curTryOns) =>
      new Set(rows.map((r) => r.user_id || r.anonymous_session || r.id)).size;

    const kpis = {
      tryOns: { value: curTryOns.length, prev: prevTryOns.length },
      uniqueVisitors: { value: uniq(curTryOns), prev: uniq(prevTryOns) },
      clicks: { value: curClicks.length, prev: prevClicks.length },
      ctr: {
        value: curTryOns.length ? curClicks.length / curTryOns.length : 0,
        prev: prevTryOns.length ? prevClicks.length / prevTryOns.length : 0,
      },
    };

    // Timeseries: daily buckets in the current window.
    const bucketDays =
      days === null
        ? Math.max(
            1,
            Math.ceil(
              (now.getTime() -
                (curTryOns[0]
                  ? new Date(curTryOns[0].created_at).getTime()
                  : now.getTime())) /
                86400_000,
            ),
          )
        : days;
    const start = startOfDayUTC(
      days === null
        ? new Date(now.getTime() - bucketDays * 86400_000)
        : new Date(now.getTime() - days * 86400_000),
    );
    const buckets: { date: string; tryOns: number; clicks: number }[] = [];
    for (let i = 0; i < bucketDays + 1; i++) {
      const d = new Date(start.getTime() + i * 86400_000);
      buckets.push({ date: d.toISOString().slice(0, 10), tryOns: 0, clicks: 0 });
    }
    const idxFor = (iso: string) => {
      const d = startOfDayUTC(new Date(iso));
      const i = Math.round((d.getTime() - start.getTime()) / 86400_000);
      return i >= 0 && i < buckets.length ? i : -1;
    };
    for (const r of curTryOns) {
      const i = idxFor(r.created_at);
      if (i >= 0) buckets[i].tryOns += 1;
    }
    for (const r of curClicks) {
      const i = idxFor(r.created_at);
      if (i >= 0) buckets[i].clicks += 1;
    }

    // Top wigs.
    const wigCounts = new Map<string, { tryOns: number; clicks: number }>();
    for (const r of curTryOns) {
      const c = wigCounts.get(r.wig_id) ?? { tryOns: 0, clicks: 0 };
      c.tryOns += 1;
      wigCounts.set(r.wig_id, c);
    }
    for (const r of curClicks) {
      const c = wigCounts.get(r.wig_id) ?? { tryOns: 0, clicks: 0 };
      c.clicks += 1;
      wigCounts.set(r.wig_id, c);
    }
    const topWigIds = [...wigCounts.entries()]
      .sort((a, b) => b[1].tryOns - a[1].tryOns)
      .slice(0, 10)
      .map(([id]) => id);
    let topWigs: {
      id: string;
      name: string;
      image: string | null;
      tryOns: number;
      clicks: number;
      ctr: number;
    }[] = [];
    if (topWigIds.length) {
      const { data: wigRows } = await supabase
        .from("wigs")
        .select("id, name, images")
        .in("id", topWigIds);
      const byId = new Map((wigRows ?? []).map((w) => [w.id, w]));
      topWigs = topWigIds.map((id) => {
        const w = byId.get(id);
        const c = wigCounts.get(id)!;
        return {
          id,
          name: w?.name ?? "Removed wig",
          image: (w?.images?.[0] as string | undefined) ?? null,
          tryOns: c.tryOns,
          clicks: c.clicks,
          ctr: c.tryOns ? c.clicks / c.tryOns : 0,
        };
      });
    }

    const tally = (rows: typeof curTryOns, key: "device" | "source" | "country") => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = (r[key] || "unknown") as string;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    };

    return {
      effectivePlan,
      planLimitDays,
      canExport,
      canSeeGeography,
      windowDays: days,
      kpis,
      timeseries: buckets,
      topWigs,
      deviceBreakdown: tally(curTryOns, "device"),
      sourceBreakdown: tally(curTryOns, "source"),
      geography: canSeeGeography ? tally(curTryOns, "country").slice(0, 20) : [],
      hasAnyEvents: tryOnsArr.length > 0 || clicksArr.length > 0,
    };
  });

export const exportRetailerAnalyticsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: Range }) => rangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { retailerId, effectivePlan } = await loadRetailerForUser(supabase, userId);
    if (!(effectivePlan === "growth" || effectivePlan === "scale" || effectivePlan === "enterprise")) {
      throw new Error("CSV export is available on Growth and Pro plans.");
    }
    const planLimitDays = PLAN_HISTORY_DAYS[effectivePlan] ?? null;
    let days = rangeToDays(data.range);
    if (planLimitDays !== null) {
      days = days === null ? planLimitDays : Math.min(days, planLimitDays);
    }
    const since = days === null ? new Date(0) : new Date(Date.now() - days * 86400_000);
    const { data: rows } = await supabase
      .from("try_on_events")
      .select("created_at, wig_id, user_id, anonymous_session, device, source, country")
      .eq("retailer_id", retailerId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000);

    const header = ["created_at", "wig_id", "user_id", "anonymous_session", "device", "source", "country"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      header.join(","),
      ...(rows ?? []).map((r) => header.map((k) => escape((r as any)[k])).join(",")),
    ].join("\n");
    return { csv, filename: `wigsmi-analytics-${data.range}.csv` };
  });
