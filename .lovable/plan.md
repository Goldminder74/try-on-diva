## What this does

Closes the biggest correctness + UX gaps left in the subscription system after adding monthly/yearly. Focused on things that are either broken-but-invisible or things every paying user expects to see.

## Scope

### 1. Persist `billing_interval` on subscriptions (correctness)
The `subscriptions` table has a `billing_interval` column but the webhook never fills it. Result: the app can't tell monthly from yearly anywhere. Fix:
- Webhook reads `items[0].price.billingCycle.interval` on `subscription.created` / `subscription.updated` and writes `"month"` or `"year"` into `billing_interval`.
- Backfill existing rows from `price_id` suffix (`_monthly` / `_yearly`).
- Surface it: `/portal/billing` and `/pricing` "Current plan" badge shows e.g. "Plus · Yearly".

### 2. In-app invoice history
Add an "Invoices" section to `/portal/billing` listing the user's last ~12 transactions: date, amount, status, and a "Download PDF" link. Powered by `GET /transactions?customer_id=…&per_page=12` via a new server function. Read-only; cancel/update payment still go through the Paddle portal.

### 3. In-app cancel (consumer)
On `/pricing` when the user is on Plus/Pro, add a "Cancel subscription" link that opens a confirmation dialog and calls `POST /subscriptions/{id}/cancel` with `effective_from: "next_billing_period"`. Webhook already handles `subscription.canceled` and the existing grace-period logic keeps access until `current_period_end`. Avoids forcing users to the Paddle portal just to cancel.

### 4. Proration preview when switching plans
Before calling `changeSubscriptionPlan`, call Paddle `POST /subscriptions/{id}/preview` to fetch the immediate charge or credit, then show it in the "Switch to Pro" confirmation dialog ("You'll be charged £4.17 today; next renewal £77.92 on 12 Jun 2027"). Removes the biggest worry users have about hitting the upgrade button.

### 5. Yearly UX polish
- Yearly cards show "Billed £38.92/yr · equiv. £3.24/mo" instead of just the yearly figure.
- Replace "-35%" with "Save £20.96/yr".
- Add "VAT included where applicable" footnote under the pricing grid (Paddle is merchant of record).

### 6. Retailer trial-end reminder
Daily cron (via Supabase scheduled function) finds retailers with `trial_ends_at` between now+7d and now+8d that don't have a paid subscription, and sends them a single email via the existing email infra. Stores `trial_reminder_sent_at` on `retailers` to avoid duplicates.

## Out of scope (deferred)

- Annual renewal reminder emails (lower urgency; Paddle sends its own).
- Refund/credit UI (admin tool, not user-facing).
- Pricing-preview localisation (showing prices in user currency) — Paddle handles at checkout.

## Technical notes

**Files touched**
- `src/routes/api/public/payments/webhook.ts` — write `billing_interval`.
- `supabase/migrations/<new>.sql` — backfill `billing_interval`; add `trial_reminder_sent_at` to `retailers`.
- `src/lib/subscription.functions.ts` — add `listInvoices`, `cancelSubscription`, `previewPlanChange`.
- `src/routes/portal.billing.tsx` — invoices table, billing interval badge.
- `src/routes/pricing.tsx` — cancel link + dialog, proration preview dialog, "Billed £X/yr · equiv. £Y/mo" line, "Save £X" badge, VAT footnote.
- New `supabase/functions/retailer-trial-reminders/index.ts` + pg_cron schedule hitting `/api/public/cron/trial-reminders`.

**Risks**
- Paddle preview endpoint requires the Paddle internal subscription ID and price ID — already stored, just needs resolution before the call.
- Backfill assumes `_monthly` / `_yearly` suffix convention; any pre-existing row without that suffix gets `null` (safe, UI falls back).

## Test plan (in preview)

Use card `4242 4242 4242 4242`:
1. Subscribe to Plus monthly → check `subscriptions.billing_interval = 'month'` and `/portal/billing` shows "Plus · Monthly".
2. Switch to Plus yearly → confirmation dialog shows proration; row updates to `'year'`.
3. Click "Cancel subscription" → confirm → row goes to `canceled` with `current_period_end` in future; access retained.
4. Open `/portal/billing` → invoices list shows the two transactions with working PDF links.
5. Manually set a retailer's `trial_ends_at` to now+7d, run the cron, confirm reminder email sent and `trial_reminder_sent_at` set.