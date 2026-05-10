# Wigsmi — Remaining Build Roadmap

Phase 1 (design system, public B2C marketing surfaces, `WigTryOnEngine` placeholder) is done. Below is the order I recommend for the remaining work and why. Each slice is one chat turn's worth of focused build.

## Recommended order

```text
Slice 2 → Backend foundation (Cloud + schema + RLS + seed)
Slice 3 → Consumer auth + protected /app/* + quota enforcement
Slice 4 → Retailer auth + onboarding + dashboard + catalog mgmt
Slice 5 → Stripe (both sides) + subscription pages + webhook
Slice 6 → Retailer widget + analytics + API keys + admin portal
Slice 7 → Email (Resend) + polish + seed data + a11y pass
```

## Why this order

- **Backend before auth.** Consumer screens already exist statically. Once the schema and RLS exist, auth and protected pages snap in cleanly.
- **Auth before payments.** Stripe checkout needs a real `profile_id` to attach the subscription.
- **Two auth flows before payments.** Both consumer and retailer subscriptions reuse one Stripe webhook function — better to build it once against both.
- **Widget + analytics + admin last.** They depend on real retailer + try-on event data flowing through the system.
- **Emails at the end.** They're triggered by events (signup, subscription, trial ending) that only exist after the prior slices.

## Slice details

### Slice 2 — Backend foundation
- Enable Lovable Cloud.
- Tables: `profiles` (role: consumer / retailer / admin), `consumer_profiles`, `retailers`, `wigs`, `wishlist_items`, `try_on_events`, `wig_clicks`, `subscriptions`, `widget_embeds`, `analytics_events`, `api_keys`.
- Storage buckets: `wig-images` (public), `user-photos` (private, user-scoped).
- RLS on every table. `has_role()` security-definer helper.
- Seed: 1 admin, 2 demo retailers, 20 wigs, 5 featured. Swap the static `WIGS` array for live queries on existing public routes.

### Slice 3 — Consumer auth + protected app
- Email/password + Google OAuth. Email verification gate.
- Routes: `/auth/signup`, `/auth/login`, `/auth/verify`, `/auth/reset`.
- `_authenticated/app` layout with route guard.
- Screens: `/app` (For You feed), `/app/try-on`, `/app/catalog`, `/app/wishlist`, `/app/style-quiz` (5 steps), `/app/profile`.
- Anonymous try-on counter (localStorage, 3 attempts) + free-tier monthly quota (5 try-ons) enforced server-side. Monthly reset via pg_cron.
- `AuthContext` + `CartContext` (wishlist).

### Slice 4 — Retailer portal core
- Retailer signup/login (email only, no Google). Email verification.
- 5-step onboarding flow with `onboarding_completed` flag.
- `_authenticated/retailer` layout with dark sidebar nav.
- Screens: `/retailer/dashboard` (stats + chart), `/retailer/catalog` (list), `/retailer/catalog/add`, `/retailer/catalog/:id/edit`, `/retailer/settings`.
- Multi-image upload to `wig-images` bucket. Plan-limit enforcement on wig count.

### Slice 5 — Stripe + subscriptions (both sides)
- One Stripe Edge Function handling all six webhook events for both audiences.
- Stripe Checkout in redirect mode, `profile_id` in metadata.
- Consumer: `/app/subscription` + `/pricing` upgrade flow. Plans: Free / Plus / Pro, monthly + annual.
- Retailer: `/retailer/subscription` + retailer pricing. Plans: Starter / Growth / Pro / Enterprise with 90-day trial (`trial_ends_at`).
- Trial-end enforcement: portal becomes read-only, widget returns 402.
- Billing history table from Stripe API.

### Slice 6 — Widget, analytics, API keys, admin
- `/retailer/widget` embed-code generator (3 widget types, domain allowlist, live preview).
- Public server route `/api/public/widget/:token` that validates `Origin` against `allowed_domains`.
- `/retailer/analytics` (Recharts: line, donut, top-wigs table, CSV export). Plan-gated history window.
- `/retailer/api-keys` with reveal/regenerate flow.
- Admin: `/admin`, `/admin/retailers`, `/admin/consumers`, `/admin/catalog`, `/admin/featured` (drag-to-reorder), `/admin/analytics`.

### Slice 7 — Emails + polish
- Resend via Edge Functions. All 9 transactional emails branded.
- Weekly retailer analytics cron.
- Skeleton loaders, empty states, toast standardisation, mobile bottom nav for `/app/*`, currency/date i18n utility, full a11y sweep (keyboard, contrast, alt text), error boundaries on every loader route.
- Final seed data refresh with realistic copy.

## Total scope

6 chat turns to ship the whole thing properly, assuming no major requirement changes between slices.

## Suggested next move

Approve this plan and I'll start **Slice 2 — Backend foundation** in the next message. Backend touches every later slice, so getting it right unblocks everything.
