# Wigsmi billing & entitlements: fix plan

Based on the audit. Per your answers: one role per user, pg_cron for scheduling, no Google OAuth, no account deletion. Everything else gets fixed.

## 1. Webhook hardening (the highest-risk gap)

The single most likely production outage is the webhook silently skipping rows when Paddle's `importMeta.externalId` isn't on the event payload. Today it logs and returns 200, so the user pays and gets nothing.

- Fallback path: if `externalId` is missing on the event, fetch the price + product from the Paddle API by their internal IDs and read `external_id` from there. Upsert with the resolved values.
- If both are still missing, write the row anyway using the raw Paddle IDs as a placeholder so the user gets gated correctly while we investigate (better than a phantom paid user).
- `handleSubscriptionCanceled` also writes `current_period_end` from the event (no longer depends on `subscription.updated` arriving first).

## 2. Customer-type discipline (B5/B7/B19)

All four billing server functions (`createPortalSession`, `changeSubscriptionPlan`, `previewPlanChange`, `cancelSubscription`, plus `listInvoices`) gain a required `customerType: "consumer" | "retailer"` input and filter on it. Every call site passes it explicitly — `/pricing` always passes `"consumer"`, `/portal/billing` always passes `"retailer"`.

- `useSubscription` gets an optional `customerType` (already supported) and is passed through everywhere it's used (`PastDueBanner`, `checkout.success`, banners).
- `checkout.success` reads `?type=consumer|retailer` from the success URL (we already control it) instead of guessing from the row, so the redirect can't pick the wrong subscription.
- `PastDueBanner` becomes context-aware: consumer copy on `_authenticated`, retailer copy + portal added on `/portal`.

## 3. Role-gated routes (B16)

Since one user is consumer XOR retailer:

- `_authenticated/*` redirects retailers (with no consumer profile activity) to `/portal`.
- `/portal/*` redirects users without the `retailer` role to `/retailer/signup`.
- Auth callback respects role for the post-login destination instead of always defaulting to `/app`.
- Reset-password flow checks role and routes to `/portal` for retailers, `/app` for consumers (B12).

## 4. Entitlement bug fixes

- `recordTryOn`: switch the `consumer_profiles` write from `.update()` to `.upsert(..., { onConflict: "user_id" })` so the counter is never silently dropped (B3 defense-in-depth, since the auth trigger normally creates the row but I don't want this to be the only line of defense).
- `getTryOnQuota`: add `customer_type=consumer` and `environment` filters (B9).
- `RetailerPlanCards`: fix the always-false busy condition so the spinner shows while Paddle overlay loads (B11).
- Drop the `stripe_customer_id` / `stripe_subscription_id` dead columns from `subscriptions` (B22).

## 5. Missing email template (B2)

Create `consumer-payment-failed` template + register it. Mirrors the retailer one in tone.

## 6. Widget API quota enforcement (B14)

Per advertised plan: track widget public-API calls per month per retailer in a new lightweight `widget_usage` table (or column on `widget_embeds`). `getPublicWidgetData` rejects with a 429 when the cap is exceeded. Caps: starter = 5k impressions/month, growth = 50k, scale = unlimited.

## 7. Cron jobs via pg_cron (B15)

Two scheduled jobs against the stable production URL using the documented `apikey` header pattern (no new secret needed — uses the publishable key, which is fine for `/api/public/*` endpoints):

- `trials-tick` — every day at 09:00 UTC.
- `quota-reset` — 1st of every month at 00:05 UTC.

## 8. Retailer auth polish (B18, B20)

- Retailer signup confirmation email destination preserves `?plan=&interval=` in the callback `next` param (it already does via the form, but the fallback path is fragile when sessionStorage clears — make `next` the source of truth).
- `RetailerAuthForm` adds a "Forgot password?" link.

## 9. Better `checkout.success` fallback (B21)

After 15 s with no webhook, show "Still processing — we'll email you when it's live. Take me to my account →" instead of silently navigating.

## What's intentionally NOT in this pass (per your answers)

- Google OAuth (B17)
- Account deletion (B13)

---

# Technical details

- **Webhook**: `src/routes/api/public/payments/webhook.ts`. New helper `resolveExternalIds(paddle, item, env)` that fetches `/products/{id}` and `/prices/{id}` when `importMeta.externalId` is missing.
- **Server fns**: `src/lib/subscription.functions.ts` — add `customerType` to the Zod schema, add `.eq("customer_type", data.customerType)` on the subscription lookup.
- **DB migration**:
  - `ALTER TABLE subscriptions DROP COLUMN stripe_customer_id, DROP COLUMN stripe_subscription_id;`
  - `ALTER TABLE retailers ADD COLUMN widget_calls_this_month integer NOT NULL DEFAULT 0, ADD COLUMN widget_calls_month_reset date NOT NULL DEFAULT (date_trunc('month', now()))::date;`
  - Two `cron.schedule(...)` calls inside the migration (idempotent via `cron.unschedule` first).
- **Frontend touchpoints**: `pricing.tsx`, `portal.billing.tsx`, `checkout.success.tsx`, `_authenticated.tsx`, `portal.tsx`, `auth.reset-password.tsx`, `auth.callback.tsx`, `RetailerAuthForm.tsx`, `RetailerPlanCards.tsx`, `PastDueBanner.tsx`, `useSubscription.ts`.
- **Email template**: `src/lib/email-templates/consumer-payment-failed.tsx` + entry in `registry.ts`.

---

# How to test in preview after the fixes ship

Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any name, any postcode. The preview runs the **sandbox** Paddle token, so nothing real is charged.

Run through these flows in `id-preview--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app`:

1. **Consumer happy path**: sign up at `/auth/signup` → `/pricing` → "Choose Plus" → checkout → land on `/checkout/success` → auto-redirect to `/app`. Confirm `useSubscription` shows Plus active and `/app/subscription` shows quota = "Unlimited".
2. **Consumer plan switch**: still signed in, go back to `/pricing`, click "Switch to Pro" → confirm the prorated preview shows a non-zero charge → confirm → `/pricing` updates to "Pro · Monthly" within ~5 s (realtime).
3. **Consumer cancel + grace period**: click "Cancel" on `/pricing` → confirm → row shows "canceled" but `isActive` stays true until `current_period_end`.
4. **Retailer happy path**: sign up at `/retailer/signup?plan=starter&interval=monthly` → confirm email → land back at `/portal/billing` with checkout auto-opening → pay with test card → `/portal` no longer shows the paywall, wigs republish.
5. **Retailer dunning**: use test card `4000 0027 6000 3184`, subscribe, then in the Paddle dashboard fast-forward `next_billed_at` 31 minutes ahead with `prorationBillingMode: do_not_bill` → renewal fails → `past_due` banner appears in portal → `consumer-payment-failed` / `retailer-payment-failed` email queued (check Logs).
6. **Trial expiry**: in the DB, set a retailer's `trial_ends_at` to yesterday. Trigger the cron manually with `curl -X POST https://project--1afe14c8-cf3c-462b-9216-e596233413f8-dev.lovable.app/api/public/hooks/trials-tick -H "apikey: $SUPABASE_PUBLISHABLE_KEY"`. Verify the retailer is paywalled and the trial-ended email is sent.
7. **Quota reset**: similar manual curl against `/api/public/hooks/quota-reset` after seeding a stale `try_on_month_reset`.
8. **Role guard**: sign in as a consumer, try to navigate to `/portal` → redirected to `/retailer/signup`. Sign in as a retailer, try `/app` → redirected to `/portal`.

I'll batch the migration first (DB changes need approval before the types regenerate), then ship all code edits in parallel.
