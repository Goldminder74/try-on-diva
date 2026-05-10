# Retailer Analytics Dashboard

Add `/portal/analytics` so Growth/Pro retailers (and Starter, with 30-day cap) can see how the widget is performing. All data already exists in `try_on_events`, `wig_clicks`, and `analytics_events`.

## Scope

A single new authenticated route under the existing portal shell, plus one server-function module that aggregates events. No schema changes.

## Plan-gated history window

| Plan       | History window |
|------------|----------------|
| Starter    | 30 days        |
| Growth     | 90 days        |
| Pro        | Unlimited      |
| Enterprise | Unlimited      |

Range selector is clamped to the retailer's plan; locked ranges show an upgrade hint linking to `/portal/billing`.

## Page layout (Rams/Ive: quiet, generous whitespace, mono labels, one accent)

1. **Header** — "Analytics", date-range selector (7d / 30d / 90d / All), CSV export button (Growth+).
2. **KPI row** (4 cards): Try-ons, Unique visitors, Wig clicks, Click-through rate. Each shows value + delta vs previous period.
3. **Try-ons over time** — line/area chart, daily buckets, using `recharts` (already in shadcn `chart.tsx`).
4. **Top wigs table** — top 10 by try-ons with thumbnail, name, try-ons, clicks, CTR.
5. **Breakdown row** (2 cards side-by-side):
   - Device: mobile / desktop / tablet (from `try_on_events.device`)
   - Source: anonymous vs signed-in vs embed (from `try_on_events.source`)
6. **Geography** — country list with counts (from `try_on_events.country`). Pro only; Starter/Growth see a locked card.
7. **Empty state** — when no events yet, show a friendly "Paste your widget snippet to start collecting data" card linking to `/portal/widget`.

## Technical

**New files**
- `src/lib/analytics.functions.ts` — `getRetailerAnalytics({ range })` server function, middleware `requireSupabaseAuth`. Loads retailer for the user, runs aggregation queries scoped to `retailer_id`, returns `{ kpis, timeseries, topWigs, deviceBreakdown, sourceBreakdown, geography, planLimitDays }`.
- `src/lib/analytics-export.functions.ts` — `exportRetailerAnalyticsCsv({ range })` returns CSV string for download (Growth+ only; returns 403-style error for Starter).
- `src/routes/portal.analytics.tsx` — route component. Uses `useQuery` + `useServerFn`. Includes range selector, KPI cards, chart, tables.
- `src/components/portal/AnalyticsKpiCard.tsx`, `AnalyticsChart.tsx`, `TopWigsTable.tsx` — presentational pieces.

**Aggregation approach**
Plain Supabase `.select()` calls scoped by `retailer_id` (RLS already restricts to the retailer owner). Bucketing done in JS over result rows; volumes are low enough for that to be fine. Unique visitor = distinct `user_id ?? anonymous_session`.

**Sidebar**
Add an "Analytics" item to the portal nav in `src/routes/portal.tsx`.

**Empty/error states**
- Loading: skeletons matching final layout.
- Error: inline retry banner.
- No data: empty illustration + CTA to widget setup.

## Out of scope
- Trial-end emails, admin tooling, real widget loader JS, quota cron — separate tasks.
- No schema changes; no new event types.

## Acceptance
- A retailer with events sees populated KPIs, chart, top wigs, breakdowns.
- A Starter retailer cannot select 90d/All ranges and sees locked Geography.
- A Growth retailer can export CSV; Starter cannot.
- Empty state renders when no events exist and links to `/portal/widget`.
- All queries respect RLS (no cross-retailer leakage).
