# Build progress

## ✅ Slice 1 — Marketing/static frontend (done)
## ✅ Slice 2 — Backend foundation (done)
## ✅ Slice 3 — Consumer auth + protected `/app/*` (done)

## ✅ Slice 4 — Retailer portal core (done)

Added:
- Public retailer auth: `/retailer/login`, `/retailer/signup` (sets `role=retailer` in metadata; trigger gives them a `retailer` row in `user_roles`).
- Protected portal layout at `/portal` (sidebar shell, gated by `supabase.auth.getUser()` in `beforeLoad`).
- 5-step onboarding wizard at `/portal/onboarding` writing to `retailers`; auto-redirects if onboarding incomplete.
- Dashboard at `/portal` showing wigs count, published count, 30d try-ons, 30d clicks; trial countdown banner.
- Catalog list at `/portal/catalog` and editor at `/portal/catalog/$wigId` (use `wigId=new` for create); image upload to `wig-images` bucket, color tags, publish/in-stock/featured toggles, delete.
- Settings at `/portal/settings` for business profile + branding.
- Server functions in `src/lib/retailer.functions.ts`: `getMyRetailerContext`, `saveRetailerOnboarding`, `updateRetailer`, `listMyWigs`, `getMyWig`, `saveMyWig`, `deleteMyWig`, `getRetailerMetrics` — all guarded by `requireSupabaseAuth`, all RLS-respecting.
- Updated `/auth/callback` to honor `?next=` so retailers return to `/portal`.

## Slice 5 — Payments (next)

Stripe Checkout for both consumer (`Plus`, `Pro`) and retailer (`Starter`, `Growth`, `Pro`) plans. Webhook syncs `subscriptions` and `retailers.plan`. Self-serve billing portal. Plan-gated quotas (consumer try-ons, retailer wig cap).

## Slice 6 — Widget + analytics
JS embed snippet, `/embed/$token` iframe, retailer analytics dashboard, public widget try-on flow recording attributed `try_on_events`/`wig_clicks`.

## Slice 7 — Admin + emails + AR placeholder polish
Admin portal (impersonate, moderate retailers/wigs), transactional emails (welcome, reset, trial expiry), refine AR placeholder.
